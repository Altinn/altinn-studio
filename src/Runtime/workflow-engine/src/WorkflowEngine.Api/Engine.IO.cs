using WorkflowEngine.Models;

namespace WorkflowEngine.Api;

internal partial class Engine
{
    public async Task<Response> EnqueueWorkflow(Request request, CancellationToken cancellationToken = default)
    {
        _logger.EnqueuingWorkflow(request);

        if (!request.IsValid())
            return Response.Rejected($"Invalid request: {request}");

        if (HasDuplicateWorkflow(request.Key))
            return Response.Rejected("Duplicate request. A job with the same identifier is already being processed");

        if (HasQueuedWorkflowForInstance(request.InstanceInformation))
            return Response.Rejected(
                "A job for this instance is already processing. Concurrency is currently not supported"
            );

        if (_mainLoopTask is null)
            return Response.Rejected("Process engine is not running. Did you call Start()?");

        var enabled = await _isEnabledHistory.Latest() ?? await ShouldRun(cancellationToken);
        if (!enabled)
            return Response.Rejected("Process engine is currently inactive. Did you call the right instance?");

        await AcquireQueueSlot(cancellationToken);
        _inbox[request.Key] = await _repository.AddWorkflow(request, cancellationToken);

        return Response.Accepted();
    }

    public bool HasDuplicateWorkflow(string jobIdentifier)
    {
        return _inbox.ContainsKey(jobIdentifier);
    }

    public bool HasQueuedWorkflowForInstance(InstanceInformation instanceInformation)
    {
        return _inbox.Values.Any(x => x.InstanceInformation.Equals(instanceInformation));
    }

    public Workflow? GetWorkflowForInstance(InstanceInformation instanceInformation)
    {
        return _inbox.Values.FirstOrDefault(x => x.InstanceInformation.Equals(instanceInformation));
    }

    private async Task PopulateWorkflowsFromStorage(CancellationToken cancellationToken)
    {
        // TODO: Disabled for now. We don't necessarily want to resume jobs after restart while testing.
        return;

        _logger.PopulatingWorkflowsFromDb();

        try
        {
            IReadOnlyList<Workflow> incompleteJobs = await _repository.GetIncompleteWorkflows(cancellationToken);

            foreach (var job in incompleteJobs)
            {
                // TODO: Not sure about this logic...
                // Only add if not already in memory to avoid duplicates
                if (_inbox.TryAdd(job.Key, job))
                    _logger.RestoredWorkflowFromDb(job.Key);
            }

            _logger.SuccessfullyPopulatedFromDb(incompleteJobs.Count);
        }
        catch (Exception ex)
        {
            _logger.FailedToPopulateFromFromDb(ex);
            throw;
        }
    }

    private async Task UpdateWorkflowInStorage(Workflow workflow, CancellationToken cancellationToken)
    {
        _logger.UpdatingWorkflowInDb(workflow);

        try
        {
            await _repository.UpdateWorkflow(workflow, cancellationToken);
            _logger.WorkflowUpdatedInDb(workflow.Key);
        }
        catch (Exception ex)
        {
            _logger.FailedUpdatingWorkflowInDb(workflow.Key, ex);
            throw;
        }
    }

    private async Task UpdateTaskInStorage(Step step, CancellationToken cancellationToken)
    {
        _logger.UpdatingStepInDb(step);

        try
        {
            await _repository.UpdateStep(step: step, cancellationToken);
            _logger.StepUpdatedInDb(step.Key);
        }
        catch (Exception ex)
        {
            _logger.FailedUpdatingStepInDb(step.Key, ex);
            throw;
        }
    }
}
