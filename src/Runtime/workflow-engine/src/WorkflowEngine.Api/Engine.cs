using System.Collections.Concurrent;
using Altinn.Studio.Runtime.Common;
using Microsoft.Extensions.Options;
using WorkflowEngine.Api.Constants;
using WorkflowEngine.Api.Extensions;
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
    bool CanAcceptNewWork { get; }
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
    private readonly IWorkflowExecutor _workflowExecutor;
    private readonly EngineSettings _settings;
    private readonly ConcurrentBuffer<bool> _isEnabledHistory = new();
    private readonly SemaphoreSlim _cleanupLock = new(1, 1);
    private readonly RetryStrategy _statusCheckBackoffStrategy = RetryStrategy.Exponential(
        baseInterval: TimeSpan.FromSeconds(1),
        maxDelay: TimeSpan.FromMinutes(1)
    );

    private ConcurrentDictionary<string, Workflow> _inbox;
    private ConcurrentDictionary<InstanceInformation, string> _instanceIndex;
    private CancellationTokenSource? _cancellationTokenSource;
    private Task? _mainLoopTask;
    private SemaphoreSlim _inboxCapacityLimit;
    private volatile TaskCompletionSource _newWorkSignal;
    private volatile bool _cleanupRequired;
    private bool _disposed;

    public EngineHealthStatus Status { get; private set; }
    public int InboxCount => _inbox.Count;
    public bool CanAcceptNewWork => _inboxCapacityLimit.CurrentCount > 0;

    public Engine(IServiceProvider serviceProvider)
    {
        _serviceProvider = serviceProvider;
        _logger = serviceProvider.GetRequiredService<ILogger<Engine>>();
        _workflowExecutor = serviceProvider.GetRequiredService<IWorkflowExecutor>();
        _timeProvider = serviceProvider.GetService<TimeProvider>() ?? TimeProvider.System;
        _settings = serviceProvider.GetRequiredService<IOptions<EngineSettings>>().Value;

        InitializeInbox();
    }

    private async Task<bool> ShouldRun(CancellationToken cancellationToken)
    {
        using var activity = Telemetry.Source.StartActivity("Engine.ShouldRun");
        _logger.CheckShouldRun();

        // TODO: Replace this with actual check
        // TODO: This may longer be required. Discuss more in depth later.
        bool placeholderEnabledResponse = await Task.Run(() => true, cancellationToken);

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

    private bool HaveWork()
    {
        using var activity = Telemetry.Source.StartActivity("Engine.HaveWork");
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
        }

        return havePending;
    }

    private async Task MainLoop(CancellationToken cancellationToken)
    {
        using var activity = Telemetry.Source.StartActivity("Engine.MainLoop");
        _logger.EnteringMainLoop(InboxCount, _inboxCapacityLimit.CurrentCount);

        // Should we run?
        if (!await ShouldRun(cancellationToken))
            return;

        // Fresh signal for this cycle. Any EnqueueWorkflow call from this point forward signals this specific instance.
        var signal = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        Interlocked.Exchange(ref _newWorkSignal, signal);

        // TODO: We get a tick every 0.5s, but often sooner. Check here if it's time to fetch from database. Keep track of last time we queried, etc.
        // Hydrate the inbox with workflows from the database
        // ...

        // Do we have jobs to process?
        if (!HaveWork())
        {
            // Idle: wait until new work arrives (or cancellation)
            await signal.Task.WaitAsync(cancellationToken);
            return;
        }

        _logger.ProcessingAllWorkflowsInQueue(InboxCount);
        var parallelOptions = new ParallelOptions
        {
            CancellationToken = cancellationToken,
            MaxDegreeOfParallelism = _settings.MaxDegreeOfParallelism,
        };

        // Process all workflows in the queue in parallel, but don't await tasks
        await Parallel.ForEachAsync(
            _inbox,
            parallelOptions,
            async (item, ct) =>
            {
                var (_, workflow) = item;
                await ProcessWorkflow(workflow, ct);
            }
        );

        // Wait for at least one task to complete or for new work to be added
        await WaitForPendingTasks(signal, cancellationToken);
    }

    private async Task WaitForPendingTasks(TaskCompletionSource newWorkSignal, CancellationToken cancellationToken)
    {
        using var activity = Telemetry.Source.StartActivity("Engine.WaitForPendingTasks");

        // Wait for active Step and Workflow tasks
        var awaitables = _inbox
            .Values.SelectMany(workflow =>
            {
                var step = workflow.OrderedIncompleteSteps().FirstOrDefault();

                // Order is important here, since we keep completed ExecutionTasks for the processing logic
                var stepTask = step?.DatabaseTask ?? step?.ExecutionTask;
                var workflowTask = workflow.DatabaseTask;
                var circuitBreakerTask =
                    stepTask is null && step?.IsReadyForExecution(_timeProvider) is true ? Task.CompletedTask : null;

                return new[] { workflowTask, stepTask, circuitBreakerTask }.OfType<Task>();
            })
            .ToList();

        // Wait for the new work signal, but debounce the call to avoid stampeding
        awaitables.Add(newWorkSignal.Debounce(TimeSpan.FromMilliseconds(100), cancellationToken));

        // Tick (maintenance, etc)
        awaitables.Add(Task.Delay(TimeSpan.FromMilliseconds(500), cancellationToken));

        // We already have finished tasks, no need to wait
        if (awaitables.Any(x => x.IsCompleted))
            return;

        // Wait for at least one task to complete
        await Task.WhenAny(awaitables).WaitAsync(cancellationToken);
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

        using var activity = StartProcessWorkflowActivity(workflow);

        try
        {
            switch (workflow.DatabaseUpdateStatus())
            {
                // Process the steps
                case TaskStatus.None:

                    // If this is the first time we're seeing this workflow
                    if (workflow.ExecutionStartedAt is null)
                    {
                        RecordWorkflowQueueTime(workflow);
                        workflow.ExecutionStartedAt = _timeProvider.GetUtcNow();
                    }

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
                    activity?.IsNoop();
                    return;

                // Database operation failed
                case TaskStatus.Failed:
                    Exception? ex = workflow.DatabaseTask?.Exception;
                    _logger.WorkflowDbTaskFailed(workflow, ex);

                    workflow.CleanupDatabaseTask();

                    throw new EngineDbException($"Database operation failed or timed out for workflow {workflow}", ex);

                // Database operation finished successfully
                case TaskStatus.Finished:
                    _logger.CleaningUpWorkflowDbTask(workflow);
                    workflow.CleanupDatabaseTask();

                    RecordWorkflowServiceTime(workflow);
                    RecordWorkflowTotalTime(workflow);

                    break;

                // Something insane has happened
                default:
                    workflow.Status = PersistentItemStatus.Failed;
                    await UpdateWorkflowInDb(workflow, cancellationToken);
                    activity?.Errored(
                        errorMessage: $"Unknown database update status: {workflow.DatabaseUpdateStatus()}"
                    );
                    _logger.WorkflowCriticalError(
                        workflow,
                        $"Unknown database update status: {workflow.DatabaseUpdateStatus()}",
                        null
                    );
                    break;
            }
        }
        catch (OperationCanceledException ex) when (cancellationToken.IsCancellationRequested)
        {
            activity?.Errored(ex);
            return;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            Telemetry.Errors.Add(
                1,
                ("operation", "workflowProcessing"),
                ("target", workflow.InstanceInformation.ToString())
            );

            _logger.WorkflowProcessingFailed(workflow, ex.Message, ex);

            return;
        }

        // Workflow still has pending steps
        if (!workflow.IsDone())
        {
            _logger.PendingStepsRemain(workflow);
            return;
        }

        // Workflow is done (success or permanent failure)
        RemoveJobAndReleaseQueueSlot(workflow);
        _logger.WorkflowCompleted(workflow);
    }

    private async Task ProcessSteps(Workflow workflow, CancellationToken cancellationToken)
    {
        List<Step> orderedSteps = workflow.OrderedSteps().ToList();

        for (int i = 0; i < orderedSteps.Count; i++)
        {
            var step = orderedSteps[i];
            var previous = i > 0 ? workflow.Steps[i - 1] : null;

            // Step is already complete
            if (step.IsComplete())
                continue;

            // Not time to process yet
            if (!step.IsReadyForExecution(_timeProvider))
            {
                _logger.NotReadyForExecution(step);
                return;
            }

            _logger.ProcessingStep(step);
            using var activity = StartProcessStepActivity(workflow, step);

            var currentState = new
            {
                DatabaseUpdateStatus = step.DatabaseUpdateStatus(),
                ExecutionStatus = step.ExecutionStatus(),
            };

            try
            {
                switch (currentState)
                {
                    // Waiting for the database operation to complete
                    case { DatabaseUpdateStatus: TaskStatus.Started }:
                        _logger.WaitingForStepDbTask(step);
                        activity?.IsNoop();
                        return;

                    // Database operation failed
                    case { DatabaseUpdateStatus: TaskStatus.Failed }:
                        Exception? ex = step.DatabaseTask?.Exception;
                        _logger.StepDbTaskFailed(step, ex);

                        step.CleanupDatabaseTask();

                        throw new EngineDbException($"Database operation failed for step {step}", ex);

                    // Database operation completed successfully
                    case { DatabaseUpdateStatus: TaskStatus.Finished }:
                        _logger.CleaningUpStepDbTask(step);
                        activity?.IsNoop();

                        // Clean up tasks
                        step.CleanupExecutionTask();
                        step.CleanupDatabaseTask();

                        RecordStepServiceTime(step);
                        RecordStepTotalTime(step, previous);

                        return;

                    // Waiting for the execution step to complete
                    case { ExecutionStatus: TaskStatus.Started }:
                        _logger.WaitingForStepExecutionTask(step);
                        activity?.IsNoop();
                        return;

                    // Execution step completed
                    case { ExecutionStatus: TaskStatus.Finished }:
                        _logger.StepExecutionCompleted(step);
                        Assert.That(step.ExecutionTask is not null);

                        // Unwrap result and handle the outcome
                        ExecutionResult result = await step.ExecutionTask;
                        UpdateStepStatusAndRetryDecision(step, previous, result);

                        // Update database
                        step.DatabaseTask = UpdateStepInDb(step, cancellationToken);
                        return;

                    // Step is new
                    default:
                        _logger.ExecutingStep(step);
                        RecordStepQueueTime(step);

                        step.Status = PersistentItemStatus.Processing;
                        step.ExecutionStartedAt = _timeProvider.GetUtcNow();
                        step.ExecutionTask = _workflowExecutor.Execute(workflow, step, cancellationToken);
                        return;
                }
            }
            catch (Exception ex)
            {
                activity?.Errored(ex);
                throw;
            }
        }

        return;

        void UpdateStepStatusAndRetryDecision(Step currentStep, Step? previousStep, ExecutionResult result)
        {
            if (result.IsSuccess())
            {
                currentStep.Status = PersistentItemStatus.Completed;

                Telemetry.StepsSucceeded.Add(1);
                _logger.StepCompletedSuccessfully(currentStep);

                return;
            }

            if (result.IsCriticalError())
            {
                currentStep.Status = PersistentItemStatus.Failed;
                currentStep.BackoffUntil = null;

                Telemetry.StepsFailed.Add(1);
                _logger.FailingStepCritical(currentStep, currentStep.RequeueCount);

                return;
            }

            _logger.StepFailed(currentStep);
            var retryStrategy = GetRetryStrategy(currentStep);
            var intialStartTime = previousStep?.UpdatedAt ?? currentStep.CreatedAt;

            if (retryStrategy.CanRetry(currentStep.RequeueCount + 1, intialStartTime, _timeProvider))
            {
                currentStep.RequeueCount++;
                currentStep.Status = PersistentItemStatus.Requeued;
                currentStep.BackoffUntil = GetExecutionRetryBackoff(currentStep, retryStrategy);

                Telemetry.StepsRequeued.Add(1);
                _logger.SlatingStepForRetry(currentStep, currentStep.RequeueCount);

                return;
            }

            currentStep.Status = PersistentItemStatus.Failed;
            currentStep.BackoffUntil = null;

            Telemetry.StepsFailed.Add(1);
            _logger.FailingStepRetries(currentStep, currentStep.RequeueCount);
        }

        RetryStrategy GetRetryStrategy(Step step)
        {
            return step.RetryStrategy ?? _settings.DefaultStepRetryStrategy;
        }

        DateTimeOffset GetExecutionRetryBackoff(Step step, RetryStrategy retryStrategy)
        {
            return _timeProvider.GetUtcNow().Add(retryStrategy.CalculateDelay(step.RequeueCount));
        }
    }
}
