using System.Diagnostics;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Runs the one pipeline item an engine step names — a stage, a reply handler or the conclusion — for a service
/// task (<see cref="ExecuteServiceTask"/>) or a side effect (<see cref="ExecuteSideEffect"/>) alike. Dispatch is on
/// the item's shape; the host decides only how a conclusion ends (moving the process on, or not) and how failures
/// are named.
/// </summary>
internal sealed class PipelineItemRunner(MailboxDeliveryEnvelope deliveryEnvelope)
{
    /// <summary>The context a pipeline item runs with, read from the callback.</summary>
    public static ServiceTaskContext CreateContext(
        ProcessEngineCommandContext context,
        PipelineValues values,
        string? input
    ) =>
        new()
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
            Input = input,
        };

    /// <summary>
    /// Whether a result concludes the pipeline: a conclusion that succeeded, an exchange's verdict that closed its
    /// mailboxes for good, or a service task's result that moves the process on.
    /// </summary>
    public static bool Concludes(PipelineItem? item, ProcessEngineCommandResult result) =>
        result is SuccessfulProcessEngineCommandResult success
        && (
            success.ProcessNextContinuation is not null
            || success.MailboxContinuation is MailboxContinuation.Conclude
            || item is PipelineConclusion.FinalStep
        );

    /// <summary>Runs the item at <paramref name="itemIndex"/> of <paramref name="pipeline"/>.</summary>
    public async Task<ProcessEngineCommandResult> Run(
        ProcessEngineCommandContext context,
        PipelineHost host,
        ServiceTaskPipeline pipeline,
        int itemIndex,
        ServiceTaskContext stepContext
    )
    {
        AppCallbackMailbox? rendezvous = context.Payload.Mailbox;
        PipelineItem? pipelineItem = pipeline.Items.ElementAtOrDefault(itemIndex);
        return pipelineItem switch
        {
            null => PipelineItemNotFound(host, itemIndex),

            ServiceTaskStage when rendezvous is not null => MailboxReceiptOnStage(host, itemIndex),

            ServiceTaskStage stage => await ExecuteStage(context, host, stage, itemIndex, stepContext, pipeline),

            ReplySegment segment when rendezvous is { } segmentReceipt => await ExecuteSegmentReply(
                context,
                host,
                segment,
                segmentReceipt,
                itemIndex,
                stepContext,
                pipeline
            ),

            PipelineConclusion.ReplyExchange exchange when rendezvous is { } terminalReceipt =>
                await ExecuteTerminalReply(context, host, exchange, terminalReceipt, itemIndex, stepContext),

            // Stated rather than left to arm order, exactly as the sibling mismatch arms state theirs: a kind of
            // reply handler with no dispatch arm of its own must reach the throw below, not be told the engine
            // handed it no rendezvous when the engine handed it one.
            IReplyHandlerItem when rendezvous is null => MailboxReceiptMissing(host, itemIndex),

            PipelineConclusion.FinalStep when rendezvous is not null => MailboxReceiptOnConclusion(host, itemIndex),

            PipelineConclusion.FinalStep final => MapConclusion(host, await final.Work(stepContext)),

            { } item => throw new UnreachableException($"Unknown pipeline item type: {item.GetType().Name}"),
        };
    }

    /// <summary>
    /// One pipeline stage, dispatched on the stage's own shape. The resolved <paramref name="pipeline"/> travels
    /// with both shapes: a stage that is its workflow's last step plans what follows it, and whether it is that
    /// step is itself read off the pipeline.
    /// </summary>
    private static async Task<ProcessEngineCommandResult> ExecuteStage(
        ProcessEngineCommandContext context,
        PipelineHost host,
        ServiceTaskStage stage,
        int stageIndex,
        ServiceTaskContext stepContext,
        ServiceTaskPipeline pipeline
    ) =>
        stage switch
        {
            ServiceTaskStage.Plain plain => MapStageResult(
                await plain.Work(stepContext),
                host,
                context,
                stageIndex,
                pipeline
            ),
            ServiceTaskStage.MailboxOpening opening => await ExecuteMailboxOpeningStage(
                context,
                host,
                opening,
                stageIndex,
                stepContext,
                pipeline
            ),
            _ => throw new UnreachableException($"Unknown pipeline stage type: {stage.GetType().Name}"),
        };

    /// <summary>
    /// The stage that opens the exchange's mailbox: handed the address the mint step published, so it can send
    /// it.
    /// </summary>
    private static async Task<ProcessEngineCommandResult> ExecuteMailboxOpeningStage(
        ProcessEngineCommandContext context,
        PipelineHost host,
        ServiceTaskStage.MailboxOpening stage,
        int stageIndex,
        ServiceTaskContext stepContext,
        ServiceTaskPipeline pipeline
    )
    {
        if (context.StateCarry.FindMailbox(stageIndex) is not { } carried)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"The stage at index {stageIndex} opens a mailbox, but no mailbox id for it reached this step in "
                    + "the workflow state. Either this workflow was enqueued before the stage opened one — its "
                    + "step list was fixed then, and holds no mint step to record an id — or the mint step ran "
                    + "immediately before this stage and its record did not survive into this step's state.",
                "MailboxIdMissingFromState"
            );
        }

        ServiceTaskMailbox mailbox = new()
        {
            Id = carried.Id,
            Deadline = carried.Deadline,
            Owner = host.MailboxOwner,
        };
        return MapOpeningStageResult(await stage.Work(stepContext, mailbox), host, context, stageIndex, pipeline);
    }

    /// <summary>
    /// One execution of an exchange's reply handler: exactly one message, or the news that no message can
    /// arrive. Every disagreement between the engine's rendezvous and this pipeline is a permanent failure —
    /// either wrong answer ends the exchange falsely.
    /// </summary>
    private async Task<ProcessEngineCommandResult> ExecuteReply(
        AppCallbackMailbox receipt,
        PipelineHost host,
        Func<ServiceTaskReply, Task<ProcessEngineCommandResult>> onMessage,
        Func<MailboxClosedReason, Task<ProcessEngineCommandResult>> onClosed
    )
    {
        if ((receipt.Delivery is null) == (receipt.DisposedReason is null))
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"{host.Description} was handed a mailbox rendezvous carrying "
                    + (
                        receipt.Delivery is null
                            ? "neither a message nor a reason the mailbox closed"
                            : "both a message and a reason the mailbox closed"
                    )
                    + ". Exactly one of the two is always present, so this callback cannot be answered.",
                "MailboxReceiptAmbiguous"
            );
        }

        if (receipt.Delivery is { } delivery)
        {
            // Opening the envelope is what makes the mailbox id, owner and idempotency key trustworthy — all
            // three are read from the delivered callback.
            string body;
            try
            {
                body = deliveryEnvelope.Unwrap(
                    delivery.Payload,
                    receipt.Id,
                    host.MailboxOwner.Key,
                    delivery.IdempotencyKey
                );
            }
            catch (MailboxDeliveryEnvelopeException ex)
            {
                return DeliveryEnvelopeInvalid(host, receipt, ex);
            }

            return await onMessage(
                new ServiceTaskReply
                {
                    Payload = body,
                    IdempotencyKey = delivery.IdempotencyKey,
                    AcceptedAt = delivery.AcceptedAt,
                    Position = receipt.Seq,
                }
            );
        }

        return await onClosed(
            receipt.DisposedReason switch
            {
                MailboxDisposedReason.Deadline => MailboxClosedReason.Deadline,
                _ => MailboxClosedReason.Request,
            }
        );
    }

    /// <summary>
    /// The exchange answered by the pipeline's <em>terminal</em>: the verdict is the conclusion's vocabulary,
    /// so the exchange's conclusion is the pipeline's.
    /// </summary>
    private Task<ProcessEngineCommandResult> ExecuteTerminalReply(
        ProcessEngineCommandContext context,
        PipelineHost host,
        PipelineConclusion.ReplyExchange exchange,
        AppCallbackMailbox receipt,
        int handlerItemIndex,
        ServiceTaskContext stepContext
    )
    {
        return ExecuteReply(
            receipt,
            host,
            onMessage: async reply => Decide(await exchange.OnMessage(stepContext, reply)),
            onClosed: async reason => Decide(await exchange.OnClosed(stepContext, reason))
        );

        ProcessEngineCommandResult Decide(ServiceTaskExchangeResult verdict) =>
            MailboxRelay.Decide(
                verdict,
                host,
                context.Payload.StepId,
                receipt,
                context.StateCarry,
                handlerItemIndex,
                exchange.OpeningIndex,
                exchange.StepOptions
            );
    }

    /// <summary>
    /// The exchange answered by a handler the pipeline <em>carries on past</em>: the verdict is the stage
    /// vocabulary, so the exchange's conclusion starts the pipeline's next segment.
    /// </summary>
    private Task<ProcessEngineCommandResult> ExecuteSegmentReply(
        ProcessEngineCommandContext context,
        PipelineHost host,
        ReplySegment segment,
        AppCallbackMailbox receipt,
        int handlerItemIndex,
        ServiceTaskContext stepContext,
        ServiceTaskPipeline pipeline
    )
    {
        return ExecuteReply(
            receipt,
            host,
            onMessage: async reply => Decide(await segment.OnMessage(stepContext, reply)),
            onClosed: async reason => Decide(await segment.OnClosed(stepContext, reason))
        );

        ProcessEngineCommandResult Decide(ServiceTaskStageExchangeResult verdict) =>
            MailboxRelay.DecideSegment(
                verdict,
                host,
                context.Payload.StepId,
                receipt,
                context.StateCarry,
                handlerItemIndex,
                segment.OpeningIndex,
                pipeline
            );
    }

    private static FailedProcessEngineCommandResult PipelineItemNotFound(PipelineHost host, int itemIndex) =>
        FailedProcessEngineCommandResult.Permanent(
            $"{host.Description} composes no pipeline item at index {itemIndex}. A pipeline's indexes are "
                + "positions in its composition: if stages or reply handlers were inserted, reordered or removed "
                + "since this workflow was enqueued, every index behind the change has moved. Resume the workflow "
                + "on the code that enqueued it, or abandon it deliberately.",
            "PipelineItemNotFound"
        );

    private static FailedProcessEngineCommandResult MailboxReceiptOnStage(PipelineHost host, int itemIndex) =>
        FailedProcessEngineCommandResult.Permanent(
            $"The stage at index {itemIndex} of {Lowercase(host.Description)} was handed a mailbox message, but "
                + "only a pipeline's reply handler answers messages. Either the pipeline was reshaped since this "
                + "workflow was enqueued, so the index this step carries now lands on a stage, or the workflow was "
                + "not built by this application's pipeline expansion.",
            "MailboxReceiptOnStage"
        );

    private static FailedProcessEngineCommandResult MailboxReceiptMissing(PipelineHost host, int itemIndex) =>
        FailedProcessEngineCommandResult.Permanent(
            $"The item at index {itemIndex} of {Lowercase(host.Description)} answers messages, but this step was "
                + "handed no mailbox rendezvous. Either the workflow engine omitted it from a receive workflow's "
                + "callback, or the pipeline was reshaped since this workflow was enqueued, so the index a step "
                + "that answers nothing carries now lands on a reply handler. Answering without a rendezvous would "
                + "end this exchange without ever reading the answer it is waiting for.",
            "MailboxReceiptMissing"
        );

    private static FailedProcessEngineCommandResult MailboxReceiptOnConclusion(PipelineHost host, int itemIndex) =>
        FailedProcessEngineCommandResult.Permanent(
            $"{host.Description} was handed a mailbox message on the concluding step at index {itemIndex}, and a "
                + "message is answered by a reply handler, never by the step that concludes the pipeline. Either "
                + "the pipeline was reshaped since this workflow was enqueued, so the index this step carries now "
                + "lands on the conclusion, or the workflow was not built by this application's pipeline "
                + "expansion. Abandon the workflow, and close its mailbox by hand if the exchange is no longer "
                + "wanted.",
            "MailboxReceiptOnConclusion"
        );

    private static FailedProcessEngineCommandResult DeliveryEnvelopeInvalid(
        PipelineHost host,
        AppCallbackMailbox receipt,
        MailboxDeliveryEnvelopeException ex
    ) =>
        FailedProcessEngineCommandResult.Permanent(
            $"The message delivered to {Lowercase(host.Description)} at position {receipt.Seq} of mailbox "
                + $"{receipt.Id} cannot be opened as one this application sealed: it was never sealed by "
                + "IServiceTaskReplyForwarder, was altered after forwarding, was sealed for a different mailbox, "
                + "owner or message id, or was sealed with a WorkflowEngineCallback app code that has since expired "
                + "or been unmounted. The last is reachable without anything being wrong with the message: an "
                + "early message can wait unread at its position while the exchange advances, so a long exchange "
                + "can outlive the code that sealed one of its messages. "
                + ex.Message,
            "MailboxDeliveryEnvelopeInvalid"
        );

    private static string Lowercase(string description) =>
        description.Length == 0 ? description : char.ToLowerInvariant(description[0]) + description[1..];

    private static ProcessEngineCommandResult MapStageResult(
        ServiceTaskStageResult result,
        PipelineHost host,
        ProcessEngineCommandContext context,
        int stageIndex,
        ServiceTaskPipeline pipeline
    ) =>
        result switch
        {
            // A completed stage never concludes the pipeline — it just moves on to its next step. Which is a later
            // step of this same workflow, and nothing to do, unless a reply handler is composed next: a handler is
            // alone in its workflow, so this stage is its own workflow's last step and completing it is what
            // starts that handler's receive workflow.
            CompletedServiceTaskStageResult
                when WorkflowCommandSet.ItemStartsItsOwnWorkflow(pipeline, stageIndex + 1) =>
                MailboxRelay.DecideStageEnd(host, context.Payload.StepId, context.StateCarry, stageIndex, pipeline),
            CompletedServiceTaskStageResult => new SuccessfulProcessEngineCommandResult(),
            DeferredServiceTaskStageResult deferred => new DeferredProcessEngineCommandResult
            {
                Delay = deferred.Delay,
                Reason = deferred.Reason,
            },
            FailedServiceTaskStageResult failed => MapFailure(
                host,
                failed.ErrorMessage,
                failed.Kind == FailureKind.Permanent
            ),
            // Reachable from app code (see MailboxRelay.Decide's last arm); permanent so it converges.
            _ => UnknownResultType(
                host,
                result,
                nameof(ServiceTaskStageResult),
                $"{nameof(ServiceTaskStageResult.Completed)}, {nameof(ServiceTaskStageResult.Defer)}, "
                    + $"{nameof(ServiceTaskStageResult.FailedRetryable)} or "
                    + $"{nameof(ServiceTaskStageResult.FailedPermanent)}"
            ),
        };

    /// <summary>
    /// The mailbox-opening stage's widened vocabulary: the stage members map exactly as
    /// <see cref="MapStageResult"/> maps them, except that such a stage is <em>always</em> its workflow's last
    /// step, so completing it always starts what the pipeline composes after it; and a conclusion is handed to the
    /// relay to close every carried mailbox before anything downstream starts.
    /// </summary>
    private static ProcessEngineCommandResult MapOpeningStageResult(
        ServiceTaskOpeningStageResult result,
        PipelineHost host,
        ProcessEngineCommandContext context,
        int stageIndex,
        ServiceTaskPipeline pipeline
    ) =>
        result switch
        {
            CompletedServiceTaskOpeningStageResult => MailboxRelay.DecideStageEnd(
                host,
                context.Payload.StepId,
                context.StateCarry,
                stageIndex,
                pipeline
            ),
            DeferredServiceTaskOpeningStageResult deferred => new DeferredProcessEngineCommandResult
            {
                Delay = deferred.Delay,
                Reason = deferred.Reason,
            },
            FailedServiceTaskOpeningStageResult failed => MapFailure(
                host,
                failed.ErrorMessage,
                failed.Kind == FailureKind.Permanent
            ),
            ConcludedServiceTaskOpeningStageResult concluded => MailboxRelay.DecideOpeningStageConclusion(
                concluded.Result,
                host,
                context.Payload.StepId,
                context.StateCarry
            ),
            // Reachable from app code (see MailboxRelay.Decide's last arm); permanent so it converges.
            _ => UnknownResultType(
                host,
                result,
                nameof(ServiceTaskOpeningStageResult),
                $"{nameof(ServiceTaskOpeningStageResult.Completed)}, "
                    + $"{nameof(ServiceTaskOpeningStageResult.Defer)}, "
                    + $"{nameof(ServiceTaskOpeningStageResult.FailedRetryable)}, "
                    + $"{nameof(ServiceTaskOpeningStageResult.FailedPermanent)} or "
                    + $"{nameof(ServiceTaskOpeningStageResult.Conclude)}"
            ),
        };

    /// <summary>
    /// The concluding step's result. A service task's success moves the process on with the result's action; a
    /// side effect's success ends the side effect, and an action is refused, since a side effect cannot move the
    /// process.
    /// </summary>
    private static ProcessEngineCommandResult MapConclusion(PipelineHost host, ServiceTaskResult result) =>
        result switch
        {
            ServiceTaskFailedResult failed => MapFailure(
                host,
                failed.ErrorMessage,
                failed.Kind == FailureKind.Permanent
            ),
            ServiceTaskDeferredResult deferred => new DeferredProcessEngineCommandResult
            {
                Delay = deferred.Delay,
                Reason = deferred.Reason,
            },
            ServiceTaskSuccessResult success when host.HoldsUpProcess => new SuccessfulProcessEngineCommandResult
            {
                ProcessNextContinuation = new(success.Action),
            },
            ServiceTaskSuccessResult { Action: { } action } => FailedProcessEngineCommandResult.Permanent(
                $"{host.Description} concluded with the process action '{action}', but a side effect cannot move "
                    + "the process. Return Success() without an action.",
                "SideEffectActionUnsupported"
            ),
            ServiceTaskSuccessResult => new SuccessfulProcessEngineCommandResult(),
            // Reachable from app code (see MailboxRelay.Decide's last arm); permanent so it converges.
            _ => UnknownResultType(
                host,
                result,
                nameof(ServiceTaskResult),
                $"{nameof(ServiceTaskResult.Success)}, "
                    + $"{nameof(ServiceTaskResult.FailedRetryable)}, "
                    + $"{nameof(ServiceTaskResult.FailedPermanent)} or {nameof(ServiceTaskResult.Defer)}"
            ),
        };

    /// <summary>
    /// A result type no mapper knows: an author error, so it fails permanently naming the type — a throw here
    /// would be caught by the command and retried forever.
    /// </summary>
    private static FailedProcessEngineCommandResult UnknownResultType(
        PipelineHost host,
        object result,
        string rootTypeName,
        string factoryNames
    ) =>
        FailedProcessEngineCommandResult.Permanent(
            $"{host.Description} returned a result of type '{result.GetType().Name}', which this version of the "
                + $"app-lib cannot act on. Return one of the results {rootTypeName}'s factory methods produce "
                + $"({factoryNames}) — never a type of your own, which has no meaning the workflow engine can be "
                + "given.",
            host.HoldsUpProcess ? "ServiceTaskResultUnknown" : "SideEffectResultUnknown"
        );

    private static FailedProcessEngineCommandResult MapFailure(PipelineHost host, string errorMessage, bool permanent)
    {
        string message = host.FailedMessage(errorMessage);
        return permanent
            ? FailedProcessEngineCommandResult.Permanent(message, host.FailedReasonCode)
            : FailedProcessEngineCommandResult.Retryable(message, host.FailedReasonCode);
    }
}
