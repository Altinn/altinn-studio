using System.Diagnostics;
using Altinn.Studio.Common;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Core.Extensions;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Models.Extensions;
using WorkflowEngine.Resilience.Extensions;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

// S3878: This is required to avoid nullability mismatch in call to Metrics.Errors.Add()
// CA5394: Random is an insecure random number generator — the throttle-parking jitter spreads
// scheduling stamps, it is not security-sensitive (same justification as the retry delay jitter).
#pragma warning disable S3878
#pragma warning disable CA5394

namespace WorkflowEngine.Core;

/// <summary>
/// Handles processing a single workflow to completion. Executes steps sequentially,
/// applies retry/backoff logic, and submits dirty state to the <see cref="WorkflowUpdateBuffer"/>.
/// </summary>
internal sealed class WorkflowHandler(
    IWorkflowExecutor executor,
    IWorkflowUpdateBuffer statusWriteBuffer,
    IOptions<EngineSettings> settings,
    TimeProvider timeProvider,
    IThrottleStateView throttleStateView,
    ILogger<WorkflowHandler> logger
)
{
    private readonly EngineSettings _settings = settings.Value;

    /// <summary>
    /// Processes a workflow through all its steps. On return, the workflow's <c>Status</c>
    /// reflects the final outcome (Completed, Failed, Canceled, Requeued for retry, or
    /// Waiting for a deferred step).
    /// </summary>
    public async Task Handle(Workflow workflow, CancellationToken ct)
    {
        StartProcessWorkflowActivity(workflow);
        try
        {
            await ProcessWorkflow(workflow, ct);
        }
        catch (LeaseLostException)
        {
            // Reclaimed by another host. Exit cleanly — no retry, no re-enqueue.
            HandleLeaseLost(workflow);
        }
        finally
        {
            StopActivity(workflow);
        }
    }

    private void HandleLeaseLost(Workflow workflow)
    {
        logger.WorkflowLeaseLost(workflow);
        Metrics.WorkflowsLeaseLost.Add(1);

        MarkLeaseLost(workflow.EngineActivity);
    }

    private async Task ProcessWorkflow(Workflow workflow, CancellationToken ct)
    {
        Assert.That(workflow.Status == PersistentItemStatus.Processing);
        workflow.ExecutionStartedAt = timeProvider.GetUtcNow();

        // Read once, up front: the retry/deferral paths below advance BackoffUntil to schedule the
        // next attempt, which would corrupt every duration measured against it.
        var attemptAnchor = AttemptAnchor(workflow);

        RecordWorkflowQueueTime(attemptAnchor);

        if (workflow.CancellationRequestedAt is not null)
        {
            workflow.Status = PersistentItemStatus.Canceled;
            workflow.EngineActivity?.Errored(errorType: "canceled", errorMessage: "Canceled before processing started");

            Metrics.WorkflowsCanceled.Add(1, (TelemetryAttributes.Reason, "before_processing"));
            RecordWorkflowServiceTime(workflow);
            RecordWorkflowTotalTime(attemptAnchor);

            await statusWriteBuffer.Submit(workflow, CancellationToken.None);

            return;
        }

        // Abandoned is deliberately not in the Failed set: a dependency whose failure has been
        // explicitly written off no longer condemns its dependents.
        if (workflow.Dependencies?.Any(x => PersistentItemStatusMap.Failed.Contains(x.Status)) is true)
        {
            workflow.Status = PersistentItemStatus.DependencyFailed;

            RecordWorkflowServiceTime(workflow);
            RecordWorkflowTotalTime(attemptAnchor);

            Metrics.WorkflowsFailed.Add(
                1,
                (TelemetryAttributes.Reason, "dependency_failed"),
                (TelemetryAttributes.WorkflowIsHead, workflow.IsHeadTagValue())
            );

            await statusWriteBuffer.Submit(workflow, CancellationToken.None);

            return;
        }

        try
        {
            await ProcessSteps(workflow, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            workflow.EngineActivity?.Errored(
                errorType: workflow.CancellationRequestedAt is not null ? "canceled" : "shutdown",
                errorMessage: "Canceled during processing"
            );

            if (workflow.Status == PersistentItemStatus.Processing)
            {
                if (workflow.CancellationRequestedAt is not null)
                {
                    workflow.Status = PersistentItemStatus.Canceled;
                    Metrics.WorkflowsCanceled.Add(1, (TelemetryAttributes.Reason, "during_processing"));
                    RecordWorkflowServiceTime(workflow);
                    RecordWorkflowTotalTime(attemptAnchor);
                }
                else
                {
                    workflow.Status = PersistentItemStatus.Requeued;
                    Metrics.WorkflowsRequeued.Add(1, (TelemetryAttributes.Reason, "shutdown"));
                    RecordWorkflowServiceTime(workflow);
                    RecordWorkflowTotalTime(attemptAnchor);
                }
            }

            // ProcessSteps mutates the in-flight step before rethrowing; pass all steps
            // since we don't have access to the specific one here.
            await statusWriteBuffer.Submit(workflow, CancellationToken.None, dirtySteps: workflow.Steps);

            throw;
        }
        catch (LeaseLostException)
        {
            throw;
        }
        catch (Exception ex)
        {
            workflow.Status = PersistentItemStatus.Failed;
            workflow.EngineActivity?.Errored(ex);

            logger.WorkflowProcessingFailed(workflow, ex.Message, ex);

            Metrics.Errors.Add(
                1,
                [
                    (TelemetryAttributes.Operation, "workflow_processing"),
                    (TelemetryAttributes.Namespace, workflow.Namespace),
                ]
            );

            await statusWriteBuffer.Submit(workflow, CancellationToken.None);

            return;
        }

        workflow.Status = workflow.OverallStatus();

        if (workflow.Status == PersistentItemStatus.Completed)
        {
            RecordWorkflowServiceTime(workflow);
            RecordWorkflowTotalTime(attemptAnchor);

            Metrics.WorkflowsSucceeded.Add(1);
            workflow.EngineActivity?.Succeeded();
            logger.WorkflowCompleted(workflow);
        }
        else if (workflow.Status == PersistentItemStatus.Failed)
        {
            RecordWorkflowServiceTime(workflow);
            RecordWorkflowTotalTime(attemptAnchor);

            workflow.EngineActivity?.Errored(errorType: FailureReason(workflow));
            Metrics.WorkflowsFailed.Add(
                1,
                (TelemetryAttributes.Reason, FailureReason(workflow)),
                (TelemetryAttributes.WorkflowIsHead, workflow.IsHeadTagValue())
            );
        }
        else if (workflow.Status == PersistentItemStatus.Requeued)
        {
            RecordWorkflowServiceTime(workflow);
            RecordWorkflowTotalTime(attemptAnchor);

            Metrics.WorkflowsRequeued.Add(1, (TelemetryAttributes.Reason, "step_retry"));
        }
        else if (workflow.Status == PersistentItemStatus.Waiting)
        {
            RecordWorkflowServiceTime(workflow);
            RecordWorkflowTotalTime(attemptAnchor);

            Metrics.WorkflowsDeferred.Add(1);
        }

        await statusWriteBuffer.Submit(workflow, ct);
    }

    private async Task ProcessSteps(Workflow workflow, CancellationToken ct)
    {
        var queueAnchor = workflow.ExecutionStartedAt ?? throw new UnreachableException();

        for (int i = 0; i < workflow.Steps.Count; i++)
        {
            ct.ThrowIfCancellationRequested();
            var step = workflow.Steps[i];
            var previous = i > 0 ? workflow.Steps[i - 1] : null;

            if (step.Status.IsDone())
            {
                continue;
            }

            await ProcessStep(workflow, step, previous, queueAnchor, ct);

            queueAnchor = step.UpdatedAt ?? throw new UnreachableException();

            if (step.Status == PersistentItemStatus.Completed)
            {
                continue;
            }

            if (
                step.Status
                is PersistentItemStatus.Requeued
                    or PersistentItemStatus.Waiting
                    or PersistentItemStatus.Failed
            )
            {
                break;
            }

            throw new UnreachableException();
        }
    }

    /// <summary>
    /// Runs one attempt of <paramref name="step"/> under its <c>WorkflowHandler.ProcessStep</c> span, and ends that span
    /// however the attempt ends: a span left open is never exported, so the trace would lose the step. When an exception
    /// ends the attempt, the span is left without a status if it is the handler's own cancellation, marked
    /// <c>lease_lost</c> if the lease was lost, and otherwise marked with the exception, which
    /// <see cref="ProcessWorkflow"/> then logs at ERROR in the same trace.
    /// </summary>
    private async Task ProcessStep(
        Workflow workflow,
        Step step,
        Step? previous,
        DateTimeOffset queueAnchor,
        CancellationToken ct
    )
    {
        StartProcessStepActivity(workflow, step);
        try
        {
            RecordStepQueueTime(step, queueAnchor);

            step.Status = PersistentItemStatus.Processing;
            step.ExecutionStartedAt = timeProvider.GetUtcNow();

            statusWriteBuffer.SubmitAndForget(
                workflow,
                ct,
                dirtySteps: [step],
                reason: "step_started",
                parentActivity: step.EngineActivity
            );

            ExecutionResult result;
            try
            {
                result = await executor.Execute(workflow, step, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                step.Status = workflow.CancellationRequestedAt is not null
                    ? PersistentItemStatus.Canceled
                    : PersistentItemStatus.Requeued;

                throw;
            }
            catch (Exception e)
            {
                throw new UnreachableException(null, e);
            }

            UpdateStepStatusAndRetryDecision(workflow, step, previous, result);

            step.UpdatedAt = timeProvider.GetUtcNow();

            await statusWriteBuffer.Submit(
                workflow,
                ct,
                dirtySteps: [step],
                reason: "step_completed",
                parentActivity: step.EngineActivity
            );

            RecordStepServiceTime(step);
            RecordStepTotalTime(step, queueAnchor);
            RecordStepWaitDuration(step);
            SetStepActivityStatus(workflow, step, result);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            throw;
        }
        catch (LeaseLostException)
        {
            MarkLeaseLost(step.EngineActivity);
            throw;
        }
        catch (Exception ex)
        {
            step.EngineActivity?.Errored(ex);
            throw;
        }
        finally
        {
            StopActivity(step);
        }
    }

    /// <summary>
    /// Determines the outcome of a step execution and applies retry/backoff if appropriate.
    /// </summary>
    private void UpdateStepStatusAndRetryDecision(
        Workflow workflow,
        Step currentStep,
        Step? previousStep,
        ExecutionResult result
    )
    {
        if ((result.IsSuccess() || result.IsDeferred()) && result.StateOut is not null)
            currentStep.StateOut = result.StateOut;

        if (result.IsSuccess())
        {
            currentStep.Status = PersistentItemStatus.Completed;

            Metrics.StepsSucceeded.Add(1);
            logger.StepCompletedSuccessfully(currentStep);

            return;
        }

        if (result.IsDeferred())
        {
            ApplyDeferDecision(workflow, currentStep, result);
            return;
        }

        if (result.IsCriticalError())
        {
            currentStep.Status = PersistentItemStatus.Failed;
            currentStep.ErrorHistory.Add(
                new ErrorEntry(
                    timeProvider.GetUtcNow(),
                    result.Message ?? "Unknown error",
                    result.HttpStatusCode,
                    WasRetryable: false
                )
            );
            workflow.BackoffUntil = null;

            Metrics.StepsFailed.Add(1);
            logger.FailingStepCritical(currentStep, currentStep.RequeueCount);

            return;
        }

        logger.StepFailed(currentStep);
        var retryStrategy = GetRetryStrategy(currentStep);

        // Errors after a deferral anchor on the last deferral, so a long wait does not consume the
        // retry allowance. Must be LastDeferredAt, not UpdatedAt: UpdatedAt advances on every
        // write-back, sliding the deadline forward per attempt until MaxDuration stops binding.
        // The rule is shared with the throttle sweep's deadline clamp via ResolveRetryAnchor.
        var initialStartTime = currentStep.ResolveRetryAnchor(previousStep);

        if (retryStrategy.CanRetry(currentStep.RequeueCount + 1, initialStartTime, timeProvider))
        {
            currentStep.RequeueCount++;
            currentStep.Status = PersistentItemStatus.Requeued;
            currentStep.ErrorHistory.Add(
                new ErrorEntry(
                    timeProvider.GetUtcNow(),
                    result.Message ?? "Unknown error",
                    result.HttpStatusCode,
                    WasRetryable: true
                )
            );
            workflow.BackoffUntil = GetExecutionRetryBackoff(currentStep, retryStrategy);
            ParkIfNamespaceThrottled(workflow, retryStrategy, initialStartTime);

            Metrics.StepsRequeued.Add(1);
            logger.SlatingStepForRetry(currentStep, currentStep.RequeueCount);

            return;
        }

        // No more retries
        currentStep.Status = PersistentItemStatus.Failed;
        currentStep.ErrorHistory.Add(
            new ErrorEntry(
                timeProvider.GetUtcNow(),
                result.Message ?? "Unknown error",
                result.HttpStatusCode,
                WasRetryable: false
            )
        );
        workflow.BackoffUntil = null;

        Metrics.StepsFailed.Add(1);
        logger.FailingStepRetries(currentStep, currentStep.RequeueCount);
    }

    /// <summary>
    /// Parks a deferred step in <see cref="PersistentItemStatus.Waiting"/> and schedules its next
    /// execution via the workflow's <c>BackoffUntil</c>, or fails it once the wait budget is spent.
    /// A deferral is a successful execution: no error history, and the retry counter is reset.
    /// </summary>
    private void ApplyDeferDecision(Workflow workflow, Step currentStep, ExecutionResult result)
    {
        var now = timeProvider.GetUtcNow();
        var delay = result.DeferDelay ?? TimeSpan.Zero;

        if (delay <= TimeSpan.Zero)
        {
            currentStep.Status = PersistentItemStatus.Failed;
            currentStep.ErrorHistory.Add(
                new ErrorEntry(
                    now,
                    $"Command deferred with a non-positive delay ({delay}); deferrals must specify a positive wait.",
                    result.HttpStatusCode,
                    WasRetryable: false
                )
            );
            workflow.BackoffUntil = null;

            Metrics.StepsFailed.Add(1);
            logger.FailingStepInvalidDefer(currentStep, delay);

            return;
        }

        // Overwritten on every deferral — including the one that expires the wait below — so status
        // reads always show the step's latest own words for what it is (or was) waiting for.
        currentStep.LastDeferReason = result.Message is { Length: > 500 } longReason
            ? longReason[..500]
            : result.Message;

        var waitBudget = currentStep.ResolveWaitBudget(_settings);

        if (currentStep.IsFinalWaitCheck(_settings))
        {
            currentStep.Status = PersistentItemStatus.Failed;
            currentStep.ErrorHistory.Add(
                new ErrorEntry(
                    now,
                    $"Wait budget of {waitBudget} exhausted after {currentStep.DeferCount} deferral(s): "
                        + (result.Message ?? "the awaited outcome never became available"),
                    result.HttpStatusCode,
                    WasRetryable: false
                )
            );
            workflow.BackoffUntil = null;
            workflow.FailureReason = "wait_expired";

            Metrics.StepsFailed.Add(1, (TelemetryAttributes.Reason, "wait_expired"));
            logger.FailingStepWaitExpired(currentStep, currentStep.DeferCount, waitBudget);

            return;
        }

        // Floor: a delay below MinStepDeferDelay is raised to it, so a near-zero delay cannot make
        // the step re-run in a tight loop.
        // Ceiling: a delay that overshoots the deadline is cut to end on it rather than rejected,
        // so the step spends its whole budget and gets one last run at the deadline, or
        // immediately if the deadline passed while the run that just deferred was executing.
        var waitDeadline = (currentStep.FirstDeferredAt ?? now).Add(waitBudget);
        var remainingBudget = waitDeadline > now ? waitDeadline - now : TimeSpan.Zero;
        var requestedDelay = delay > _settings.MinStepDeferDelay ? delay : _settings.MinStepDeferDelay;
        var scheduledDelay = requestedDelay < remainingBudget ? requestedDelay : remainingBudget;

        currentStep.DeferCount++;
        currentStep.FirstDeferredAt ??= now;
        currentStep.LastDeferredAt = now;
        currentStep.RequeueCount = 0;
        currentStep.Status = PersistentItemStatus.Waiting;
        workflow.BackoffUntil = now.Add(scheduledDelay);

        Metrics.StepsDeferred.Add(1);
        logger.DeferringStep(currentStep, currentStep.DeferCount, scheduledDelay);
    }

    /// <summary>
    /// Cooperative parking for the failure-storm circuit breaker (see the failure-throttling ADR):
    /// when a step fails a retryable attempt and the workflow's namespace has a tripped breaker in
    /// the <see cref="IThrottleStateView"/> snapshot, the workflow is parked immediately behind
    /// <c>ThrottledUntil = now + window</c>, jittered ±<see cref="ThrottlingSettings.JitterFraction"/>
    /// and clamped per stamp to the step's retry deadline — the exact rule the sweep's parking
    /// applies, so throttling can never cost the workflow its final retry attempt. The normal
    /// Requeued transition and <see cref="Workflow.BackoffUntil"/> are untouched: throttle effects
    /// live only in <see cref="Workflow.ThrottledUntil"/>, keeping them identifiable and undoable.
    /// The sweep decides, the handler applies: this is one read-only dictionary lookup on the
    /// failure path — no database reads, no breaker judgment, no writes to breaker state.
    /// </summary>
    /// <remarks>
    /// Internal for direct unit testing of the deadline guard: through
    /// <see cref="UpdateStepStatusAndRetryDecision"/> the retryable branch is only reachable while
    /// the deadline is still ahead, so the guard only fires when the wall clock crosses the
    /// deadline between the retry decision and this stamp.
    /// </remarks>
    internal void ParkIfNamespaceThrottled(Workflow workflow, RetryStrategy retryStrategy, DateTimeOffset retryAnchor)
    {
        if (!throttleStateView.TrippedBreakers.TryGetValue(workflow.Namespace, out var window))
            return;

        var now = timeProvider.GetUtcNow();
        var deadline = retryStrategy.GetDeadline(retryAnchor);

        // The final attempt is due (or overdue): parking would only delay it for no benefit,
        // so the workflow stays on its normal retry schedule.
        if (deadline <= now)
            return;

        var jitterFactor = 1 + (ThrottlingSettings.JitterFraction * ((2 * Random.Shared.NextDouble()) - 1));
        var throttledUntil = now + (window * jitterFactor);
        if (throttledUntil > deadline)
            throttledUntil = deadline;

        workflow.ThrottledUntil = throttledUntil;

        Metrics.ThrottleHandlerParked.Add(1, (TelemetryAttributes.Namespace, workflow.Namespace));
        logger.ParkingThrottledWorkflow(workflow, throttledUntil);
    }

    private RetryStrategy GetRetryStrategy(Step step) => step.RetryStrategy ?? _settings.DefaultStepRetryStrategy;

    private DateTimeOffset GetExecutionRetryBackoff(Step step, RetryStrategy retryStrategy) =>
        timeProvider.GetUtcNow().Add(retryStrategy.CalculateDelay(step.RequeueCount));

    /// <summary>
    /// Starts the workflow's entry span and makes it the current activity for the rest of <see cref="Handle"/>, so
    /// what the handler logs lands in the workflow's trace rather than the processor's. The change is local to
    /// the handler's async flow: its caller's current activity is back when <see cref="Handle"/> returns.
    /// </summary>
    private static void StartProcessWorkflowActivity(Workflow workflow)
    {
        List<string?> possibleLinks =
        [
            workflow.DistributedTraceContext,
            .. workflow.Dependencies?.Select(x => x.DistributedTraceContext) ?? [],
        ];

        workflow.EngineActivity ??= Metrics.Source.StartLinkedRootActivity(
            "WorkflowHandler.Handle",
            kind: ActivityKind.Consumer,
            links: possibleLinks.Select(Metrics.ParseTraceContext).ToActivityLinks(),
            tags: workflow.GetActivityTags(),
            includeCurrentContext: false
        );
        workflow.EngineTraceContext ??= workflow.EngineActivity?.Id;

        if (workflow.EngineActivity is { } entrySpan)
            Activity.Current = entrySpan;
    }

    private static void StartProcessStepActivity(Workflow workflow, Step step)
    {
        step.EngineActivity ??= Metrics.Source.StartActivity(
            "WorkflowHandler.ProcessStep",
            ActivityKind.Consumer,
            workflow.EngineActivity?.Context ?? default,
            step.GetActivityTags()
        );
        step.EngineTraceContext ??= step.EngineActivity?.Id;
    }

    /// <summary>
    /// Sets the step span's status from the step's outcome: Ok when it completed, Error when it failed. A step
    /// that is requeued or waiting has no outcome yet, so its span is left unset. Must run before
    /// <see cref="StopActivity"/>, which releases the span.
    /// </summary>
    private static void SetStepActivityStatus(Workflow workflow, Step step, ExecutionResult result)
    {
        if (step.Status == PersistentItemStatus.Completed)
            step.EngineActivity?.Succeeded();
        else if (step.Status == PersistentItemStatus.Failed)
            step.EngineActivity?.Errored(errorType: FailureReason(workflow), errorMessage: result.Message);
    }

    /// <summary>
    /// Why a failed workflow failed, as the low-cardinality reason its failure metric and its spans carry.
    /// </summary>
    private static string FailureReason(Workflow workflow) => workflow.FailureReason ?? "execution";

    /// <summary>
    /// Marks a workflow or step span as ended by the loss of the workflow's lease to another host.
    /// </summary>
    private static void MarkLeaseLost(Activity? span) =>
        span?.Errored(errorType: "lease_lost", errorMessage: "Lease lost — workflow reclaimed by another host");

    private static void StopActivity(PersistentItem item)
    {
        if (item.EngineActivity is null)
            return;

        item.EngineActivity.SetEndTime(DateTime.UtcNow);
        item.EngineActivity.Stop();
        item.EngineActivity.Dispose();
        item.EngineActivity = null;
    }

    /// <summary>
    /// When this attempt became runnable: the backoff deadline it waited out, or its creation.
    /// Must be read before the handler advances <see cref="Workflow.BackoffUntil"/> to schedule the
    /// <em>next</em> attempt — otherwise the queue/total durations measured against it go negative.
    /// Clamped to now: the cancellation bypass claims a parked row before its timer elapses, so the
    /// backoff deadline can still be in the future on a legitimate attempt.
    /// </summary>
    private DateTimeOffset AttemptAnchor(Workflow workflow)
    {
        DateTimeOffset anchor = workflow.BackoffUntil ?? workflow.CreatedAt;
        DateTimeOffset now = timeProvider.GetUtcNow();
        return anchor > now ? now : anchor;
    }

    private void RecordWorkflowQueueTime(DateTimeOffset attemptAnchor)
    {
        var queueDuration = timeProvider.GetUtcNow().Subtract(attemptAnchor).TotalSeconds;
        Metrics.WorkflowQueueTime.Record(queueDuration);
    }

    private void RecordWorkflowServiceTime(Workflow workflow)
    {
        var serviceDuration = timeProvider
            .GetUtcNow()
            .Subtract(workflow.ExecutionStartedAt ?? workflow.CreatedAt)
            .TotalSeconds;

        Metrics.WorkflowServiceTime.Record(serviceDuration);
    }

    private void RecordWorkflowTotalTime(DateTimeOffset attemptAnchor)
    {
        var totalDuration = timeProvider.GetUtcNow().Subtract(attemptAnchor).TotalSeconds;
        Metrics.WorkflowTotalTime.Record(totalDuration);
    }

    private void RecordStepQueueTime(Step step, DateTimeOffset anchor)
    {
        var queueDuration = timeProvider.GetUtcNow().Subtract(anchor).TotalSeconds;
        Metrics.StepQueueTime.Record(queueDuration, step.GetHistogramTags());
    }

    private void RecordStepServiceTime(Step step)
    {
        var serviceDuration = timeProvider.GetUtcNow().Subtract(step.ExecutionStartedAt ?? step.CreatedAt).TotalSeconds;

        Metrics.StepServiceTime.Record(serviceDuration, step.GetHistogramTags());
    }

    private void RecordStepTotalTime(Step step, DateTimeOffset anchor)
    {
        var totalDuration = timeProvider.GetUtcNow().Subtract(anchor).TotalSeconds;
        Metrics.StepTotalTime.Record(totalDuration, step.GetHistogramTags());
    }

    /// <summary>
    /// Records how much of its wait budget a deferring step consumed. Only on the transition out of
    /// waiting: while the step is still parked the number would be a partial sum.
    /// </summary>
    private void RecordStepWaitDuration(Step step)
    {
        if (step.FirstDeferredAt is not { } firstDeferredAt || !step.Status.IsDone())
            return;

        var waitDuration = timeProvider.GetUtcNow().Subtract(firstDeferredAt).TotalSeconds;
        Metrics.StepWaitDuration.Record(waitDuration, step.GetHistogramTags());
    }
}

internal static partial class WorkflowHandlerLogs
{
    [LoggerMessage(LogLevel.Debug, "Processing workflow: {Workflow}")]
    internal static partial void ProcessingWorkflow(this ILogger<WorkflowHandler> logger, Workflow workflow);

    [LoggerMessage(LogLevel.Error, "Processing of workflow {Workflow} resulted in an error: {Message}.")]
    internal static partial void WorkflowProcessingFailed(
        this ILogger<WorkflowHandler> logger,
        Workflow workflow,
        string message,
        Exception? ex
    );

    [LoggerMessage(LogLevel.Debug, "Workflow {Workflow} is done")]
    internal static partial void WorkflowCompleted(this ILogger<WorkflowHandler> logger, Workflow workflow);

    [LoggerMessage(LogLevel.Debug, "Step {Step} completed successfully")]
    internal static partial void StepCompletedSuccessfully(this ILogger<WorkflowHandler> logger, Step step);

    [LoggerMessage(LogLevel.Debug, "Step {Step} failed")]
    internal static partial void StepFailed(this ILogger<WorkflowHandler> logger, Step step);

    [LoggerMessage(LogLevel.Debug, "Requeuing step {Step} (Retry count: {Retries})")]
    internal static partial void SlatingStepForRetry(this ILogger<WorkflowHandler> logger, Step step, int retries);

    [LoggerMessage(
        LogLevel.Error,
        "Failing step {Step}. No more retries available after {Retries} attempts (or next run scheduled beyond deadline for step completion)"
    )]
    internal static partial void FailingStepRetries(this ILogger<WorkflowHandler> logger, Step step, int retries);

    [LoggerMessage(
        LogLevel.Error,
        "Failing step {Step} after {Retries} attempts. The operation produced a critical error which cannot be retried"
    )]
    internal static partial void FailingStepCritical(this ILogger<WorkflowHandler> logger, Step step, int retries);

    [LoggerMessage(LogLevel.Information, "Deferring step {Step} (deferral #{Deferrals}); re-executing in {Delay}")]
    internal static partial void DeferringStep(
        this ILogger<WorkflowHandler> logger,
        Step step,
        int deferrals,
        TimeSpan delay
    );

    [LoggerMessage(
        LogLevel.Error,
        "Failing step {Step}. Wait budget of {WaitBudget} exhausted after {Deferrals} deferral(s) — the awaited outcome never became available"
    )]
    internal static partial void FailingStepWaitExpired(
        this ILogger<WorkflowHandler> logger,
        Step step,
        int deferrals,
        TimeSpan waitBudget
    );

    [LoggerMessage(
        LogLevel.Error,
        "Failing step {Step}. The command deferred with a non-positive delay ({Delay}), which is not allowed"
    )]
    internal static partial void FailingStepInvalidDefer(
        this ILogger<WorkflowHandler> logger,
        Step step,
        TimeSpan delay
    );

    [LoggerMessage(
        LogLevel.Warning,
        "Lease lost for workflow {Workflow} — another host has reclaimed it; exiting local processing without retry"
    )]
    internal static partial void WorkflowLeaseLost(this ILogger<WorkflowHandler> logger, Workflow workflow);

    [LoggerMessage(
        LogLevel.Debug,
        "Parking workflow {Workflow} until {ThrottledUntil} — its namespace has a tripped throttle breaker"
    )]
    internal static partial void ParkingThrottledWorkflow(
        this ILogger<WorkflowHandler> logger,
        Workflow workflow,
        DateTimeOffset throttledUntil
    );
}
