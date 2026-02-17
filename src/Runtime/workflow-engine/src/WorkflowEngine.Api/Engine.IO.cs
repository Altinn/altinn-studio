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

        if (!_concurrencyResolver.CanAccept(engineRequest.Type, engineRequest.InstanceInformation, _inbox.Values))
        {
            activity?.Errored(errorMessage: "Concurrency limit reached for this workflow type on this instance");
            return EngineResponse.Reject(
                EngineResponse.Rejection.Duplicate,
                "Concurrency limit reached for this workflow type on this instance"
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
        long workflowId;
        using (var scope = _serviceProvider.CreateScope())
        {
            var repository = scope.ServiceProvider.GetRequiredService<IEngineRepository>();
            var workflow = await repository.AddWorkflow(engineRequest, cancellationToken: cancellationToken);
            _inbox[engineRequest.IdempotencyKey] = workflow;
            workflowId = workflow.DatabaseId;
        }
        _newWorkSignal.TrySetResult();

        Metrics.WorkflowRequestsAccepted.Add(1);
        Metrics.StepRequestsAccepted.Add(engineRequest.Steps.Count());

        return EngineResponse.Accept(workflowId);
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
