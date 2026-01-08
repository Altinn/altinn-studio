using WorkflowEngine.Models;

namespace WorkflowEngine.Api;

internal partial class ProcessEngine
{
    public async Task<Response> EnqueueJob(Request request, CancellationToken cancellationToken = default)
    {
        _logger.LogDebug("Enqueuing job {JobIdentifier}", request.Key);

        if (!request.IsValid())
            return Response.Rejected($"Invalid request: {request}");

        if (HasDuplicateJob(request.Key))
            return Response.Rejected("Duplicate request. A job with the same identifier is already being processed");

        if (HasQueuedJobForInstance(request.InstanceInformation))
            return Response.Rejected(
                "A job for this instance is already processing. Concurrency is currently not supported"
            );

        if (_mainLoopTask is null)
            return Response.Rejected("Process engine is not running. Did you call Start()?");

        var enabled = await _isEnabledHistory.Latest() ?? await ShouldRun(cancellationToken);
        if (!enabled)
            return Response.Rejected("Process engine is currently inactive. Did you call the right instance?");

        await AcquireQueueSlot(cancellationToken);

        _logger.LogTrace("Enqueuing job request {Request}", request);
        _inbox[request.Key] = await _repository.AddWorkflow(request, cancellationToken);

        return Response.Accepted();
    }

    public bool HasDuplicateJob(string jobIdentifier)
    {
        return _inbox.ContainsKey(jobIdentifier);
    }

    public bool HasQueuedJobForInstance(InstanceInformation instanceInformation)
    {
        return _inbox.Values.Any(x => x.InstanceInformation.Equals(instanceInformation));
    }

    public Workflow? GetJobForInstance(InstanceInformation instanceInformation)
    {
        return _inbox.Values.FirstOrDefault(x => x.InstanceInformation.Equals(instanceInformation));
    }

    private async Task PopulateJobsFromStorage(CancellationToken cancellationToken)
    {
        // Disabled for now. We don't necessarily want to resume jobs after restart while testing.
        return;

        _logger.LogDebug("Populating jobs from storage");

        try
        {
            IReadOnlyList<Workflow> incompleteJobs = await _repository.GetIncompleteWorkflows(cancellationToken);

            foreach (var job in incompleteJobs)
            {
                // TODO: Not sure about this logic...
                // Only add if not already in memory to avoid duplicates
                if (_inbox.TryAdd(job.Key, job))
                    _logger.LogDebug("Restored job {JobIdentifier} from database", job.Key);
            }

            _logger.LogInformation("Populated {JobCount} jobs from storage", incompleteJobs.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to populate jobs from storage after all retries. Continuing with in-memory only operation"
            );
        }
    }

    private async Task UpdateJobInStorage(Workflow workflow, CancellationToken cancellationToken)
    {
        // TODO: Should we update the `Instance` with something here too? Like if the workflow has failed, etc
        _logger.LogDebug("Updating workflow in storage: {Workflow}", workflow);

        try
        {
            await _repository.UpdateWorkflow(workflow, cancellationToken);
            _logger.LogTrace("Workflow {JobIdentifier} updated in database", workflow.Key);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Failed to update workflow {JobIdentifier} in database after all retries",
                workflow.Key
            );
            // Continue processing even if database update fails
        }
    }

    private async Task UpdateTaskInStorage(Step step, CancellationToken cancellationToken)
    {
        _logger.LogDebug("Updating step in storage: {Step}", step);

        try
        {
            await _repository.UpdateStep(step: step, cancellationToken);
            _logger.LogTrace("Step {TaskIdentifier} updated in database", step.Key);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to update step {TaskIdentifier} in database after all retries", step.Key);
            // Continue processing even if database update fails
        }
    }
}
