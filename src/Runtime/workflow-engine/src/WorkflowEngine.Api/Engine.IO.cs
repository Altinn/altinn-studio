using WorkflowEngine.Models;

namespace WorkflowEngine.Api;

internal partial class Engine
{
    public async Task<EngineResponse> EnqueueWorkflow(
        EngineRequest engineRequest,
        CancellationToken cancellationToken = default
    )
    {
        _logger.EnqueuingWorkflow(engineRequest);

        if (!engineRequest.IsValid())
            return EngineResponse.Rejected($"Invalid request: {engineRequest}");

        if (HasDuplicateWorkflow(engineRequest.Key))
            return EngineResponse.Rejected(
                "Duplicate request. A job with the same identifier is already being processed"
            );

        if (HasQueuedWorkflowForInstance(engineRequest.InstanceInformation))
            return EngineResponse.Rejected(
                "A job for this instance is already processing. Concurrency is currently not supported"
            );

        if (_mainLoopTask is null)
            return EngineResponse.Rejected("Process engine is not running. Did you call Start()?");

        var enabled = await _isEnabledHistory.Latest() ?? await ShouldRun(cancellationToken);
        if (!enabled)
            return EngineResponse.Rejected("Process engine is currently inactive. Did you call the right instance?");

        await AcquireQueueSlot(cancellationToken);
        _inbox[engineRequest.Key] = await _repository.AddWorkflow(engineRequest, cancellationToken);

        return EngineResponse.Accepted();
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

    private async Task PopulateWorkflowsFromDb(CancellationToken cancellationToken)
    {
        // TODO: Disabled for now. We don't necessarily want to resume jobs after restart while testing.
        return;

        IReadOnlyList<Workflow> incompleteJobs = await _repository.GetIncompleteWorkflows(cancellationToken);

        foreach (var job in incompleteJobs)
        {
            // TODO: Not sure about this logic...
            // Only add if not already in memory to avoid duplicates
            if (_inbox.TryAdd(job.Key, job))
                _logger.RestoredWorkflowFromDb(job.Key);
        }
    }

    private Task UpdateWorkflowInDb(Workflow workflow, CancellationToken cancellationToken) =>
        _repository.UpdateWorkflow(workflow, cancellationToken);

    private Task UpdateStepInDb(Step step, CancellationToken cancellationToken) =>
        _repository.UpdateStep(step: step, cancellationToken);
}
