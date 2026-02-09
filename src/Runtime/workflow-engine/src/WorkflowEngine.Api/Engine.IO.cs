using WorkflowEngine.Api.Extensions;
using WorkflowEngine.Data.Repository;
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
            var workflow = await repository.AddWorkflow(
                engineRequest,
                bypassConcurrencyLimit: false, // TODO: Remove
                cancellationToken: cancellationToken
            );
            _inbox[engineRequest.IdempotencyKey] = workflow;
            _instanceIndex[workflow.InstanceInformation] = engineRequest.IdempotencyKey;
        }
        _newWorkSignal.TrySetResult();

        Telemetry.WorkflowRequestsAccepted.Add(1);
        Telemetry.StepRequestsAccepted.Add(engineRequest.Steps.Count());

        return EngineResponse.Accept();
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
        var instanceHasActiveWorkflow = _instanceIndex.ContainsKey(instanceInformation);

        using var activity = Telemetry.Source.StartActivity(
            "Engine.HasQueuedWorkflowForInstance",
            tags: [("instance.hasActiveWorkflow", instanceHasActiveWorkflow)]
        );

        return instanceHasActiveWorkflow;
    }

    public Workflow? GetWorkflowForInstance(InstanceInformation instanceInformation)
    {
        using var activity = Telemetry.Source.StartActivity("Engine.GetWorkflowForInstance");

        return _instanceIndex.TryGetValue(instanceInformation, out var idempotencyKey)
            ? _inbox.GetValueOrDefault(idempotencyKey)
            : null;
    }

    // TODO: We probably want a background process to periodically pull from the database, so we can catch scheduled tasks and other things we've been ignoring
    private async Task PopulateWorkflowsFromDb(CancellationToken cancellationToken)
    {
        using var activity = Telemetry.Source.StartActivity("Engine.PopulateWorkflowsFromDb");

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
                _instanceIndex[job.InstanceInformation] = job.IdempotencyKey;
                _logger.RestoredWorkflowFromDb(job.IdempotencyKey);
            }
        }
    }

    private async Task UpdateWorkflowInDb(Workflow workflow, CancellationToken cancellationToken)
    {
        using var activity = Telemetry.Source.StartActivity(
            "Engine.UpdateWorkflowInDb",
            tags: [("workflow.status", workflow.Status.ToString())]
        );

        using var scope = _serviceProvider.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
        await repository.UpdateWorkflow(workflow, cancellationToken: cancellationToken);
    }

    private async Task UpdateStepInDb(Step step, CancellationToken cancellationToken)
    {
        using var activity = Telemetry.Source.StartActivity(
            "Engine.UpdateStepInDb",
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
