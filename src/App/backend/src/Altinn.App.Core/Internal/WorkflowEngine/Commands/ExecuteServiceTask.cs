using System.Diagnostics;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for the ExecuteServiceTask command: the service task type, and the one pipeline item this
/// engine step runs, named by its position in <see cref="ServiceTaskPipeline.Items"/>. That item is the whole
/// payload — a step says what it runs, never what runs after it, which every last step of a workflow derives
/// from the pipeline it resolves when it runs.
/// </summary>
/// <remarks>
/// <see cref="ItemIndex"/> is semantically required but nullable: deserialization runs outside any handler, so
/// a non-nullable <c>int</c> would either throw an old index-less payload out as an unhandled callback
/// exception or bind <c>0</c> and silently dispatch the pipeline's first item. Guarded in
/// <see cref="ExecuteServiceTask.Execute"/> so the refusal is a legible permanent failure.
/// </remarks>
internal sealed record ExecuteServiceTaskPayload(string ServiceTaskType, int? ItemIndex = null) : CommandRequestPayload;

internal sealed class ExecuteServiceTask(
    AppImplementationFactory appImplementationFactory,
    MailboxDeliveryEnvelope deliveryEnvelope,
    Telemetry? telemetry = null
) : WorkflowEngineCommandBase<ExecuteServiceTaskPayload>
{
    public static string Key => "ExecuteServiceTask";

    /// <summary>
    /// Service tasks routinely call slow external systems, so they get a far more generous default timeout
    /// than the engine's. Override per task via <see cref="IProcessStepConfigurable.StepOptions"/> or per
    /// stage on the builder.
    /// </summary>
    internal static readonly TimeSpan DefaultServiceTaskTimeout = TimeSpan.FromMinutes(10);

    public override string GetKey() => Key;

    public override ProcessStepOptions? DefaultStepOptions { get; } =
        new() { MaxExecutionTime = DefaultServiceTaskTimeout };

    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        ExecuteServiceTaskPayload payload
    )
    {
        IInstanceDataMutator instanceDataMutator = context.InstanceDataMutator;
        Instance instance = context.InstanceDataMutator.Instance;
        ProcessState? processState = instance.Process;
        if (processState is null)
        {
            return FailedProcessEngineCommandResult.Permanent(
                "Executing a service task requires an active process state.",
                nameof(InvalidOperationException)
            );
        }
        string serviceTaskType = payload.ServiceTaskType;

        using Activity? activity = telemetry?.StartProcessExecuteServiceTaskActivity(instance, serviceTaskType);

        // Refused before task resolution: inside the try below, a resolution throw becomes a retryable
        // failure, and no retry fixes a payload.
        if (payload.ItemIndex is not { } itemIndex)
        {
            return MissingItemIndex(serviceTaskType);
        }

        try
        {
            IPipelineServiceTask serviceTask =
                appImplementationFactory.FindServiceTask(serviceTaskType)
                ?? throw new ProcessException($"No service task found for type {serviceTaskType}");

            ServiceTaskPipeline pipeline = serviceTask.ResolvePipeline();

            ServiceTaskContext serviceTaskContext = new()
            {
                InstanceDataMutator = instanceDataMutator,
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
                },
            };

            AppCallbackMailbox? rendezvous = context.Payload.Mailbox;
            PipelineItem? pipelineItem = pipeline.Items.ElementAtOrDefault(itemIndex);
            ProcessEngineCommandResult result = pipelineItem switch
            {
                null => PipelineItemNotFound(serviceTaskType, itemIndex),

                ServiceTaskStage when rendezvous is not null => MailboxReceiptOnStage(serviceTaskType, itemIndex),

                ServiceTaskStage stage => await ExecuteStage(
                    context,
                    stage,
                    itemIndex,
                    serviceTask,
                    serviceTaskContext,
                    pipeline
                ),

                ReplySegment segment when rendezvous is { } segmentReceipt => await ExecuteSegmentReply(
                    context,
                    segment,
                    segmentReceipt,
                    itemIndex,
                    serviceTaskType,
                    serviceTaskContext,
                    pipeline
                ),

                PipelineConclusion.ReplyExchange exchange when rendezvous is { } terminalReceipt =>
                    await ExecuteTerminalReply(
                        context,
                        exchange,
                        terminalReceipt,
                        itemIndex,
                        serviceTaskType,
                        serviceTaskContext
                    ),

                // Stated rather than left to arm order, exactly as the sibling mismatch arms state theirs: a
                // kind of reply handler with no dispatch arm of its own must reach the throw below, not be
                // told the engine handed it no rendezvous when the engine handed it one.
                IReplyHandlerItem when rendezvous is null => MailboxReceiptMissing(serviceTaskType, itemIndex),

                PipelineConclusion.FinalStep when rendezvous is not null => MailboxReceiptOnConclusion(
                    serviceTaskType,
                    itemIndex
                ),

                PipelineConclusion.FinalStep final => await ExecuteConclusion(final, serviceTask, serviceTaskContext),

                { } item => throw new UnreachableException($"Unknown pipeline item type: {item.GetType().Name}"),
            };

            // The pipeline concluded without advancing: the process pauses at the durable service task, so
            // processing ownership is released. Auto-advance keeps it for the transition it schedules, and a
            // deferral has not concluded at all. A stage that only moves the pipeline on to its next engine
            // step never hands ownership back, so the conclusion is read off the item and the continuation:
            // the pipeline's own last item, or the verdict that closed the task from an exchange. This branch
            // also covers the null a legacy app-supplied implementation can still return.
            if (
                result is SuccessfulProcessEngineCommandResult { AutoAdvanceProcess: false } concluded
                && (
                    pipelineItem is PipelineConclusion.FinalStep
                    || concluded.MailboxContinuation is MailboxContinuation.Conclude
                )
            )
            {
                if (context.InstanceDataMutator is not InstanceDataUnitOfWork unitOfWork)
                {
                    return FailedProcessEngineCommandResult.Permanent(
                        "Pausing a service task requires callback state restored into an InstanceDataUnitOfWork.",
                        nameof(InvalidOperationException)
                    );
                }

                unitOfWork.TransitionProcessStatus(ProcessStatus.Processing, ProcessStatus.Idle);
                processState.Status = ProcessStatus.Idle;
            }

            return result;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }

    /// <summary>
    /// One pipeline stage, dispatched on the stage's own shape. The resolved <paramref name="pipeline"/>
    /// travels with both shapes: a stage that is its workflow's last step plans what follows it, and whether
    /// it is that step is itself read off the pipeline.
    /// </summary>
    private static async Task<ProcessEngineCommandResult> ExecuteStage(
        ProcessEngineCommandContext context,
        ServiceTaskStage stage,
        int stageIndex,
        IPipelineServiceTask serviceTask,
        ServiceTaskContext serviceTaskContext,
        ServiceTaskPipeline pipeline
    ) =>
        stage switch
        {
            ServiceTaskStage.Plain plain => MapStageResult(
                await plain.Work(serviceTaskContext),
                serviceTask,
                context,
                stageIndex,
                pipeline
            ),
            ServiceTaskStage.MailboxOpening opening => await ExecuteMailboxOpeningStage(
                context,
                opening,
                stageIndex,
                serviceTask,
                serviceTaskContext,
                pipeline
            ),
            _ => throw new UnreachableException($"Unknown service task stage type: {stage.GetType().Name}"),
        };

    /// <summary>
    /// The stage that opens the exchange's mailbox: handed the address the mint step published, so it can send
    /// it.
    /// </summary>
    private static async Task<ProcessEngineCommandResult> ExecuteMailboxOpeningStage(
        ProcessEngineCommandContext context,
        ServiceTaskStage.MailboxOpening stage,
        int stageIndex,
        IPipelineServiceTask serviceTask,
        ServiceTaskContext serviceTaskContext,
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

        ServiceTaskMailbox mailbox = new() { Id = carried.Id, Deadline = carried.Deadline };
        return MapOpeningStageResult(
            await stage.Work(serviceTaskContext, mailbox),
            serviceTask,
            context,
            stageIndex,
            pipeline
        );
    }

    /// <summary>
    /// One execution of an exchange's reply handler: exactly one message, or the news that no message can
    /// arrive. Every disagreement between the engine's rendezvous and this pipeline is a permanent failure —
    /// either wrong answer ends the exchange falsely.
    /// </summary>
    private async Task<ProcessEngineCommandResult> ExecuteReply(
        AppCallbackMailbox receipt,
        string serviceTaskType,
        Func<ServiceTaskReply, Task<ProcessEngineCommandResult>> onMessage,
        Func<MailboxClosedReason, Task<ProcessEngineCommandResult>> onClosed
    )
    {
        if ((receipt.Delivery is null) == (receipt.DisposedReason is null))
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"Service task '{serviceTaskType}' was handed a mailbox rendezvous carrying "
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
            // Opening the envelope is what makes the mailbox id, task type and idempotency key trustworthy —
            // all three are read from the delivered callback.
            string body;
            try
            {
                body = deliveryEnvelope.Unwrap(delivery.Payload, receipt.Id, serviceTaskType, delivery.IdempotencyKey);
            }
            catch (MailboxDeliveryEnvelopeException ex)
            {
                return DeliveryEnvelopeInvalid(serviceTaskType, receipt, ex);
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
    /// The exchange answered by the pipeline's <em>terminal</em>: the verdict is the task's own vocabulary, so
    /// the exchange's conclusion is the task's.
    /// </summary>
    private Task<ProcessEngineCommandResult> ExecuteTerminalReply(
        ProcessEngineCommandContext context,
        PipelineConclusion.ReplyExchange exchange,
        AppCallbackMailbox receipt,
        int handlerItemIndex,
        string serviceTaskType,
        ServiceTaskContext serviceTaskContext
    )
    {
        return ExecuteReply(
            receipt,
            serviceTaskType,
            onMessage: async reply => Decide(await exchange.OnMessage(serviceTaskContext, reply)),
            onClosed: async reason => Decide(await exchange.OnClosed(serviceTaskContext, reason))
        );

        ProcessEngineCommandResult Decide(ServiceTaskExchangeResult verdict) =>
            MailboxRelay.Decide(
                verdict,
                serviceTaskType,
                context.Payload.StepId,
                receipt,
                context.StateCarry,
                handlerItemIndex,
                exchange.OpeningIndex
            );
    }

    /// <summary>
    /// The exchange answered by a handler the pipeline <em>carries on past</em>: the verdict is the stage
    /// vocabulary, so the exchange's conclusion starts the pipeline's next segment.
    /// </summary>
    private Task<ProcessEngineCommandResult> ExecuteSegmentReply(
        ProcessEngineCommandContext context,
        ReplySegment segment,
        AppCallbackMailbox receipt,
        int handlerItemIndex,
        string serviceTaskType,
        ServiceTaskContext serviceTaskContext,
        ServiceTaskPipeline pipeline
    )
    {
        return ExecuteReply(
            receipt,
            serviceTaskType,
            onMessage: async reply => Decide(await segment.OnMessage(serviceTaskContext, reply)),
            onClosed: async reason => Decide(await segment.OnClosed(serviceTaskContext, reason))
        );

        ProcessEngineCommandResult Decide(ServiceTaskStageExchangeResult verdict) =>
            MailboxRelay.DecideSegment(
                verdict,
                serviceTaskType,
                context.Payload.StepId,
                receipt,
                context.StateCarry,
                handlerItemIndex,
                segment.OpeningIndex,
                pipeline
            );
    }

    /// <summary>The step that concludes the pipeline — the last step of its final segment.</summary>
    private static async Task<ProcessEngineCommandResult> ExecuteConclusion(
        PipelineConclusion.FinalStep final,
        IPipelineServiceTask serviceTask,
        ServiceTaskContext serviceTaskContext
    ) => MapServiceTaskResult(await final.Work(serviceTaskContext), serviceTask);

    private static FailedProcessEngineCommandResult PipelineItemNotFound(string serviceTaskType, int itemIndex) =>
        FailedProcessEngineCommandResult.Permanent(
            $"Service task '{serviceTaskType}' composes no pipeline item at index {itemIndex}. A pipeline's "
                + "indexes are positions in its composition: if stages or reply handlers were inserted, "
                + "reordered or removed since this workflow was enqueued, every index behind the change has "
                + "moved. Resume the workflow on the code that enqueued it, or abandon it deliberately.",
            "PipelineItemNotFound"
        );

    private static FailedProcessEngineCommandResult MailboxReceiptOnStage(string serviceTaskType, int itemIndex) =>
        FailedProcessEngineCommandResult.Permanent(
            $"The stage at index {itemIndex} of service task '{serviceTaskType}' was handed a mailbox message, "
                + "but only a pipeline's reply handler answers messages. Either the pipeline was reshaped since "
                + "this workflow was enqueued, so the index this step carries now lands on a stage, or the "
                + "workflow was not built by this application's pipeline expansion.",
            "MailboxReceiptOnStage"
        );

    private static FailedProcessEngineCommandResult MailboxReceiptMissing(string serviceTaskType, int itemIndex) =>
        FailedProcessEngineCommandResult.Permanent(
            $"The item at index {itemIndex} of service task '{serviceTaskType}' answers messages, but this "
                + "step was handed no mailbox rendezvous. Either the workflow engine omitted it from a receive "
                + "workflow's callback, or the pipeline was reshaped since this workflow was enqueued, so the "
                + "index a step that answers nothing carries now lands on a reply handler. Answering without a "
                + "rendezvous would end this exchange without ever reading the answer it is waiting for.",
            "MailboxReceiptMissing"
        );

    private static FailedProcessEngineCommandResult MailboxReceiptOnConclusion(string serviceTaskType, int itemIndex) =>
        FailedProcessEngineCommandResult.Permanent(
            $"Service task '{serviceTaskType}' was handed a mailbox message on the concluding step at index "
                + $"{itemIndex}, and a message is answered by a reply handler, never by the step that concludes "
                + "the pipeline. Either the pipeline was reshaped since this workflow was enqueued, so the index "
                + "this step carries now lands on the conclusion, or the workflow was not built by this "
                + "application's pipeline expansion. Abandon the workflow, and close its mailbox by hand if the "
                + "exchange is no longer wanted.",
            "MailboxReceiptOnConclusion"
        );

    private static FailedProcessEngineCommandResult MissingItemIndex(string serviceTaskType) =>
        FailedProcessEngineCommandResult.Permanent(
            $"A step of service task '{serviceTaskType}' names no pipeline item. Every step of a pipeline — "
                + "its stages, its reply handlers and its conclusion alike — names the one item it runs by "
                + "that item's index, so this workflow was enqueued by a version of this app-lib that "
                + "identified steps differently. Resume it on the version that enqueued it, or abandon it "
                + "deliberately.",
            "InvalidPayloadException"
        );

    private static FailedProcessEngineCommandResult DeliveryEnvelopeInvalid(
        string serviceTaskType,
        AppCallbackMailbox receipt,
        MailboxDeliveryEnvelopeException ex
    ) =>
        FailedProcessEngineCommandResult.Permanent(
            $"The message delivered to service task '{serviceTaskType}' at position {receipt.Seq} of "
                + $"mailbox {receipt.Id} cannot be opened as one this application sealed: it was never "
                + "sealed by IServiceTaskReplyForwarder, was altered after forwarding, was sealed for a "
                + "different mailbox, service task or message id, or was sealed with a WorkflowEngineCallback "
                + "app code that has since expired or been unmounted. The last is reachable without anything "
                + "being wrong with the message: an early message can wait unread at its position while the "
                + "exchange advances, so a long exchange can outlive the code that sealed one of its "
                + "messages. "
                + ex.Message,
            "MailboxDeliveryEnvelopeInvalid"
        );

    private static ProcessEngineCommandResult MapStageResult(
        ServiceTaskStageResult result,
        IPipelineServiceTask task,
        ProcessEngineCommandContext context,
        int stageIndex,
        ServiceTaskPipeline pipeline
    ) =>
        result switch
        {
            // A completed stage never advances the process — the pipeline just moves on to its next step. Which
            // is a later step of this same workflow, and nothing to do, unless a reply handler is composed
            // next: a handler is alone in its workflow, so this stage is its own workflow's last step and
            // completing it is what starts that handler's receive workflow.
            CompletedServiceTaskStageResult
                when WorkflowCommandSet.ItemStartsItsOwnWorkflow(pipeline, stageIndex + 1) =>
                MailboxRelay.DecideStageEnd(
                    task.Type,
                    context.Payload.StepId,
                    context.StateCarry,
                    stageIndex,
                    pipeline
                ),
            CompletedServiceTaskStageResult => new SuccessfulProcessEngineCommandResult(),
            DeferredServiceTaskStageResult deferred => new DeferredProcessEngineCommandResult
            {
                Delay = deferred.Delay,
                Reason = deferred.Reason,
            },
            FailedServiceTaskStageResult failed => MapFailure(
                task,
                failed.ErrorMessage,
                failed.Kind == FailureKind.Permanent
            ),
            // Reachable from app code (see MailboxRelay.Decide's last arm); permanent so it converges.
            _ => UnknownResultType(
                task,
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
    /// step, so completing it always starts what the pipeline composes after it — which, when that is a reply
    /// handler, is a receive workflow parked on the exchange <em>that handler</em> answers, not necessarily the
    /// one this stage opened; and a conclusion is handed to the relay to close every carried mailbox before
    /// anything downstream starts. The conclusion is honorable wherever the stage sits, precisely because no
    /// later step of this workflow exists for it to have to cancel.
    /// </summary>
    private static ProcessEngineCommandResult MapOpeningStageResult(
        ServiceTaskOpeningStageResult result,
        IPipelineServiceTask task,
        ProcessEngineCommandContext context,
        int stageIndex,
        ServiceTaskPipeline pipeline
    ) =>
        result switch
        {
            CompletedServiceTaskOpeningStageResult => MailboxRelay.DecideStageEnd(
                task.Type,
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
                task,
                failed.ErrorMessage,
                failed.Kind == FailureKind.Permanent
            ),
            ConcludedServiceTaskOpeningStageResult concluded => MailboxRelay.DecideOpeningStageConclusion(
                concluded.Result,
                task.Type,
                context.Payload.StepId,
                context.StateCarry
            ),
            // Reachable from app code (see MailboxRelay.Decide's last arm); permanent so it converges.
            _ => UnknownResultType(
                task,
                result,
                nameof(ServiceTaskOpeningStageResult),
                $"{nameof(ServiceTaskOpeningStageResult.Completed)}, "
                    + $"{nameof(ServiceTaskOpeningStageResult.Defer)}, "
                    + $"{nameof(ServiceTaskOpeningStageResult.FailedRetryable)}, "
                    + $"{nameof(ServiceTaskOpeningStageResult.FailedPermanent)} or "
                    + $"{nameof(ServiceTaskOpeningStageResult.Conclude)}"
            ),
        };

    private static ProcessEngineCommandResult MapServiceTaskResult(
        ServiceTaskResult result,
        IPipelineServiceTask task
    ) =>
        result switch
        {
            ServiceTaskFailedResult failed => MapFailure(
                task,
                failed.ErrorMessage,
                failed.Kind == FailureKind.Permanent
            ),
            ServiceTaskDeferredResult deferred => new DeferredProcessEngineCommandResult
            {
                Delay = deferred.Delay,
                Reason = deferred.Reason,
            },
            ServiceTaskSuccessResult { AutoAdvanceProcess: true } success => new SuccessfulProcessEngineCommandResult
            {
                AutoAdvanceProcess = true,
                AutoAdvanceAction = success.Action,
            },
            ServiceTaskSuccessResult => new SuccessfulProcessEngineCommandResult(),
            // Reachable from app code (see MailboxRelay.Decide's last arm); permanent so it converges.
            _ => UnknownResultType(
                task,
                result,
                nameof(ServiceTaskResult),
                $"{nameof(ServiceTaskResult.Success)}, {nameof(ServiceTaskResult.SuccessWithoutAutoAdvance)}, "
                    + $"{nameof(ServiceTaskResult.FailedRetryable)}, "
                    + $"{nameof(ServiceTaskResult.FailedPermanent)} or {nameof(ServiceTaskResult.Defer)}"
            ),
        };

    /// <summary>
    /// A result type neither mapper knows: an author error, so it fails permanently naming the type — a throw
    /// here would be caught by <see cref="Execute"/> and retried forever.
    /// </summary>
    private static FailedProcessEngineCommandResult UnknownResultType(
        IPipelineServiceTask task,
        object result,
        string rootTypeName,
        string factoryNames
    ) =>
        FailedProcessEngineCommandResult.Permanent(
            $"Service task '{task.Type}' returned a result of type '{result.GetType().Name}', which this version "
                + $"of the app-lib cannot act on. Return one of the results {rootTypeName}'s factory methods "
                + $"produce ({factoryNames}) — never a type of your own, which has no meaning the workflow "
                + "engine can be given.",
            "ServiceTaskResultUnknown"
        );

    /// <summary>
    /// Reason code for every failure a service task's own code reported, whichever part of the pipeline
    /// reported it. One definition, shared with <see cref="MailboxRelay"/> — the code is operator-visible.
    /// </summary>
    internal const string FailedReasonCode = "ServiceTaskFailedException";

    /// <summary>The sentence such a failure is reported as, shared with <see cref="MailboxRelay"/>.</summary>
    internal static string FailedMessage(string serviceTaskType, string errorMessage) =>
        $"Service task '{serviceTaskType}' failed: {errorMessage}";

    private static FailedProcessEngineCommandResult MapFailure(
        IPipelineServiceTask task,
        string errorMessage,
        bool permanent
    )
    {
        string message = FailedMessage(task.Type, errorMessage);
        return permanent
            ? FailedProcessEngineCommandResult.Permanent(message, FailedReasonCode)
            : FailedProcessEngineCommandResult.Retryable(message, FailedReasonCode);
    }
}
