using System.Collections.Concurrent;
using System.Diagnostics;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Models.Extensions;
using WorkflowEngine.Resilience.Extensions;
using WorkflowEngine.Resilience.Models;
using TaskStatus = WorkflowEngine.Models.TaskStatus;

namespace WorkflowEngine.Api;

internal interface IEngine
{
    EngineHealthStatus Status { get; }
    int InboxCount { get; }
    Task Start(CancellationToken cancellationToken = default);
    Task Stop();
    Task<EngineResponse> EnqueueWorkflow(EngineRequest engineRequest, CancellationToken cancellationToken = default);
    bool HasDuplicateWorkflow(string jobIdentifier);
    bool HasQueuedWorkflowForInstance(InstanceInformation instanceInformation);
    Workflow? GetWorkflowForInstance(InstanceInformation instanceInformation);
}

internal partial class Engine : IEngine, IDisposable
{
    private readonly IServiceProvider _serviceProvider;
    private readonly TimeProvider _timeProvider;
    private readonly ILogger<Engine> _logger;
    private readonly IWorkflowExecutor _taskHandler;
    private readonly EngineSettings _settings;
    private readonly ConcurrentBuffer<bool> _isEnabledHistory = new();
    private readonly SemaphoreSlim _cleanupLock = new(1, 1);
    private readonly RetryStrategy _statusCheckBackoffStrategy = RetryStrategy.Exponential(
        baseInterval: TimeSpan.FromSeconds(1),
        maxDelay: TimeSpan.FromMinutes(1)
    );

    private ConcurrentDictionary<string, Workflow> _inbox;
    private CancellationTokenSource? _cancellationTokenSource;
    private Task? _mainLoopTask;
    private SemaphoreSlim _inboxCapacityLimit;
    private volatile bool _cleanupRequired;
    private bool _disposed;

    // TODO: Avoid newing-up repository for each call? Could be more optimized for Postgres to scope it per batch of actions...
    private IEngineRepository _repository => _serviceProvider.GetRequiredService<IEngineRepository>();
    public EngineHealthStatus Status { get; private set; }
    public int InboxCount => _inbox.Count;

    public Engine(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
        _logger = serviceProvider.GetRequiredService<ILogger<Engine>>();
        _taskHandler = serviceProvider.GetRequiredService<IWorkflowExecutor>();
        _timeProvider = serviceProvider.GetService<TimeProvider>() ?? TimeProvider.System;
        _settings = serviceProvider.GetRequiredService<IOptions<EngineSettings>>().Value;

        InitializeInbox();
    }

    private async Task<bool> ShouldRun(CancellationToken cancellationToken)
    {
        _logger.CheckShouldRun();

        // TODO: Replace this with actual check
        // TODO: This may longer be required. Discuss more in depth later.
        bool placeholderEnabledResponse = await Task.Run(
            async () =>
            {
                await Task.Delay(100, cancellationToken);
                return true;
            },
            cancellationToken
        );

        await _isEnabledHistory.Add(placeholderEnabledResponse);

        var latest = await _isEnabledHistory.Latest();
        var previous = await _isEnabledHistory.Previous();

        // Populate queue if we just transitioned from disabled to enabled
        if (latest is true && previous is false)
            await PopulateWorkflowsFromDb(cancellationToken);

        // Progressive backoff we have been disabled for two or more consecutive checks
        if (latest is false && previous is false)
        {
            int iteration = await _isEnabledHistory.ConsecutiveCount(x => !x);
            var backoffDelay = _statusCheckBackoffStrategy.CalculateDelay(iteration);

            _logger.EngineIsDisabledBackingOff(backoffDelay);
            await Task.Delay(backoffDelay, cancellationToken);
        }

        // Update status
        if (placeholderEnabledResponse)
        {
            Status &= ~EngineHealthStatus.Disabled;
            _logger.EngineIsEnabled();
        }
        else
        {
            Status |= EngineHealthStatus.Disabled;
            _logger.EngineIsDisabled();
        }
        return placeholderEnabledResponse;
    }

    private async Task<bool> HaveWork(CancellationToken cancellationToken)
    {
        _logger.CheckHaveWork();
        bool havePending = InboxCount > 0;

        if (havePending)
        {
            _logger.HaveWork(InboxCount);
            Status &= ~EngineHealthStatus.Idle;
        }
        else
        {
            _logger.NoWork();
            Status |= EngineHealthStatus.Idle;
            await Task.Delay(250, cancellationToken);
        }

        return havePending;
    }

    private async Task MainLoop(CancellationToken cancellationToken)
    {
        _logger.EnteringMainLoop(InboxCount, _inboxCapacityLimit.CurrentCount);

        // Should we run?
        if (!await ShouldRun(cancellationToken))
            return;

        // Do we have jobs to process?
        if (!await HaveWork(cancellationToken))
            return;

        // Process jobs in parallel
        _logger.ProcessingAllWorkflowsInQueue(InboxCount);
        await Parallel.ForEachAsync(
            _inbox.Values.ToList(), // Copy so we can modify the original collection during iteration
            cancellationToken,
            async (job, ct) =>
            {
                await ProcessWorkflow(job, ct);
            }
        );
    }

    private async Task ProcessWorkflow(Workflow workflow, CancellationToken cancellationToken)
    {
        _logger.ProcessingWorkflow(workflow);

        // Not time to process yet
        if (!workflow.IsReadyForExecution(_timeProvider))
        {
            _logger.NotReadyForExecution(workflow);
            return;
        }

        try
        {
            switch (workflow.DatabaseUpdateStatus())
            {
                // Process the steps
                case TaskStatus.None:
                    await ProcessSteps(workflow, cancellationToken);

                    PersistentItemStatus updatedJobStatus = workflow.OverallStatus();
                    if (workflow.Status != updatedJobStatus)
                    {
                        workflow.Status = updatedJobStatus;
                        workflow.DatabaseTask = UpdateWorkflowInDb(workflow, cancellationToken);
                    }

                    return;

                // Waiting on database operation to finish
                case TaskStatus.Started:
                    _logger.WaitingForWorkflowDbTask(workflow);
                    return;

                // Database operation failed
                case TaskStatus.Failed:
                    Exception? ex = workflow.DatabaseTask?.Exception;
                    _logger.WorkflowDbTaskFailed(workflow, ex);

                    workflow.CleanupDatabaseTask();

                    throw new EngineTaskException(
                        $"Database operation failed or timed out for workflow {workflow}",
                        ex
                    );

                // Database operation finished successfully
                case TaskStatus.Finished:
                    _logger.CleaningUpWorkflowDbTask(workflow);
                    workflow.CleanupDatabaseTask();
                    break;

                default:
                    throw new EngineConfigurationException(
                        $"Unknown database update status: {workflow.DatabaseUpdateStatus()}"
                    );
            }
        }
        catch (EngineConfigurationException ex)
        {
            _logger.WorkflowCriticalError(workflow, ex.Message, ex);
            workflow.Status = PersistentItemStatus.Failed;
            await UpdateWorkflowInDb(workflow, cancellationToken);
        }
        catch (Exception ex)
        {
            TimeSpan delay =
                _settings.DefaultStepRetryStrategy.MaxDelay ?? _settings.DefaultStepRetryStrategy.BaseInterval;
            workflow.BackoffUntil = _timeProvider.GetUtcNow().Add(delay);

            _logger.WorkflowProcessingFailed(workflow, delay, ex.Message, ex);

            return;
        }

        // Workflow still has pending steps
        if (!workflow.IsDone())
        {
            _logger.PendingStepsRemain(workflow);
            return;
        }

        // Workflow is done (success or permanent failure). Remove and release queue slot
        RemoveJobAndReleaseQueueSlot(workflow);
        _logger.WorkflowCompleted(workflow);
    }

    private async Task ProcessSteps(Workflow workflow, CancellationToken cancellationToken)
    {
        foreach (Step step in workflow.OrderedIncompleteTasks())
        {
            _logger.ProcessingStep(step);

            // Not time to process yet
            if (!step.IsReadyForExecution(_timeProvider))
            {
                _logger.NotReadyForExecution(step);
                return;
            }

            var currentState = new
            {
                DatabaseUpdateStatus = step.DatabaseUpdateStatus(),
                ExecutionStatus = step.ExecutionStatus(),
            };

            switch (currentState)
            {
                // Waiting for database operation to complete
                case { DatabaseUpdateStatus: TaskStatus.Started }:
                    _logger.WaitingForStepDbTask(step);
                    return;

                // Database operation failed
                case { DatabaseUpdateStatus: TaskStatus.Failed }:
                    Exception? ex = step.DatabaseTask?.Exception;
                    _logger.StepDbTaskFailed(step, ex);

                    step.CleanupDatabaseTask();
                    step.BackoffUntil = GetDbRetryBackoff(step);

                    throw new EngineTaskException($"Database operation failed for step {step}", ex);

                // Database operation completed successfully
                case { DatabaseUpdateStatus: TaskStatus.Finished }:
                    _logger.CleaningUpStepDbTask(step);

                    // Clean up and dispose associated tasks
                    step.CleanupExecutionTask();
                    step.CleanupDatabaseTask();
                    return;

                // Waiting for execution step to complete
                case { ExecutionStatus: TaskStatus.Started }:
                    _logger.WaitingForStepExecutionTask(step);
                    return;

                // Execution step completed
                case { ExecutionStatus: TaskStatus.Finished }:
                    _logger.StepExecutionCompleted(step);
                    Debug.Assert(step.ExecutionTask is not null); // TODO: This is annoying

                    // Unwrap result and handle outcome
                    ExecutionResult result = await step.ExecutionTask;
                    UpdateStepStatusAndRetryDecision(step, result);

                    // Update database
                    step.DatabaseTask = UpdateStepInDb(step, cancellationToken);
                    return;

                // Step is new
                default:
                    _logger.ExecutingStep(step);
                    step.InitialStartTime ??= _timeProvider.GetUtcNow();
                    step.ExecutionTask = _taskHandler.Execute(workflow, step, cancellationToken);
                    return;
            }
        }

        return;

        void UpdateStepStatusAndRetryDecision(Step step, ExecutionResult result)
        {
            if (result.IsSuccess())
            {
                step.Status = PersistentItemStatus.Completed;
                _logger.StepCompletedSuccessfully(step);
                return;
            }

            if (result.IsCriticalError())
            {
                step.Status = PersistentItemStatus.Failed;
                step.BackoffUntil = null;
                _logger.FailingStepCritical(step, step.RequeueCount);
                return;
            }

            _logger.StepFailed(step);
            RetryStrategy retryStrategy = GetRetryStrategy(step);
            DateTimeOffset initialStartTime = GetInitialStartTime(step);

            if (retryStrategy.CanRetry(step.RequeueCount + 1, initialStartTime, _timeProvider))
            {
                step.RequeueCount++;
                step.Status = PersistentItemStatus.Requeued;
                step.BackoffUntil = GetNextRetryBackoff(step, retryStrategy);
                _logger.SlatingStepForRetry(step, step.RequeueCount);
                return;
            }

            step.Status = PersistentItemStatus.Failed;
            step.BackoffUntil = null;
            _logger.FailingStepRetries(step, step.RequeueCount);
        }

        RetryStrategy GetRetryStrategy(Step step)
        {
            return step.RetryStrategy ?? _settings.DefaultStepRetryStrategy;
        }

        DateTimeOffset GetInitialStartTime(Step step)
        {
            return step.InitialStartTime ?? _timeProvider.GetUtcNow();
        }

        DateTimeOffset GetNextRetryBackoff(Step step, RetryStrategy retryStrategy)
        {
            return _timeProvider.GetUtcNow().Add(retryStrategy.CalculateDelay(step.RequeueCount));
        }

        DateTimeOffset GetDbRetryBackoff(Step step)
        {
            var retryStrategy = GetRetryStrategy(step);
            return _timeProvider.GetUtcNow().Add(retryStrategy.MaxDelay ?? retryStrategy.BaseInterval);
        }
    }
}
