using WorkflowEngine.Api.Endpoints;
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

        // Build DatabaseId -> Ref map
        var results = sortedRequests
            .Zip(workflows, (req, wf) => (wf.DatabaseId, req.Ref))
            .ToDictionary(t => t.DatabaseId, t => t.Ref);

        return WorkflowEnqueueResponse.Accept(results);
    }

    public Workflow? GetWorkflowForInstance(InstanceInformation instanceInformation)
    {
        using var activity = Metrics.Source.StartActivity("Engine.GetWorkflowForInstance");

        return _inbox.Values.FirstOrDefault(w => w.InstanceInformation == instanceInformation);
    }

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
