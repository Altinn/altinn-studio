using System.Diagnostics;
using Altinn.Studio.Runtime.Common;
using Microsoft.Extensions.Options;
using WorkflowEngine.Models;
using WorkflowEngine.Models.Extensions;
using WorkflowEngine.Resilience.Extensions;
using WorkflowEngine.Resilience.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core;

/// <summary>
/// Handles processing a single workflow to completion. Executes steps sequentially,
/// applies retry/backoff logic, and submits dirty state to the <see cref="StatusWriteBuffer"/>.
/// </summary>
internal sealed class WorkflowHandler(
    IWorkflowExecutor executor,
    StatusWriteBuffer statusWriteBuffer,
    IOptions<EngineSettings> settings,
    TimeProvider timeProvider,
    ILogger<WorkflowHandler> logger
)
{
    private readonly EngineSettings _settings = settings.Value;

    /// <summary>
    /// Processes a workflow through all its steps. On return, the workflow's <see cref="Workflow.Status"/>
    /// reflects the final outcome (Completed, Failed, or Requeued for retry).
    /// </summary>
    public async Task HandleAsync(Workflow workflow, CancellationToken ct)
    {
        StartProcessWorkflowActivity(workflow);

        Assert.That(workflow.Status == PersistentItemStatus.Processing);
        workflow.ExecutionStartedAt = timeProvider.GetUtcNow();

        RecordWorkflowQueueTime(workflow);

        if (
            workflow.Dependencies?.Any(x =>
                x.Status == PersistentItemStatus.Failed || x.Status == PersistentItemStatus.DependencyFailed
            )
            is true
        )
        {
            workflow.Status = PersistentItemStatus.DependencyFailed;

            RecordWorkflowServiceTime(workflow);
            RecordWorkflowTotalTime(workflow);

            Metrics.WorkflowsFailed.Add(1);

            await statusWriteBuffer.SubmitAsync(workflow, CancellationToken.None);

            return;
        }

        try
        {
            await ProcessSteps(workflow, ct);
        }
        catch (OperationCanceledException) when (ct.IsCancellationRequested)
        {
            workflow.EngineActivity?.Errored(errorMessage: "Cancelled during processing");
            StopActivity(workflow);

            if (workflow.Status == PersistentItemStatus.Processing)
            {
                workflow.Status = PersistentItemStatus.Requeued;
            }
            await statusWriteBuffer.SubmitAsync(workflow, CancellationToken.None);

            throw;
        }
        catch (Exception ex)
        {
            workflow.Status = PersistentItemStatus.Failed;
            workflow.EngineActivity?.Errored(ex);

            logger.WorkflowProcessingFailed(workflow, ex.Message, ex);

            Metrics.Errors.Add(
                1,
                ("operation", "workflowProcessing"),
                ("target", workflow.Namespace),
                ("operationId", workflow.OperationId)
            );

            await statusWriteBuffer.SubmitAsync(workflow, CancellationToken.None);

            StopActivity(workflow);
            return;
        }

        workflow.Status = workflow.OverallStatus();

        if (workflow.Status == PersistentItemStatus.Completed)
        {
            RecordWorkflowServiceTime(workflow);
            RecordWorkflowTotalTime(workflow);

            Metrics.WorkflowsSucceeded.Add(1);
            logger.WorkflowCompleted(workflow);
        }
        else if (workflow.Status == PersistentItemStatus.Failed)
        {
            RecordWorkflowServiceTime(workflow);
            RecordWorkflowTotalTime(workflow);

            Metrics.WorkflowsFailed.Add(1);
        }

        await statusWriteBuffer.SubmitAsync(workflow, ct);

        StopActivity(workflow);
    }

    private async Task ProcessSteps(Workflow workflow, CancellationToken ct)
    {
        for (int i = 0; i < workflow.Steps.Count; i++)
        {
            ct.ThrowIfCancellationRequested();
            var step = workflow.Steps[i];
            var previous = i > 0 ? workflow.Steps[i - 1] : null;

            // Step is already complete (from a previous processing round after requeue)
            if (step.IsComplete())
            {
                continue;
            }

            // Wait for backoff if needed (step was requeued with a backoff timer)
            if (step.BackoffUntil is { } backoff)
            {
                var delay = backoff - timeProvider.GetUtcNow();
                if (delay > TimeSpan.Zero)
                {
                    await Task.Delay(delay, ct);
                }
            }

            StartProcessStepActivity(workflow, step);

            RecordStepQueueTime(step);

            step.Status = PersistentItemStatus.Processing;
            step.ExecutionStartedAt = timeProvider.GetUtcNow();

            ExecutionResult result;
            try
            {
                result = await executor.Execute(workflow, step, ct);
            }
            catch (OperationCanceledException) when (ct.IsCancellationRequested)
            {
                StopActivity(step);
                throw;
            }
            catch (Exception e)
            {
                throw new UnreachableException(null, e);
            }

            UpdateStepStatusAndRetryDecision(step, previous, result);

            step.UpdatedAt = timeProvider.GetUtcNow();
            step.HasPendingChanges = true;

            RecordStepServiceTime(step);
            RecordStepTotalTime(step, previous);
            StopActivity(step);

            if (step.Status == PersistentItemStatus.Completed)
            {
                continue;
            }

            // TODO: Retry in-memory if short backoff
            if (step.Status == PersistentItemStatus.Requeued)
            {
                break;
            }

            if (step.Status == PersistentItemStatus.Failed)
            {
                break;
            }

            throw new UnreachableException();
        }
    }

    /// <summary>
    /// Determines the outcome of a step execution and applies retry/backoff if appropriate.
    /// </summary>
    private void UpdateStepStatusAndRetryDecision(Step currentStep, Step? previousStep, ExecutionResult result)
    {
        if (result.IsSuccess())
        {
            currentStep.Status = PersistentItemStatus.Completed;
            currentStep.LastError = null;

            Metrics.StepsSucceeded.Add(1);
            logger.StepCompletedSuccessfully(currentStep);

            return;
        }

        if (result.IsCriticalError() || result.IsCanceled())
        {
            currentStep.Status = PersistentItemStatus.Failed;
            currentStep.BackoffUntil = null;
            currentStep.LastError = result.Message ?? (result.IsCanceled() ? "Canceled" : null);

            Metrics.StepsFailed.Add(1);
            logger.FailingStepCritical(currentStep, currentStep.RequeueCount);

            return;
        }

        logger.StepFailed(currentStep);
        var retryStrategy = GetRetryStrategy(currentStep);
        var initialStartTime = previousStep?.UpdatedAt ?? currentStep.CreatedAt;

        if (retryStrategy.CanRetry(currentStep.RequeueCount + 1, initialStartTime, timeProvider))
        {
            currentStep.RequeueCount++;
            currentStep.Status = PersistentItemStatus.Requeued;
            currentStep.BackoffUntil = GetExecutionRetryBackoff(currentStep, retryStrategy);
            currentStep.LastError = result.Message;

            Metrics.StepsRequeued.Add(1);
            logger.SlatingStepForRetry(currentStep, currentStep.RequeueCount);

            return;
        }

        // No more retries
        currentStep.Status = PersistentItemStatus.Failed;
        currentStep.BackoffUntil = null;
        currentStep.LastError = result.Message;

        Metrics.StepsFailed.Add(1);
        logger.FailingStepRetries(currentStep, currentStep.RequeueCount);
    }

    private RetryStrategy GetRetryStrategy(Step step) => step.RetryStrategy ?? _settings.DefaultStepRetryStrategy;

    private DateTimeOffset GetExecutionRetryBackoff(Step step, RetryStrategy retryStrategy) =>
        timeProvider.GetUtcNow().Add(retryStrategy.CalculateDelay(step.RequeueCount));

    private static void StartProcessWorkflowActivity(Workflow workflow)
    {
        workflow.EngineActivity ??= Metrics.Source.StartLinkedRootActivity(
            "WorkflowHandler.HandleAsync",
            kind: ActivityKind.Consumer,
            links: Metrics.ParseTraceContext(workflow.DistributedTraceContext).ToActivityLinks(),
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
        var queueDuration = workflow.OrderedSteps().First().GetQueueDeltaTime(timeProvider).TotalSeconds;
        Metrics.WorkflowQueueTime.Record(queueDuration, workflow.GetHistorgramTags());
    }

    private void RecordWorkflowServiceTime(Workflow workflow)
    {
        var serviceDuration = timeProvider
            .GetUtcNow()
            .Subtract(workflow.ExecutionStartedAt ?? workflow.CreatedAt)
            .TotalSeconds;

        Metrics.WorkflowServiceTime.Record(serviceDuration, workflow.GetHistorgramTags());
    }

    private void RecordWorkflowTotalTime(Workflow workflow)
    {
        var scheduledStart = workflow.StartAt ?? workflow.CreatedAt;
        var totalDuration = timeProvider.GetUtcNow().Subtract(scheduledStart).TotalSeconds;
        Metrics.WorkflowTotalTime.Record(totalDuration, workflow.GetHistorgramTags());
    }

    private void RecordStepQueueTime(Step step)
    {
        var queueDuration = step.GetQueueDeltaTime(timeProvider).TotalSeconds;
        Metrics.StepQueueTime.Record(queueDuration, step.GetHistorgramTags());
    }

    private void RecordStepServiceTime(Step step)
    {
        var serviceDuration = timeProvider.GetUtcNow().Subtract(step.ExecutionStartedAt ?? step.CreatedAt).TotalSeconds;

        Metrics.StepServiceTime.Record(serviceDuration, step.GetHistorgramTags());
    }

    private void RecordStepTotalTime(Step currentStep, Step? previousStep)
    {
        var totalDuration = timeProvider
            .GetUtcNow()
            .Subtract(previousStep?.UpdatedAt ?? currentStep.CreatedAt)
            .TotalSeconds;

        Metrics.StepTotalTime.Record(totalDuration, currentStep.GetHistorgramTags());
    }
}

/// <summary>
/// Source-generated log messages for <see cref="WorkflowHandler"/>.
/// </summary>
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
}
