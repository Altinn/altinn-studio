using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Api;

internal partial class Engine
{
    public async Task<EngineResponse> EnqueueWorkflow(
        EngineRequest engineRequest,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity(
            "Engine.EnqueueWorkflow",
            tags:
            [
                ("request.operation.id", engineRequest.OperationId),
                ("request.idempotency.key", engineRequest.IdempotencyKey),
                ("request.actor.id", engineRequest.Actor.UserIdOrOrgNumber),
                ("request.instance.guid", engineRequest.InstanceInformation.InstanceGuid),
                ("request.instance.party.id", engineRequest.InstanceInformation.InstanceOwnerPartyId),
                (
                    "request.instance.app",
                    $"{engineRequest.InstanceInformation.Org}/{engineRequest.InstanceInformation.App}"
                ),
            ]
        );

        _logger.EnqueuingWorkflow(engineRequest);

        if (!CanAcceptNewWork)
        {
            activity?.Errored(errorMessage: "At capacity");
            return EngineResponse.Reject(EngineResponse.Rejection.AtCapacity);
        }

        if (!engineRequest.IsValid())
        {
            activity?.Errored(errorMessage: "Invalid request");
            return EngineResponse.Reject(EngineResponse.Rejection.Invalid, $"Invalid request: {engineRequest}");
        }

        if (HasDuplicateWorkflow(engineRequest.IdempotencyKey))
        {
            activity?.Errored(errorMessage: "Duplicate workflow request");
            return EngineResponse.Reject(
                EngineResponse.Rejection.Duplicate,
                "Duplicate request. A job with the same identifier is already being processed"
            );
        }

        // TODO: We need to implement support for concurrency!
        if (HasQueuedWorkflowForInstance(engineRequest.InstanceInformation))
        {
            activity?.Errored(errorMessage: "Instance already has an active job. Concurrency not supported");
            return EngineResponse.Reject(
                EngineResponse.Rejection.Duplicate,
                "A job for this instance is already processing. Concurrency is currently not supported"
            );
        }

        if (_mainLoopTask is null)
        {
            activity?.Errored(errorMessage: "Workflow engine not started");
            return EngineResponse.Reject(
                EngineResponse.Rejection.Unavailable,
                "Workflow engine is not running. Did you call Start()?"
            );
        }

        // TODO: We probably don't need these `ShouldRun` checks now that we are running standalone.
        var enabled = await _isEnabledHistory.Latest() ?? await ShouldRun(cancellationToken);
        if (!enabled)
        {
            activity?.Errored(errorMessage: "Workflow engine inactive (disabled)");
            return EngineResponse.Reject(
                EngineResponse.Rejection.Unavailable,
                "Workflow engine is currently inactive. Did you call the right instance?"
            );
        }

        await AcquireQueueSlot(cancellationToken);
        using (var scope = _serviceProvider.CreateScope())
        {
            var repository = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
            var workflow = await repository.AddWorkflow(engineRequest, cancellationToken: cancellationToken);
            _inbox[engineRequest.IdempotencyKey] = workflow;
        }
        _newWorkSignal.TrySetResult();

        Metrics.WorkflowRequestsAccepted.Add(1);
        Metrics.StepRequestsAccepted.Add(engineRequest.Steps.Count());

        return EngineResponse.Accept();
    }

    public async Task<EngineResponse> RetryWorkflow(
        string idempotencyKey,
        DateTimeOffset createdAt,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity(
            "Engine.RetryWorkflow",
            tags: [("request.idempotency.key", idempotencyKey)]
        );

        if (!CanAcceptNewWork)
        {
            activity?.Errored(errorMessage: "At capacity");
            return EngineResponse.Reject(EngineResponse.Rejection.AtCapacity);
        }

        if (_mainLoopTask is null)
        {
            activity?.Errored(errorMessage: "Workflow engine not started");
            return EngineResponse.Reject(EngineResponse.Rejection.Unavailable, "Workflow engine is not running");
        }

        if (HasDuplicateWorkflow(idempotencyKey))
        {
            activity?.Errored(errorMessage: "Workflow already in inbox");
            return EngineResponse.Reject(EngineResponse.Rejection.Duplicate, "Workflow is already in the inbox");
        }

        Workflow? workflow;
        using (var scope = _serviceProvider.CreateScope())
        {
            var repository = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
            workflow = await repository.GetWorkflow(idempotencyKey, createdAt, cancellationToken);
        }

        if (workflow is null)
        {
            activity?.Errored(errorMessage: "Workflow not found");
            return EngineResponse.Reject(EngineResponse.Rejection.NotFound, "Workflow not found");
        }

        if (workflow.Status != PersistentItemStatus.Failed)
        {
            activity?.Errored(errorMessage: $"Workflow status is {workflow.Status}, expected Failed");
            return EngineResponse.Reject(
                EngineResponse.Rejection.Invalid,
                $"Workflow status is {workflow.Status}, expected Failed"
            );
        }

        if (HasQueuedWorkflowForInstance(workflow.InstanceInformation))
        {
            activity?.Errored(errorMessage: "Instance already has an active workflow");
            return EngineResponse.Reject(
                EngineResponse.Rejection.Duplicate,
                "Another workflow for this instance is already processing"
            );
        }

        // Reset all incomplete steps to Enqueued
        var stepsToReset = new List<Step>();
        foreach (Step step in workflow.Steps)
        {
            if (step.Status == PersistentItemStatus.Completed)
                continue;

            step.Status = PersistentItemStatus.Enqueued;
            step.BackoffUntil = null;
            step.LastError = null;
            step.RequeueCount = 0;
            step.HasPendingChanges = true;
            stepsToReset.Add(step);
        }

        workflow.Status = PersistentItemStatus.Enqueued;
        workflow.ExecutionStartedAt = null;

        using (var scope = _serviceProvider.CreateScope())
        {
            var repository = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
            await repository.BatchUpdateWorkflowAndSteps(
                workflow,
                stepsToReset,
                updateWorkflowTimestamp: true,
                updateStepTimestamps: true,
                cancellationToken: cancellationToken
            );
        }

        await AcquireQueueSlot(cancellationToken);
        _inbox[idempotencyKey] = workflow;
        _recentWorkflows.Remove(idempotencyKey, workflow.CreatedAt);
        _newWorkSignal.TrySetResult();

        Metrics.WorkflowRequestsAccepted.Add(1);

        return EngineResponse.Accept();
    }

    public bool SkipBackoff(string workflowIdempotencyKey, string stepIdempotencyKey)
    {
        if (!_inbox.TryGetValue(workflowIdempotencyKey, out Workflow? workflow))
            return false;

        Step? step = workflow.Steps.FirstOrDefault(s => s.IdempotencyKey == stepIdempotencyKey);
        if (step is null || step.Status != PersistentItemStatus.Requeued || step.BackoffUntil is null)
            return false;

        step.BackoffUntil = null;
        _newWorkSignal.TrySetResult();
        return true;
    }

    public bool HasDuplicateWorkflow(string jobIdentifier)
    {
        bool isDupe = _inbox.ContainsKey(jobIdentifier);

        using var activity = Metrics.Source.StartActivity(
            "Engine.HasDuplicateWorkflow",
            tags: [("workflow.isDuplicate", isDupe)]
        );

        return isDupe;
    }

    public bool HasQueuedWorkflowForInstance(InstanceInformation instanceInformation)
    {
        var instanceHasActiveWorkflow = _inbox.Values.Any(w => w.InstanceInformation == instanceInformation);

        using var activity = Metrics.Source.StartActivity(
            "Engine.HasQueuedWorkflowForInstance",
            tags: [("instance.hasActiveWorkflow", instanceHasActiveWorkflow)]
        );

        return instanceHasActiveWorkflow;
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
            if (_inbox.TryAdd(job.IdempotencyKey, job))
            {
                _logger.RestoredWorkflowFromDb(job.IdempotencyKey);
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
