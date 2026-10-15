using System.Diagnostics;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.WorkflowEngine.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for the ExecuteSideEffect command: the side effect, the one pipeline item this engine step
/// runs, and the input the side effect was enqueued with. Every step of the side effect's workflow carries the
/// same input.
/// </summary>
/// <remarks>
/// <see cref="ItemIndex"/> is nullable for the reason <see cref="ExecuteServiceTaskPayload.ItemIndex"/> is: a
/// missing index must be a legible permanent failure, not item 0.
/// </remarks>
internal sealed record ExecuteSideEffectPayload(string SideEffect, int? ItemIndex = null, string? Arguments = null)
    : CommandRequestPayload;

/// <summary>
/// Runs one item of a side effect's pipeline (see <see cref="ISideEffectPipeline"/>): a stage, or the conclusion.
/// The side effect's workflow holds one of these steps per item, so a completed stage never runs again and the
/// conclusion can wait for an outcome with <see cref="ServiceTaskResult.Defer"/>, with a wait budget of its own.
/// </summary>
internal sealed class ExecuteSideEffect(IEnumerable<ISideEffectPipeline> sideEffects)
    : WorkflowEngineCommandBase<ExecuteSideEffectPayload>
{
    public static string Key => "ExecuteSideEffect";

    /// <summary>Reason code for every failure a side effect's own code reported. Operator-visible.</summary>
    internal const string FailedReasonCode = "SideEffectFailedException";

    public override string GetKey() => Key;

    /// <summary>
    /// Side effects call external systems, like service tasks, so they get the same generous default timeout.
    /// </summary>
    public override ProcessStepOptions? DefaultStepOptions { get; } =
        new() { MaxExecutionTime = ExecuteServiceTask.DefaultServiceTaskTimeout };

    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        ExecuteSideEffectPayload payload
    )
    {
        string name = payload.SideEffect;
        if (payload.ItemIndex is not { } itemIndex)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"A step of side effect '{name}' names no pipeline item, so this workflow was not built by this "
                    + "application's side-effect expansion. Abandon it deliberately.",
                "InvalidPayloadException"
            );
        }

        try
        {
            ISideEffectPipeline sideEffect =
                sideEffects.FindSideEffect(name)
                ?? throw new InvalidOperationException($"No side effect is registered with the name '{name}'.");

            ServiceTaskPipeline pipeline = sideEffect.ResolvePipeline();

            string valuesKey = WorkflowCallbackStateCarry.SideEffectValuesKey(name);
            PipelineValues values = PipelineValuesCarry.Restore(context.StateCarry, valuesKey, itemIndex);

            ServiceTaskContext sideEffectContext = new()
            {
                InstanceDataMutator = context.InstanceDataMutator,
                CancellationToken = context.CancellationToken,
                WorkflowId = context.Payload.WorkflowId,
                StepId = context.Payload.StepId,
                ExecutionReferenceTime = context.Payload.ExecutionReferenceTime,
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
                    IsFinalCheck = context.Payload.IsFinalWaitCheck,
                },
                Values = values,
                Arguments = payload.Arguments,
            };

            PipelineItem? item = pipeline.Items.ElementAtOrDefault(itemIndex);
            ProcessEngineCommandResult result = item switch
            {
                null => FailedProcessEngineCommandResult.Permanent(
                    $"Side effect '{name}' composes no pipeline item at index {itemIndex}. If stages were inserted, "
                        + "reordered or removed since this workflow was enqueued, every index behind the change has "
                        + "moved. Resume the workflow on the code that enqueued it, or abandon it deliberately.",
                    "PipelineItemNotFound"
                ),
                ServiceTaskStage.Plain stage => MapStageResult(name, await stage.Work(sideEffectContext)),
                PipelineConclusion.FinalStep final => MapConclusion(name, await final.Work(sideEffectContext)),
                _ => FailedProcessEngineCommandResult.Permanent(
                    $"The item at index {itemIndex} of side effect '{name}' is a {item.GetType().Name}, which a side "
                        + "effect cannot run yet: only plain stages and a Finally conclusion.",
                    "SideEffectItemUnsupported"
                ),
            };

            if (result is SuccessfulProcessEngineCommandResult && HasDataChanges(context.InstanceDataMutator))
            {
                return FailedProcessEngineCommandResult.Permanent(
                    $"Side effect '{name}' changed instance data. A side effect runs on the state the transition "
                        + "committed while the process moves on, so it cannot save. Hand values to later stages "
                        + $"with {nameof(ServiceTaskContext)}.{nameof(ServiceTaskContext.Values)} instead.",
                    "SideEffectChangedInstanceData"
                );
            }

            return PipelineValuesCarry.Publish(
                result,
                values,
                context.StateCarry,
                valuesKey,
                concludes: item is PipelineConclusion,
                owner: $"Side effect '{name}'"
            );
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }

    private static bool HasDataChanges(IInstanceDataMutator mutator) =>
        mutator is InstanceDataUnitOfWork unitOfWork && unitOfWork.GetDataElementChanges(false).AllChanges.Count > 0;

    private static ProcessEngineCommandResult MapStageResult(string name, ServiceTaskStageResult result) =>
        result switch
        {
            CompletedServiceTaskStageResult => new SuccessfulProcessEngineCommandResult(),
            DeferredServiceTaskStageResult deferred => new DeferredProcessEngineCommandResult
            {
                Delay = deferred.Delay,
                Reason = deferred.Reason,
            },
            FailedServiceTaskStageResult failed => MapFailure(
                name,
                failed.ErrorMessage,
                failed.Kind == FailureKind.Permanent
            ),
            _ => UnknownResultType(name, result),
        };

    private static ProcessEngineCommandResult MapConclusion(string name, ServiceTaskResult result) =>
        result switch
        {
            // Success ends the side effect's own workflow. It never continues the process: that is the
            // transition's job, and it moved on when this workflow was enqueued.
            ServiceTaskSuccessResult { Action: null } => new SuccessfulProcessEngineCommandResult(),
            ServiceTaskSuccessResult { Action: { } action } => FailedProcessEngineCommandResult.Permanent(
                $"Side effect '{name}' concluded with the process action '{action}', but a side effect cannot move "
                    + "the process. Return Success() without an action.",
                "SideEffectActionUnsupported"
            ),
            ServiceTaskDeferredResult deferred => new DeferredProcessEngineCommandResult
            {
                Delay = deferred.Delay,
                Reason = deferred.Reason,
            },
            ServiceTaskFailedResult failed => MapFailure(
                name,
                failed.ErrorMessage,
                failed.Kind == FailureKind.Permanent
            ),
            _ => UnknownResultType(name, result),
        };

    private static FailedProcessEngineCommandResult MapFailure(string name, string errorMessage, bool permanent)
    {
        string message = $"Side effect '{name}' failed: {errorMessage}";
        return permanent
            ? FailedProcessEngineCommandResult.Permanent(message, FailedReasonCode)
            : FailedProcessEngineCommandResult.Retryable(message, FailedReasonCode);
    }

    /// <summary>
    /// A result type the mappers do not know: an author error, so it fails permanently naming the type.
    /// </summary>
    private static FailedProcessEngineCommandResult UnknownResultType(string name, object result) =>
        FailedProcessEngineCommandResult.Permanent(
            $"Side effect '{name}' returned a result of type '{result.GetType().Name}', which this version of the "
                + "app-lib cannot act on. Return one of the results the result types' factory methods produce.",
            "SideEffectResultUnknown"
        );

    /// <summary>
    /// The one engine step a side effect's pipeline item becomes. The item's index is the step's identity, as
    /// for a service task's steps: in the payload (dispatch reads it), in
    /// <see cref="Models.Engine.StepRequest.PipelineItemIndex"/> (options are resolved by it) and in the
    /// OperationId.
    /// </summary>
    internal static string OperationId(int itemIndex) =>
        $"{Key}: {itemIndex.ToString(System.Globalization.CultureInfo.InvariantCulture)}";

    /// <summary>Whether a side effect can run every item of <paramref name="pipeline"/>.</summary>
    /// <returns>Why it cannot, or <c>null</c> when it can.</returns>
    internal static string? FindUnsupportedItem(ServiceTaskPipeline pipeline)
    {
        for (int index = 0; index < pipeline.Items.Count; index++)
        {
            switch (pipeline.Items[index])
            {
                case ServiceTaskStage.Plain:
                case PipelineConclusion.FinalStep:
                    continue;
                case ServiceTaskStage.MailboxOpening:
                    return $"the stage at index {index} opens a mailbox, which a side effect cannot do yet";
                case IReplyHandlerItem:
                    return $"the item at index {index} answers a mailbox, which a side effect cannot do yet";
                default:
                    throw new UnreachableException(
                        $"Unknown pipeline item type: {pipeline.Items[index].GetType().Name}"
                    );
            }
        }

        return null;
    }
}
