using WorkflowEngine.Api.Extensions;
using WorkflowEngine.Models;

namespace WorkflowEngine.Api;

internal partial class Engine
{
    public async Task<EngineResponse> EnqueueWorkflow(
        EngineRequest engineRequest,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Telemetry.Source.StartActivity(
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

        if (!engineRequest.IsValid())
        {
            activity?.Errored(errorMessage: "Invalid request");
            return EngineResponse.Rejected($"Invalid request: {engineRequest}");
        }

        if (HasDuplicateWorkflow(engineRequest.IdempotencyKey))
        {
            activity?.Errored(errorMessage: "Duplicate workflow request");
            return EngineResponse.Rejected(
                "Duplicate request. A job with the same identifier is already being processed"
            );
        }

        // TODO: We need to implement support for concurrency!
        if (HasQueuedWorkflowForInstance(engineRequest.InstanceInformation))
        {
            activity?.Errored(errorMessage: "Instance already has an active job. Concurrency not supported");
            return EngineResponse.Rejected(
                "A job for this instance is already processing. Concurrency is currently not supported"
            );
        }

        if (_mainLoopTask is null)
        {
            activity?.Errored(errorMessage: "Workflow engine not started");
            return EngineResponse.Rejected("Workflow engine is not running. Did you call Start()?");
        }

        // TODO: We probably don't need these `ShouldRun` checks now that we are running standalone.
        var enabled = await _isEnabledHistory.Latest() ?? await ShouldRun(cancellationToken);
        if (!enabled)
        {
            activity?.Errored(errorMessage: "Workflow engine inactive (disabled)");
            return EngineResponse.Rejected("Workflow engine is currently inactive. Did you call the right instance?");
        }

        await AcquireQueueSlot(cancellationToken);
        _inbox[engineRequest.IdempotencyKey] = await _repository.AddWorkflow(engineRequest, cancellationToken);

        Telemetry.WorkflowRequestsAccepted.Add(1);
        Telemetry.StepRequestsAccepted.Add(engineRequest.Steps.Count());

        return EngineResponse.Accepted();
    }

    public bool HasDuplicateWorkflow(string jobIdentifier)
    {
        bool isDupe = _inbox.ContainsKey(jobIdentifier);

        using var activity = Telemetry.Source.StartActivity(
            "Engine.HasDuplicateWorkflow",
            tags: [("workflow.isDuplicate", isDupe)]
        );

        return isDupe;
    }

    public bool HasQueuedWorkflowForInstance(InstanceInformation instanceInformation)
    {
        var instanceHasActiveWorkflow = _inbox.Values.Any(x => x.InstanceInformation.Equals(instanceInformation));

        using var activity = Telemetry.Source.StartActivity(
            "Engine.HasQueuedWorkflowForInstance",
            tags: [("instance.hasActiveWorkflow", instanceHasActiveWorkflow)]
        );

        return instanceHasActiveWorkflow;
    }

    public Workflow? GetWorkflowForInstance(InstanceInformation instanceInformation)
    {
        using var activity = Telemetry.Source.StartActivity("Engine.GetWorkflowForInstance");

        return _inbox.Values.FirstOrDefault(x => x.InstanceInformation.Equals(instanceInformation));
    }

    private async Task PopulateWorkflowsFromDb(CancellationToken cancellationToken)
    {
        using var activity = Telemetry.Source.StartActivity("Engine.PopulateWorkflowsFromDb");

        // TODO: Disabled for now. We don't necessarily want to resume jobs after restart while testing.
        return;

        IReadOnlyList<Workflow> incompleteJobs = await _repository.GetActiveWorkflows(cancellationToken);

        foreach (var job in incompleteJobs)
        {
            // TODO: Not sure about this logic...
            // Only add if not already in memory to avoid duplicates
            if (_inbox.TryAdd(job.IdempotencyKey, job))
                _logger.RestoredWorkflowFromDb(job.IdempotencyKey);
        }
    }

    private Task UpdateWorkflowInDb(Workflow workflow, CancellationToken cancellationToken)
    {
        using var activity = Telemetry.Source.StartActivity(
            "Engine.UpdateWorkflowInDb",
            tags: [("workflow.status", workflow.Status.ToString())]
        );

        return _repository.UpdateWorkflow(workflow, cancellationToken);
    }

    private Task UpdateStepInDb(Step step, CancellationToken cancellationToken)
    {
        using var activity = Telemetry.Source.StartActivity(
            "Engine.UpdateStepInDb",
            tags: [("step.status", step.Status.ToString())]
        );

        if (step.RequeueCount > 0)
            activity?.SetTag("step.requeueCount", step.RequeueCount);

        if (step.BackoffUntil.HasValue)
            activity?.SetTag("step.backoffUntil", step.BackoffUntil.Value.ToString("o"));

        return _repository.UpdateStep(step: step, cancellationToken);
    }
}
