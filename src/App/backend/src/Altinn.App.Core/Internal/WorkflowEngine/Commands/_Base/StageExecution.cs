using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// What every command that runs a pipeline stage shares: the context a stage gets, and how its result becomes the
/// step's. A lifecycle stage and a service task stage are the same work; only what happens around them differs.
/// </summary>
internal static class StageExecution
{
    /// <summary>Reason code for a failure a lifecycle stage reported. Operator-visible.</summary>
    internal const string FailedReasonCode = "ProcessTaskStageFailedException";

    /// <summary>
    /// The step's stage payload. A step enqueued by a version from before lifecycle stages carries none: that
    /// version ran the whole lifecycle as one step, so the step is run that way here, as a payload with no stage
    /// index. A payload of another type is invalid, as for any command.
    /// </summary>
    public static ProcessTaskStagePayload? ResolvePayload(ProcessEngineCommandContext context) =>
        context.Payload.Payload is null
            ? new ProcessTaskStagePayload(StageIndex: null)
            : CommandPayloadSerializer.Deserialize<CommandRequestPayload>(context.Payload.Payload)
                as ProcessTaskStagePayload;

    /// <summary>
    /// Runs the stage the step names, or every stage in order when the step names none (see
    /// <see cref="ResolvePayload"/>), and reports the outcome as the step's. A stage index the pipeline no longer
    /// has fails permanently: the pipeline was reshaped while this workflow was in flight, and running whatever
    /// stage now sits at that position could do the wrong work. The step's messages name the lifecycle
    /// <paramref name="phase"/> (<c>start</c>, <c>end</c> or <c>abandon</c>) and the task type.
    /// </summary>
    public static async Task<ProcessEngineCommandResult> Run(
        Pipeline pipeline,
        ProcessTaskStagePayload payload,
        ProcessEngineCommandContext context,
        string phase,
        string? altinnTaskType
    )
    {
        IReadOnlyList<PipelineStage.Plain> stages = pipeline.Stages;
        StageContext stageContext = CreateContext(context);

        if (payload.StageIndex is not { } stageIndex)
        {
            for (int index = 0; index < stages.Count; index++)
            {
                ProcessEngineCommandResult result = await RunStage(stages[index], index);
                if (result is not SuccessfulProcessEngineCommandResult)
                {
                    return result;
                }
            }
            return new SuccessfulProcessEngineCommandResult();
        }

        if (stages.ElementAtOrDefault(stageIndex) is not { } stage)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"Task type '{altinnTaskType}' composes no {phase} stage at index {stageIndex}. A pipeline's indexes "
                    + "are positions in its composition: if stages were inserted, reordered or removed since this "
                    + "workflow was enqueued, every index behind the change has moved. Resume the workflow on the "
                    + "code that enqueued it, or abandon it deliberately.",
                "ProcessTaskStageNotFound"
            );
        }
        return await RunStage(stage, stageIndex);

        async Task<ProcessEngineCommandResult> RunStage(PipelineStage.Plain stage, int index) =>
            MapResult(
                await stage.Work(stageContext),
                message => $"Task type '{altinnTaskType}' {phase} stage {index} failed: {message}",
                FailedReasonCode
            );
    }

    /// <summary>
    /// The context for a stage run by this step: the instance data, the step's identity, and the engine's record of
    /// how many times the step has been attempted and how long it has waited.
    /// </summary>
    public static StageContext CreateContext(ProcessEngineCommandContext context) =>
        new()
        {
            InstanceDataMutator = context.InstanceDataMutator,
            CancellationToken = context.CancellationToken,
            WorkflowId = context.Payload.WorkflowId,
            StepId = context.Payload.StepId,
            ExecutionReferenceTime = context.Payload.ExecutionReferenceTime,
            Attempt = new StageAttempt
            {
                RetryCount = context.Payload.RetryCount,
                Deadline = context.Payload.ExecutionDeadline,
            },
            Wait = new StageWait
            {
                DeferCount = context.Payload.DeferCount,
                StartedAt = context.Payload.FirstDeferredAt,
                Deadline = context.Payload.WaitDeadline,
                IsFinalCheck = context.Payload.IsFinalWaitCheck,
            },
        };

    /// <summary>
    /// The step's result for a stage that completed, deferred or failed. <paramref name="describeFailure"/> turns
    /// the stage's error message into the step's, naming what failed.
    /// </summary>
    public static ProcessEngineCommandResult MapResult(
        StageResult result,
        Func<string, string> describeFailure,
        string failureReasonCode
    ) =>
        result switch
        {
            CompletedStageResult => new SuccessfulProcessEngineCommandResult(),
            DeferredStageResult deferred => new DeferredProcessEngineCommandResult
            {
                Delay = deferred.Delay,
                Reason = deferred.Reason,
            },
            FailedStageResult { Kind: FailureKind.Permanent } failed => FailedProcessEngineCommandResult.Permanent(
                describeFailure(failed.ErrorMessage),
                failureReasonCode
            ),
            FailedStageResult failed => FailedProcessEngineCommandResult.Retryable(
                describeFailure(failed.ErrorMessage),
                failureReasonCode
            ),
            // An author's own result type is an error no retry fixes; a throw here would be caught by the command
            // and retried until the budget runs out, repeating the stage's calls each time.
            _ => FailedProcessEngineCommandResult.Permanent(
                describeFailure(
                    $"returned a result of type '{result.GetType().Name}', which this version of the app-lib "
                        + $"cannot act on. Return one of the results {nameof(StageResult)}'s factory methods produce "
                        + $"({nameof(StageResult.Completed)}, {nameof(StageResult.Defer)}, "
                        + $"{nameof(StageResult.FailedRetryable)} or {nameof(StageResult.FailedPermanent)}), never a "
                        + "type of your own."
                ),
                UnknownResultReasonCode
            ),
        };

    /// <summary>Reason code for a stage result the app-lib cannot act on. Operator-visible.</summary>
    internal const string UnknownResultReasonCode = "ProcessTaskStageResultUnknown";
}
