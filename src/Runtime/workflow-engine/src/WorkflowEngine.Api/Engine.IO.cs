using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Api;

internal partial class Engine
{
    public async Task<EngineResponse> EnqueueWorkflow(
        WorkflowEnqueueRequest workflowRequest,
        CancellationToken cancellationToken = default
    )
    {
        using var activity = Metrics.Source.StartActivity(
            "Engine.EnqueueWorkflow",
            tags:
            [
                ("request.operation.id", workflowRequest.OperationId),
                ("request.actor.id", workflowRequest.Actor.UserIdOrOrgNumber),
                ("request.instance.guid", workflowRequest.InstanceInformation.InstanceGuid),
                ("request.instance.party.id", workflowRequest.InstanceInformation.InstanceOwnerPartyId),
                (
                    "request.instance.app",
                    $"{workflowRequest.InstanceInformation.Org}/{workflowRequest.InstanceInformation.App}"
                ),
            ]
        );

        _logger.EnqueuingWorkflow(workflowRequest);

        if (!CanAcceptNewWork)
        {
            activity?.Errored(errorMessage: "At capacity");
            return EngineResponse.Reject(EngineResponse.Rejection.AtCapacity);
        }

        if (!workflowRequest.IsValid())
        {
            activity?.Errored(errorMessage: "Invalid request");
            return EngineResponse.Reject(EngineResponse.Rejection.Invalid, $"Invalid request: {workflowRequest}");
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

        using var scope = _serviceProvider.CreateScope();
        var repository = scope.ServiceProvider.GetRequiredService<IEngineRepository>();

        Workflow workflow;
        try
        {
            workflow = await repository.AddWorkflow(workflowRequest, cancellationToken: cancellationToken);
        }
        catch (ActiveWorkflowConstraintException ex)
        {
            activity?.Errored(errorMessage: ex.Message);
            return EngineResponse.Reject(EngineResponse.Rejection.ConcurrencyViolation, ex.Message);
        }

        _inbox[workflow.DatabaseId] = workflow;
        _newWorkSignal.TrySetResult();

        Metrics.WorkflowRequestsAccepted.Add(1);
        Metrics.StepRequestsAccepted.Add(workflowRequest.Steps.Count());

        return EngineResponse.Accept(workflow.DatabaseId);
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
