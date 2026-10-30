using System.Buffers.Binary;
using System.Security.Cryptography;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;

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
    /// Reason code for a stage that deferred in a step that runs every stage, after the stages before it ran.
    /// Operator-visible.
    /// </summary>
    internal const string DeferredAfterOtherStagesReasonCode = "ProcessTaskStageDeferredAfterOthers";

    /// <summary>
    /// The step's stage payload. A step enqueued by a version from before lifecycle stages carries none: that
    /// version ran the whole lifecycle as one step, so the step is run that way here, as a payload with no stage
    /// index. A payload of another type is invalid, as for any command.
    /// </summary>
    public static ProcessTaskStagePayload? ResolvePayload(WorkflowEngineCommandContext context) =>
        context.Payload.Payload is null
            ? new ProcessTaskStagePayload(StageIndex: null)
            : CommandPayloadSerializer.Deserialize<CommandRequestPayload>(context.Payload.Payload)
                as ProcessTaskStagePayload;

    /// <summary>
    /// Runs the stage the step names and reports the outcome as the step's. A stage index the pipeline no longer
    /// has fails permanently: the pipeline was reshaped while this workflow was in flight, and running whatever
    /// stage now sits at that position could do the wrong work. The step's messages name the lifecycle
    /// <paramref name="phase"/> and the task type.
    /// </summary>
    /// <remarks>
    /// A step that names no stage (see <see cref="ResolvePayload"/>) runs every stage in order, as the version that
    /// enqueued it ran the whole lifecycle. The step cannot save between the stages, which bounds what they get.
    /// The first stage runs under the step's id and each later one under an id derived from it and the stage's
    /// position, the same on every attempt of the step and distinct from the others', so calls keyed on
    /// <see cref="StageContext.StepId"/> stay apart. Only the first stage can defer: a deferral discards what the
    /// stages before it changed, so a later stage that defers fails the step permanently instead.
    /// </remarks>
    public static async Task<WorkflowEngineCommandResult> Run(
        ProcessTaskPipeline pipeline,
        ProcessTaskStagePayload payload,
        WorkflowEngineCommandContext context,
        LifecyclePhase phase,
        string? altinnTaskType
    )
    {
        IReadOnlyList<PipelineStage.Plain> stages = pipeline.Stages;
        StageContext stageContext = CreateContext(context);

        if (payload.StageIndex is not { } stageIndex)
        {
            for (int index = 0; index < stages.Count; index++)
            {
                StageContext stageOwnContext = stageContext with
                {
                    StepId = StepIdForStage(stageContext.StepId, index),
                };
                WorkflowEngineCommandResult result = await RunStage(stages[index], index, stageOwnContext);
                switch (result)
                {
                    case SuccessfulWorkflowEngineCommandResult:
                        continue;
                    case DeferredWorkflowEngineCommandResult when index > 0:
                        return FailedWorkflowEngineCommandResult.Permanent(
                            $"Task type '{altinnTaskType}' {phase.Name()} stage {index} deferred after the stages "
                                + "before it ran. This step was enqueued before the task composed stages and runs "
                                + "every stage without saving in between, so a deferral would discard what they "
                                + "changed. Resume the workflow on the code that enqueued it, or abandon it "
                                + "deliberately; a transition started on this code runs each stage as a step of its "
                                + "own.",
                            DeferredAfterOtherStagesReasonCode
                        );
                    default:
                        return result;
                }
            }
            return new SuccessfulWorkflowEngineCommandResult();
        }

        if (stages.ElementAtOrDefault(stageIndex) is not { } stage)
        {
            return FailedWorkflowEngineCommandResult.Permanent(
                $"Task type '{altinnTaskType}' composes no {phase.Name()} stage at index {stageIndex}. A pipeline's "
                    + "indexes are positions in its composition: if stages were inserted, reordered or removed since this "
                    + "workflow was enqueued, every index behind the change has moved. Resume the workflow on the "
                    + "code that enqueued it, or abandon it deliberately.",
                "ProcessTaskStageNotFound"
            );
        }
        return await RunStage(stage, stageIndex, stageContext);

        async Task<WorkflowEngineCommandResult> RunStage(PipelineStage.Plain stage, int index, StageContext context) =>
            MapResult(
                await stage.Work(context),
                message => $"Task type '{altinnTaskType}' {phase.Name()} stage {index} failed: {message}",
                FailedReasonCode
            );
    }

    /// <summary>
    /// The id a stage runs under when one step runs every stage: the step's own for the first stage, and for each
    /// later one an id derived from the step's and the stage's position, so that the stages' ids differ from each
    /// other and are the same every time the step is attempted.
    /// </summary>
    internal static Guid StepIdForStage(Guid stepId, int index)
    {
        if (index == 0)
        {
            return stepId;
        }

        Span<byte> input = stackalloc byte[20];
        stepId.TryWriteBytes(input);
        BinaryPrimitives.WriteInt32LittleEndian(input[16..], index);
        Span<byte> hash = stackalloc byte[SHA256.HashSizeInBytes];
        SHA256.HashData(input, hash);
        return new Guid(hash[..16]);
    }

    /// <summary>
    /// The context for a stage run by this step: the instance data, the step's identity, and the engine's record of
    /// how many times the step has been attempted and how long it has waited.
    /// </summary>
    public static StageContext CreateContext(WorkflowEngineCommandContext context) =>
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
    public static WorkflowEngineCommandResult MapResult(
        StageResult result,
        Func<string, string> describeFailure,
        string failureReasonCode
    ) =>
        result switch
        {
            CompletedStageResult => new SuccessfulWorkflowEngineCommandResult(),
            DeferredStageResult deferred => new DeferredWorkflowEngineCommandResult
            {
                Delay = deferred.Delay,
                Reason = deferred.Reason,
            },
            FailedStageResult { Kind: FailureKind.Permanent } failed => FailedWorkflowEngineCommandResult.Permanent(
                describeFailure(failed.ErrorMessage),
                failureReasonCode
            ),
            FailedStageResult failed => FailedWorkflowEngineCommandResult.Retryable(
                describeFailure(failed.ErrorMessage),
                failureReasonCode
            ),
            // An author's own result type is an error no retry fixes; a throw here would be caught by the command
            // and retried until the budget runs out, repeating the stage's calls each time.
            // The same for null, which the pattern above also routes here.
            _ => FailedWorkflowEngineCommandResult.Permanent(
                describeFailure(
                    $"returned {DescribeResult(result)}, which this version of the app-lib cannot act on. Return one "
                        + $"of the results {nameof(StageResult)}'s factory methods produce "
                        + $"({nameof(StageResult.Completed)}, {nameof(StageResult.Defer)}, "
                        + $"{nameof(StageResult.FailedRetryable)} or {nameof(StageResult.FailedPermanent)}), never a "
                        + "type of your own and never null."
                ),
                UnknownResultReasonCode
            ),
        };

    /// <summary>
    /// How a result the app-lib cannot act on is named in the step's failure: by its type, or as null, which a
    /// stage can return despite the annotations and which must not throw on the way to the failure.
    /// </summary>
    internal static string DescribeResult(object? result) =>
        result is null ? "null" : $"a result of type '{result.GetType().Name}'";

    /// <summary>Reason code for a stage result the app-lib cannot act on. Operator-visible.</summary>
    internal const string UnknownResultReasonCode = "ProcessTaskStageResultUnknown";
}
