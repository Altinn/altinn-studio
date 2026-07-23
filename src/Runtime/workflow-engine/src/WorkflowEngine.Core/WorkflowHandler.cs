using System.Diagnostics;
using Altinn.Studio.Runtime.Common;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using WorkflowEngine.Data.Constants;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Models.Extensions;
using WorkflowEngine.Resilience.Extensions;
using WorkflowEngine.Resilience.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

// S3878: This is required to avoid nullability mismatch in call to Metrics.Errors.Add()
#pragma warning disable S3878

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
        Metrics.WorkflowsLeaseLost.Add(1, workflow.GetHistogramTags());

        // Steps run sequentially so at most one span is open, but a per-step Submit that
        // throws LeaseLostException unwinds past the per-step StopActivity. Loop to catch it.
        foreach (var step in workflow.Steps)
        {
            if (step.EngineActivity is null)
                continue;

            step.EngineActivity.Errored(errorMessage: "Lease lost — workflow reclaimed by another host");
            StopActivity(step);
        }

        workflow.EngineActivity?.Errored(errorMessage: "Lease lost — workflow reclaimed by another host");
    }

    private async Task ProcessWorkflow(Workflow workflow, CancellationToken ct)
    {
        Assert.That(workflow.Status == PersistentItemStatus.Processing);
        workflow.ExecutionStartedAt = timeProvider.GetUtcNow();

        RecordWorkflowQueueTime(workflow);

        if (workflow.CancellationRequestedAt is not null)
        {
            workflow.Status = PersistentItemStatus.Canceled;
            workflow.EngineActivity?.Errored(errorMessage: "Canceled before processing started");

            Metrics.WorkflowsCanceled.Add(1, ("reason", "before_processing"));
            RecordWorkflowServiceTime(workflow);
            RecordWorkflowTotalTime(workflow);

            await statusWriteBuffer.Submit(workflow, CancellationToken.None);

            return;
        }

        // Abandoned is deliberately not in the Failed set: a dependency whose failure has been
        // explicitly written off no longer condemns its dependents.
        if (workflow.Dependencies?.Any(x => PersistentItemStatusMap.Failed.Contains(x.Status)) is true)
        {
            workflow.Status = PersistentItemStatus.DependencyFailed;

            RecordWorkflowServiceTime(workflow);
            RecordWorkflowTotalTime(workflow);

            Metrics.WorkflowsFailed.Add(1, ("reason", "dependency_failed"));

            await statusWriteBuffer.Submit(workflow, CancellationToken.None);

            return;
        }

        try
        {
            await ProcessSteps(workflow, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            workflow.EngineActivity?.Errored(errorMessage: "Canceled during processing");

            if (workflow.Status == PersistentItemStatus.Processing)
            {
                if (workflow.CancellationRequestedAt is not null)
                {
                    workflow.Status = PersistentItemStatus.Canceled;
                    Metrics.WorkflowsCanceled.Add(1, ("reason", "during_processing"));
                    RecordWorkflowServiceTime(workflow);
                    RecordWorkflowTotalTime(workflow);
                }
                else
                {
                    workflow.Status = PersistentItemStatus.Requeued;
                    Metrics.WorkflowsRequeued.Add(1, ("reason", "shutdown"));
                    RecordWorkflowServiceTime(workflow);
                    RecordWorkflowTotalTime(workflow);
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
                    ("operation", "workflowProcessing"),
                    ("target", workflow.Namespace),
                    ("operationId", workflow.OperationId),
                ]
            );

            await statusWriteBuffer.Submit(workflow, CancellationToken.None);

            return;
        }

        workflow.Status = workflow.OverallStatus();

        if (workflow.Status == PersistentItemStatus.Completed)
        {
            RecordWorkflowServiceTime(workflow);
            RecordWorkflowTotalTime(workflow);

            Metrics.WorkflowsSucceeded.Add(1);
            workflow.EngineActivity?.Succeeded();
            logger.WorkflowCompleted(workflow);
        }
        else if (workflow.Status == PersistentItemStatus.Failed)
        {
            RecordWorkflowServiceTime(workflow);
            RecordWorkflowTotalTime(workflow);

            workflow.EngineActivity?.Errored();
            Metrics.WorkflowsFailed.Add(1, ("reason", workflow.FailureReason ?? "execution"));
        }
        else if (workflow.Status == PersistentItemStatus.Requeued)
        {
            RecordWorkflowServiceTime(workflow);
            RecordWorkflowTotalTime(workflow);

            Metrics.WorkflowsRequeued.Add(1, ("reason", "step_retry"));
        }
        else if (workflow.Status == PersistentItemStatus.Waiting)
        {
            RecordWorkflowServiceTime(workflow);
            RecordWorkflowTotalTime(workflow);

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

            StartProcessStepActivity(workflow, step);

            RecordStepQueueTime(step, queueAnchor);

            step.Status = PersistentItemStatus.Processing;
            step.ExecutionStartedAt = timeProvider.GetUtcNow();

            statusWriteBuffer.SubmitAndForget(
                workflow,
                ct,
                dirtySteps: [step],
                reason: "step.started",
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

                StopActivity(step);
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
                reason: "step.completed",
                parentActivity: step.EngineActivity
            );

            RecordStepServiceTime(step);
            RecordStepTotalTime(step, queueAnchor);
            StopActivity(step);

            queueAnchor = step.UpdatedAt ?? throw new UnreachableException();

            if (step.Status == PersistentItemStatus.Completed)
            {
                step.EngineActivity?.Succeeded();
                continue;
            }

            if (step.Status == PersistentItemStatus.Requeued)
            {
                break;
            }

            if (step.Status == PersistentItemStatus.Waiting)
            {
                break;
            }

            if (step.Status == PersistentItemStatus.Failed)
            {
                step.EngineActivity?.Errored(errorMessage: result.Message);
                break;
            }

            throw new UnreachableException();
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

        // After a deferral the retry deadline anchors on the last defer write-back (UpdatedAt)
        // instead of the step's original activation — otherwise a long wait would silently
        // consume the entire retry MaxDuration before the first genuine error even occurs.
        var initialStartTime =
            currentStep.DeferCount > 0
                ? currentStep.UpdatedAt ?? currentStep.CreatedAt
                : previousStep?.UpdatedAt ?? currentStep.CreatedAt;

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
    /// execution via the workflow's <c>BackoffUntil</c>, or fails the step when the requested delay
    /// would overrun its wait budget. A deferral is a successful execution: it records no error
    /// history and resets the retry counter, so <see cref="RetryStrategy"/> bounds consecutive
    /// failures between deferrals rather than failures across the step's lifetime.
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

        var waitBudget = currentStep.Command.MaxWaitDuration ?? _settings.DefaultStepWaitDuration;
        var waitDeadline = (currentStep.WaitingSince ?? now).Add(waitBudget);

        if (now.Add(delay) >= waitDeadline)
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

            Metrics.StepsFailed.Add(1, ("reason", "wait_expired"));
            logger.FailingStepWaitExpired(currentStep, currentStep.DeferCount, waitBudget);

            return;
        }

        currentStep.DeferCount++;
        currentStep.WaitingSince ??= now;
        currentStep.RequeueCount = 0;
        currentStep.Status = PersistentItemStatus.Waiting;
        workflow.BackoffUntil = now.Add(delay);

        Metrics.StepsDeferred.Add(1);
        logger.DeferringStep(currentStep, currentStep.DeferCount, delay);
    }

    private RetryStrategy GetRetryStrategy(Step step) => step.RetryStrategy ?? _settings.DefaultStepRetryStrategy;

    private DateTimeOffset GetExecutionRetryBackoff(Step step, RetryStrategy retryStrategy) =>
        timeProvider.GetUtcNow().Add(retryStrategy.CalculateDelay(step.RequeueCount));

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
    }

    private static void StartProcessStepActivity(Workflow workflow, Step step)
    {
        step.EngineActivity ??= Metrics.Source.StartActivity(
            $"WorkflowHandler.ProcessStep.{step.OperationId}",
            ActivityKind.Consumer,
            workflow.EngineActivity?.Context ?? default,
            step.GetActivityTags()
        );
        step.EngineTraceContext ??= step.EngineActivity?.Id;
    }

    private static void StopActivity(PersistentItem item)
    {
        if (item.EngineActivity is null)
            return;

        item.EngineActivity.SetEndTime(DateTime.UtcNow);
        item.EngineActivity.Stop();
        item.EngineActivity.Dispose();
        item.EngineActivity = null;
    }

    private void RecordWorkflowQueueTime(Workflow workflow)
    {
        var latest = workflow.BackoffUntil ?? workflow.CreatedAt;
        var queueDuration = timeProvider.GetUtcNow().Subtract(latest).TotalSeconds;
        Metrics.WorkflowQueueTime.Record(queueDuration, workflow.GetHistogramTags());
    }

    private void RecordWorkflowServiceTime(Workflow workflow)
    {
        var serviceDuration = timeProvider
            .GetUtcNow()
            .Subtract(workflow.ExecutionStartedAt ?? workflow.CreatedAt)
            .TotalSeconds;

        Metrics.WorkflowServiceTime.Record(serviceDuration, workflow.GetHistogramTags());
    }

    private void RecordWorkflowTotalTime(Workflow workflow)
    {
        var anchor = workflow.BackoffUntil ?? workflow.CreatedAt;
        var totalDuration = timeProvider.GetUtcNow().Subtract(anchor).TotalSeconds;
        Metrics.WorkflowTotalTime.Record(totalDuration, workflow.GetHistogramTags());
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
}
