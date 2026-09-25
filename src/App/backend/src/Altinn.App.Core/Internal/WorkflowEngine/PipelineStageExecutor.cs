using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Executes ordinary work without lifecycle ownership or service-task conclusion semantics. The callback
/// controller remains the only persistence boundary. The containing pipeline handles any continuation.
/// </summary>
internal static class PipelineStageExecutor
{
    internal static async Task<ProcessEngineCommandResult> Execute(
        ProcessPipelineStage stage,
        AppImplementationFactory factory,
        ProcessEngineCommandContext context
    )
    {
        ProcessEngineCommandResult result = await stage.Execute(factory, context);
        return result switch
        {
            SuccessfulProcessEngineCommandResult { ProcessNextContinuation: null, MailboxContinuation: null } => result,
            FailedProcessEngineCommandResult { MailboxContinuation: null } => result,
            DeferredProcessEngineCommandResult => result,
            _ => ProcessEngineCommandResult.FailedPermanent(
                "An ordinary pipeline stage must complete, fail or defer; it cannot conclude a process task.",
                "InvalidStageResult"
            ),
        };
    }

    internal static ServiceTaskContext ServiceContext(ProcessEngineCommandContext context) =>
        new()
        {
            InstanceDataMutator = context.InstanceDataMutator,
            CancellationToken = context.CancellationToken,
            WorkflowId = context.WorkflowId,
            StepId = context.StepId,
            ExecutionReferenceTime = context.ExecutionReferenceTime,
            Attempt = new ServiceTaskAttempt
            {
                RetryCount = context.Payload.RetryCount,
                Deadline = context.Payload.ExecutionDeadline,
            },
            Wait = new ServiceTaskWait
            {
                DeferCount = context.Payload.DeferCount,
                StartedAt = context.Payload.FirstDeferredAt,
                Deadline = context.Payload.WaitDeadline,
            },
        };

    internal static ProcessEngineCommandResult ServiceResult(ServiceTaskStageResult result, string taskType) =>
        result switch
        {
            CompletedServiceTaskStageResult => ProcessEngineCommandResult.Completed(),
            DeferredServiceTaskStageResult deferred => new DeferredProcessEngineCommandResult
            {
                Delay = deferred.Delay,
                Reason = deferred.Reason,
            },
            FailedServiceTaskStageResult { Kind: FailureKind.Permanent } failed =>
                ProcessEngineCommandResult.FailedPermanent(
                    ExecuteServiceTask.FailedMessage(taskType, failed.ErrorMessage),
                    ExecuteServiceTask.FailureCode(failed.ErrorCode)
                ),
            FailedServiceTaskStageResult failed => ProcessEngineCommandResult.FailedRetryable(
                ExecuteServiceTask.FailedMessage(taskType, failed.ErrorMessage),
                ExecuteServiceTask.FailureCode(failed.ErrorCode)
            ),
            _ => ProcessEngineCommandResult.FailedPermanent(
                $"Service task '{taskType}' returned an unsupported stage result '{result?.GetType().Name ?? "null"}'.",
                "ServiceTaskResultUnknown"
            ),
        };
}
