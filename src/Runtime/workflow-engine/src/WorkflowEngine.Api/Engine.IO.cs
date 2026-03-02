using WorkflowEngine.Api.Utils;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Api;

internal partial class Engine
{
    public async Task<WorkflowEnqueueResponse> EnqueueWorkflow(
        WorkflowEnqueueRequest request,
        WorkflowRequestMetadata metadata,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity(
            "Engine.EnqueueBatch",
            tags:
            [
                ("request.actor.id", request.Actor.UserIdOrOrgNumber),
                ("request.workflows.count", request.Workflows.Count),
                ("request.instance.guid", metadata.InstanceInformation.InstanceGuid),
                ("request.instance.party.id", metadata.InstanceInformation.InstanceOwnerPartyId),
                ("request.instance.app", $"{metadata.InstanceInformation.Org}/{metadata.InstanceInformation.App}"),
            ]
        );

        _logger.EnqueuingWorkflowBatch(request.Workflows.Count, metadata.InstanceInformation);

        // Early capacity check before potentially expensive operations
        if (!CanAcceptNewWork)
        {
            activity?.Errored(errorMessage: "At capacity");
            return WorkflowEnqueueResponse.Reject(WorkflowEnqueueResponse.Rejection.AtCapacity);
        }

        // Validate the dependency graph and get topologically sorted requests
        IReadOnlyList<WorkflowRequest> sortedRequests;
        try
        {
            sortedRequests = ValidationUtils.ValidateAndSortWorkflowGraph(request.Workflows);
        }
        catch (ArgumentException ex)
        {
            activity?.Errored(ex);
            return WorkflowEnqueueResponse.Reject(
                WorkflowEnqueueResponse.Rejection.Invalid,
                $"Invalid request. Workflow graph did not validate: {ex.Message}"
            );
        }

        // Do we have capacity for this batch?
        if (_inboxCapacityLimit.CurrentCount < sortedRequests.Count)
        {
            activity?.Errored(errorMessage: "At capacity");
            throw new EngineAtCapacityException(
                $"Not enough capacity to enqueue {sortedRequests.Count} workflows. Available: {_inboxCapacityLimit.CurrentCount}"
            );
        }

        await AcquireQueueSlots(sortedRequests.Count, cancellationToken);

        using var scope = _serviceProvider.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IEngineRepository>();

        IReadOnlyList<Workflow> workflows;
        try
        {
            workflows = await repository.AddWorkflowBatch(sortedRequests, metadata, cancellationToken);
        }
        catch (EngineWorkflowConcurrencyException ex)
        {
            ReleaseQueueSlots(sortedRequests.Count);
            activity?.Errored(ex);
            return WorkflowEnqueueResponse.Reject(WorkflowEnqueueResponse.Rejection.ConcurrencyViolation, ex.Message);
        }
        catch (Exception ex)
        {
            ReleaseQueueSlots(sortedRequests.Count);

            activity?.Errored(ex);
            return WorkflowEnqueueResponse.Reject(WorkflowEnqueueResponse.Rejection.Invalid, ex.Message);
        }

        // Add all to inbox and signal once
        foreach (var workflow in workflows)
            _inbox[workflow.DatabaseId] = workflow;

        _newWorkSignal.TrySetResult();

        Metrics.WorkflowRequestsAccepted.Add(sortedRequests.Count);
        Metrics.StepRequestsAccepted.Add(workflows.Sum(w => w.Steps.Count));

        // Build ordered list of results
        var results = sortedRequests
            .Zip(
                workflows,
                (req, wf) => new WorkflowEnqueueResponse.WorkflowResult { Ref = req.Ref, DatabaseId = wf.DatabaseId }
            )
            .ToList();

        return WorkflowEnqueueResponse.Accept(results);
    }

    public async Task<WorkflowRetryResponse> RetryWorkflow(
        string idempotencyKey,
        DateTimeOffset createdAt,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity(
            "Engine.RetryWorkflow",
            tags: [("request.idempotencyKey", idempotencyKey)]
        );

        // Check if already in inbox
        if (_inbox.Values.Any(w => w.IdempotencyKey == idempotencyKey))
        {
            activity?.Errored(errorMessage: "Duplicate — already in inbox");
            return WorkflowRetryResponse.Reject(
                WorkflowRetryResponse.Rejection.Duplicate,
                "Workflow is already in the inbox"
            );
        }

        // Capacity check
        if (!CanAcceptNewWork)
        {
            activity?.Errored(errorMessage: "At capacity");
            return WorkflowRetryResponse.Reject(WorkflowRetryResponse.Rejection.AtCapacity);
        }

        // Load from DB
        using var scope = _serviceProvider.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
        Workflow? workflow = await repository.GetWorkflow(idempotencyKey, createdAt, cancellationToken);

        if (workflow is null)
        {
            activity?.Errored(errorMessage: "Not found");
            return WorkflowRetryResponse.Reject(WorkflowRetryResponse.Rejection.NotFound, "Workflow not found");
        }

        // Must be Failed to retry
        if (workflow.Status != PersistentItemStatus.Failed)
        {
            activity?.Errored(errorMessage: $"Invalid status: {workflow.Status}");
            return WorkflowRetryResponse.Reject(
                WorkflowRetryResponse.Rejection.Invalid,
                $"Cannot retry a workflow with status {workflow.Status}. Only Failed workflows can be retried."
            );
        }

        // Check no active workflow for same instance
        Workflow? existingForInstance = _inbox.Values.FirstOrDefault(w =>
            w.InstanceInformation == workflow.InstanceInformation
        );
        if (existingForInstance is not null)
        {
            activity?.Errored(errorMessage: "Active workflow exists for instance");
            return WorkflowRetryResponse.Reject(
                WorkflowRetryResponse.Rejection.Duplicate,
                "An active workflow already exists for this instance"
            );
        }

        // Reset incomplete steps
        workflow.Status = PersistentItemStatus.Enqueued;
        workflow.ExecutionStartedAt = null;
        foreach (Step step in workflow.Steps)
        {
            if (step.Status != PersistentItemStatus.Completed)
            {
                step.Status = PersistentItemStatus.Enqueued;
                step.BackoffUntil = null;
                step.RequeueCount = 0;
            }
            step.HasPendingChanges = true;
        }

        // Persist the reset
        await repository.BatchUpdateWorkflowAndSteps(
            workflow,
            workflow.Steps.ToList(),
            updateWorkflowTimestamp: true,
            updateStepTimestamps: true,
            cancellationToken: cancellationToken
        );

        // Acquire slot and add to inbox
        await AcquireQueueSlot(cancellationToken);
        _inbox[workflow.DatabaseId] = workflow;
        _newWorkSignal.TrySetResult();

        // Remove from recent cache
        _recentWorkflows.Remove(idempotencyKey);

        _logger.WorkflowRetried(workflow);
        return WorkflowRetryResponse.Accept();
    }

    public Task<WorkflowRetryResponse> SkipBackoff(
        string idempotencyKey,
        string stepIdempotencyKey,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity(
            "Engine.SkipBackoff",
            tags: [("request.idempotencyKey", idempotencyKey), ("request.stepIdempotencyKey", stepIdempotencyKey)]
        );

        Workflow? workflow = _inbox.Values.FirstOrDefault(w => w.IdempotencyKey == idempotencyKey);
        if (workflow is null)
        {
            activity?.Errored(errorMessage: "Not found in inbox");
            return Task.FromResult<WorkflowRetryResponse>(
                WorkflowRetryResponse.Reject(WorkflowRetryResponse.Rejection.NotFound, "Workflow not found in inbox")
            );
        }

        Step? step = workflow.Steps.FirstOrDefault(s => s.IdempotencyKey == stepIdempotencyKey);
        if (step is null)
        {
            activity?.Errored(errorMessage: "Step not found");
            return Task.FromResult<WorkflowRetryResponse>(
                WorkflowRetryResponse.Reject(WorkflowRetryResponse.Rejection.NotFound, "Step not found")
            );
        }

        if (step.BackoffUntil is null)
        {
            activity?.Errored(errorMessage: "Step is not backing off");
            return Task.FromResult<WorkflowRetryResponse>(
                WorkflowRetryResponse.Reject(
                    WorkflowRetryResponse.Rejection.Invalid,
                    "Step is not currently backing off"
                )
            );
        }

        step.BackoffUntil = null;
        _newWorkSignal.TrySetResult();

        _logger.StepBackoffSkipped(step);
        return Task.FromResult<WorkflowRetryResponse>(WorkflowRetryResponse.Accept());
    }

    public Workflow? GetWorkflowForInstance(InstanceInformation instanceInformation)
    {
        using var activity = Metrics.Source.StartActivity("Engine.GetWorkflowForInstance");

        return _inbox.Values.FirstOrDefault(w => w.InstanceInformation == instanceInformation);
    }

    public IReadOnlyList<Workflow> GetAllInboxWorkflows() => _inbox.Values.ToList();

    // TODO: We probably want a background process to periodically pull from the database, so we can catch scheduled tasks and other things we've been ignoring
    private async Task PopulateWorkflowsFromDb(CancellationToken cancellationToken)
    {
        using var activity = Metrics.Source.StartActivity("Engine.PopulateWorkflowsFromDb");

        // TODO: Disabled for now. We don't necessarily want to resume jobs after restart while testing.
        return;

        using var scope = _serviceProvider.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
        IReadOnlyList<Workflow> incompleteJobs = await repository.GetActiveWorkflows(
            cancellationToken: cancellationToken
        );

        foreach (var job in incompleteJobs)
        {
            // TODO: Not sure about this logic...
            // Only add if not already in memory to avoid duplicates
            if (_inbox.TryAdd(job.DatabaseId, job))
            {
                _logger.RestoredWorkflowFromDb(job.DatabaseId.ToString());
            }
        }
    }

    private async Task UpdateWorkflowInDb(Workflow workflow, CancellationToken cancellationToken)
    {
        using var activity = Metrics.Source.StartActivity(
            "Engine.UpdateWorkflowInDb",
            parentContext: workflow.EngineActivity?.Context,
            tags: [("workflow.status", workflow.Status.ToString())]
        );

        using var scope = _serviceProvider.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
        await repository.UpdateWorkflow(workflow, cancellationToken: cancellationToken);
    }

    private async Task UpdateWorkflowAndStepsInDb(Workflow workflow, CancellationToken cancellationToken)
    {
        using var activity = Metrics.Source.StartActivity(
            "Engine.UpdateWorkflowAndStepsInDb",
            parentContext: workflow.EngineActivity?.Context,
            tags: [("workflow.status", workflow.Status.ToString()), ("workflow.steps.count", workflow.Steps.Count)]
        );

        using var scope = _serviceProvider.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IEngineRepository>();

        await repository.BatchUpdateWorkflowAndSteps(
            workflow,
            workflow.Steps.Where(x => x.HasPendingChanges).ToList(),
            updateWorkflowTimestamp: true,
            updateStepTimestamps: false,
            cancellationToken: cancellationToken
        );
    }

    // Keep for now
#pragma warning disable S1144
    private async Task UpdateStepInDb(Step step, CancellationToken cancellationToken)
#pragma warning restore S1144
    {
        using var activity = Metrics.Source.StartActivity(
            "Engine.UpdateStepInDb",
            parentContext: step.EngineActivity?.Context,
            tags: [("step.status", step.Status.ToString())]
        );

        if (step.RequeueCount > 0)
            activity?.SetTag("step.requeueCount", step.RequeueCount);

        if (step.BackoffUntil.HasValue)
            activity?.SetTag("step.backoffUntil", step.BackoffUntil.Value.ToString("o"));

        using var scope = _serviceProvider.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
        await repository.UpdateStep(step, cancellationToken: cancellationToken);
    }
}
