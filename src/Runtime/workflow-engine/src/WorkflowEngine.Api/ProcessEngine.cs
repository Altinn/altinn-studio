using System.Collections.Concurrent;
using System.Diagnostics;
using Microsoft.Extensions.Options;
using WorkflowEngine.Api.Exceptions;
using WorkflowEngine.Api.Extensions;
using WorkflowEngine.Data;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Extensions;
using TaskStatus = WorkflowEngine.Models.TaskStatus;

namespace WorkflowEngine.Api;

internal interface IProcessEngine
{
    WorkflowEngineSettings Settings { get; }
    EngineHealthStatus Status { get; }
    int InboxCount { get; }
    System.Threading.Tasks.Task Start(CancellationToken cancellationToken = default);
    System.Threading.Tasks.Task Stop();
    Task<Response> EnqueueJob(Request request, CancellationToken cancellationToken = default);
    bool HasDuplicateJob(string jobIdentifier);
    bool HasQueuedJobForInstance(InstanceInformation instanceInformation);
    Workflow? GetJobForInstance(InstanceInformation instanceInformation);
}

internal partial class ProcessEngine : IProcessEngine, IDisposable
{
    private readonly IServiceProvider _serviceProvider;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<ProcessEngine> _logger;
    private readonly IProcessEngineTaskHandler _taskHandler;
    private readonly ConcurrentBuffer<bool> _isEnabledHistory = new();
    private readonly SemaphoreSlim _cleanupLock = new(1, 1);
    private readonly RetryStrategy _statusCheckBackoffStrategy = RetryStrategy.Exponential(
        baseInterval: TimeSpan.FromSeconds(1),
        maxDelay: TimeSpan.FromMinutes(1)
    );

    private ConcurrentDictionary<string, Workflow> _inbox;
    private CancellationTokenSource? _cancellationTokenSource;
    private System.Threading.Tasks.Task? _mainLoopTask;
    private SemaphoreSlim _inboxCapacityLimit;
    private volatile bool _cleanupRequired;
    private bool _disposed;
    private readonly IOptionsMonitor<WorkflowEngineSettings> _settings;

    private IProcessEngineRepository _repository => _serviceProvider.GetRequiredService<IProcessEngineRepository>();
    public EngineHealthStatus Status { get; private set; }
    public int InboxCount => _inbox.Count;
    public WorkflowEngineSettings Settings => _settings.CurrentValue;

    public ProcessEngine(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
        _logger = serviceProvider.GetRequiredService<ILogger<ProcessEngine>>();
        _taskHandler = serviceProvider.GetRequiredService<IProcessEngineTaskHandler>();
        _timeProvider = serviceProvider.GetService<TimeProvider>() ?? TimeProvider.System;
        _settings = serviceProvider.GetRequiredService<IOptionsMonitor<WorkflowEngineSettings>>();

        InitializeInbox();
    }

    private async Task<bool> ShouldRun(CancellationToken cancellationToken)
    {
        // E.g. "do we hold the lock?"
        _logger.LogTrace("Checking if process engine should run");

        // TODO: Replace this with actual check
        bool placeholderEnabledResponse = await System.Threading.Tasks.Task.Run(
            async () =>
            {
                await System.Threading.Tasks.Task.Delay(100, cancellationToken);
                return true;
            },
            cancellationToken
        );

        await _isEnabledHistory.Add(placeholderEnabledResponse);

        var latest = await _isEnabledHistory.Latest();
        var previous = await _isEnabledHistory.Previous();

        // Populate queue if we just transitioned from disabled to enabled
        if (latest is true && previous is false)
            await PopulateJobsFromStorage(cancellationToken);

        // Progressive backoff we have been disabled for two or more consecutive checks
        if (latest is false && previous is false)
        {
            int iteration = await _isEnabledHistory.ConsecutiveCount(x => !x);
            var backoffDelay = _statusCheckBackoffStrategy.CalculateDelay(iteration);

            _logger.LogInformation("Process engine is disabled. Backing off for {BackoffDelay}", backoffDelay);
            await System.Threading.Tasks.Task.Delay(backoffDelay, cancellationToken);
        }

        // Update status
        if (placeholderEnabledResponse)
        {
            Status &= ~EngineHealthStatus.Disabled;
            _logger.LogTrace("Process engine is enabled");
        }
        else
        {
            Status |= EngineHealthStatus.Disabled;
            _logger.LogTrace("Process engine is disabled");
        }
        return placeholderEnabledResponse;
    }

    private async Task<bool> HaveJobs(CancellationToken cancellationToken)
    {
        _logger.LogTrace("Checking if we have jobs to process");
        bool haveJobs = InboxCount > 0;

        if (haveJobs)
        {
            _logger.LogTrace("We have jobs to process: {InboxCount}", InboxCount);
            Status &= ~EngineHealthStatus.Idle;
        }
        else
        {
            _logger.LogTrace("No jobs to process, taking a short nap");
            Status |= EngineHealthStatus.Idle;
            await System.Threading.Tasks.Task.Delay(250, cancellationToken);
        }

        return haveJobs;
    }

    private async System.Threading.Tasks.Task MainLoop(CancellationToken cancellationToken)
    {
        _logger.LogTrace(
            "Entering MainLoop. Inbox count: {InboxCount}. Queue slots available: {AvailableQueueSlots}",
            InboxCount,
            _inboxCapacityLimit.CurrentCount
        );

        // Should we run?
        if (!await ShouldRun(cancellationToken))
            return;

        // Do we have jobs to process?
        if (!await HaveJobs(cancellationToken))
            return;

        // Process jobs in parallel
        _logger.LogTrace("Processing jobs. Queue size: {InboxCount}", InboxCount);
        await Parallel.ForEachAsync(
            _inbox.Values.ToList(), // Copy so we can modify the original collection during iteration
            cancellationToken,
            async (job, ct) =>
            {
                await ProcessJob(job, ct);
            }
        );
    }

    private async System.Threading.Tasks.Task ProcessJob(Workflow workflow, CancellationToken cancellationToken)
    {
        _logger.LogDebug("Processing workflow: {Workflow}", workflow);

        switch (workflow.DatabaseUpdateStatus())
        {
            // Process the tasks
            case TaskStatus.None:
                await ProcessTasks(workflow, cancellationToken);

                PersistentItemStatus updatedJobStatus = workflow.OverallStatus();
                if (workflow.Status != updatedJobStatus)
                {
                    workflow.Status = updatedJobStatus;
                    workflow.DatabaseTask = UpdateJobInStorage(workflow, cancellationToken);
                }
                return;

            // Waiting on database operation to finish
            case TaskStatus.Started:
                _logger.LogDebug("Workflow {Workflow} is waiting for database operation to complete", workflow);
                return;

            // Database operation is finished
            case TaskStatus.Finished:
                _logger.LogDebug("Workflow {Workflow} database operation has completed. Cleaning up", workflow);
                workflow.CleanupDatabaseTask();
                break;

            default:
                throw new WorkflowEngineException($"Unknown database update status: {workflow.DatabaseUpdateStatus()}");
        }

        // Workflow still has work pending (requeued tasks, etc)
        if (!workflow.IsDone())
        {
            _logger.LogDebug(
                "Workflow {Workflow} is still has tasks processing. Leaving in queue for next iteration",
                workflow
            );
            return;
        }

        // Workflow is done (success or permanent failure). Remove and release queue slot
        RemoveJobAndReleaseQueueSlot(workflow);
        _logger.LogDebug("Workflow {Workflow} is done", workflow);
    }

    private async System.Threading.Tasks.Task ProcessTasks(Workflow workflow, CancellationToken cancellationToken)
    {
        foreach (Step task in workflow.OrderedIncompleteTasks())
        {
            _logger.LogDebug("Processing step: {Step}", task);

            // Not time to process yet
            if (!task.IsReadyForExecution(_timeProvider))
            {
                _logger.LogTrace("Step {Step} not ready for execution", task);
                return;
            }

            var currentState = new
            {
                DatabaseUpdateStatus = task.DatabaseUpdateStatus(),
                ExecutionStatus = task.ExecutionStatus(),
            };

            switch (currentState)
            {
                // Waiting for database operation to complete
                case { DatabaseUpdateStatus: TaskStatus.Started }:
                    _logger.LogDebug("Step {Step} is waiting for database operation to complete", task);
                    return;

                // Database operation completed
                case { DatabaseUpdateStatus: TaskStatus.Finished }:
                    _logger.LogDebug("Step {Step} database operation has completed. Cleaning up", task);
                    task.CleanupDatabaseTask();
                    return;

                // Waiting for execution step to complete
                case { ExecutionStatus: TaskStatus.Started }:
                    _logger.LogDebug("Step {Step} is waiting for execution to complete", task);
                    return;

                // Execution step completed
                case { ExecutionStatus: TaskStatus.Finished }:
                    _logger.LogDebug("Step {Step} execution has completed. Need to update database", task);
                    Debug.Assert(task.ExecutionTask is not null); // TODO: This is annoying

                    // Unwrap result and handle outcome
                    ExecutionResult result = await task.ExecutionTask;
                    UpdateTaskStatusAndRetryDecision(task, result);

                    // Cleanup and update database
                    task.CleanupExecutionTask();
                    task.DatabaseTask = UpdateTaskInStorage(task, cancellationToken);
                    return;

                // Step is new
                default:
                    _logger.LogDebug("Step {Step} is new. Starting execution", task);
                    task.ExecutionTask = _taskHandler.Execute(workflow, task, cancellationToken);
                    return;
            }
        }

        return;

        void UpdateTaskStatusAndRetryDecision(Step step, ExecutionResult result)
        {
            if (result.IsSuccess())
            {
                step.Status = PersistentItemStatus.Completed;
                _logger.LogDebug("Step {Step} completed successfully", step);
                return;
            }

            _logger.LogDebug("Step {Step} failed", step);
            var retryStrategy = step.RetryStrategy ?? Settings.DefaultTaskRetryStrategy;

            if (retryStrategy.CanRetry(step.RequeueCount + 1))
            {
                step.RequeueCount++;
                step.Status = PersistentItemStatus.Requeued;
                step.BackoffUntil = _timeProvider.GetUtcNow().Add(retryStrategy.CalculateDelay(step.RequeueCount));
                _logger.LogDebug("Requeuing step {Step} (Retry count: {Retries})", step, step.RequeueCount);
            }
            else
            {
                step.Status = PersistentItemStatus.Failed;
                step.BackoffUntil = null;
                _logger.LogError(
                    "Failing step {Step}. No more retries available after {Retries} attempts",
                    step,
                    step.RequeueCount
                );
            }
        }
    }
}
