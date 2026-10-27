using System.Diagnostics;
using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// What every command that runs a pipeline stage shares: the context a stage gets, and how its result becomes the
/// step's. A lifecycle stage and a service task stage are the same work; only what happens around them differs.
/// </summary>
internal static class StageExecution
{
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
            _ => throw new UnreachableException($"Unknown stage result type: {result.GetType().Name}"),
        };
}
