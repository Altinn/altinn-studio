using System.Diagnostics;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for the ExecuteServiceTask command: the service task type, and the one pipeline item this
/// engine step runs — a stage, a reply handler, or the conclusion, each named by its position in
/// <see cref="ServiceTaskPipeline.Items"/>.
/// </summary>
/// <remarks>
/// <para>
/// <strong><see cref="ItemIndex"/> is semantically required</strong>, and nullable only because binding
/// failures are not survivable here: <c>CommandPayloadSerializer.Deserialize</c> runs in
/// <c>WorkflowEngineCommandBase</c> outside any handler, so a non-nullable <c>int</c> would either throw an
/// old index-less payload out as an unhandled callback exception or, worse, bind <c>0</c> and silently
/// dispatch the pipeline's first item. Null is instead refused by <see cref="ExecuteServiceTask.Execute"/> as
/// a permanent <c>InvalidPayloadException</c> — a payload written by a version of this app-lib whose step
/// identity differed, which is also where an old receive step's <c>repliesTo</c> lands, that property being
/// skipped by deserialization.
/// </para>
/// <para>
/// Guarded in <see cref="ExecuteServiceTask.Execute"/> rather than in a constructor for the same reason: a
/// throwing constructor would leave the callback as an unhandled exception instead of the legible permanent
/// failure every other payload-shape violation here gets (see <see cref="EnqueueReceiveWorkflow"/>'s own
/// <c>InvalidPayloadException</c>).
/// </para>
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
    /// Service tasks routinely call slow external systems (eFormidling, payment providers), so
    /// they get a far more generous default timeout than the engine's. Override per task via
    /// <see cref="IProcessStepConfigurable.StepOptions"/> or per stage on the builder.
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
        string serviceTaskType = payload.ServiceTaskType;

        using Activity? activity = telemetry?.StartProcessExecuteServiceTaskActivity(instance, serviceTaskType);

        // Refused before the task is resolved: inside the try below, anything the resolution throws — an
        // unregistered service task type, a Define that throws — becomes a retryable failure that never
        // converges, on a payload no retry can fix. A payload-shape refusal needs no pipeline, so it is the
        // one guard that can still run out here.
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

            // One switch, on the shape of the item the step names crossed with whether the engine handed this
            // execution a mailbox rendezvous. Every arm is a method that assumes its shape rather than
            // re-interrogating the item, and the two mismatch arms are what is left of the guards that used to
            // read a second index. The rendezvous is bound here and handed to the reply arms as a non-nullable
            // argument, so no arm re-asks a question this switch already answered.
            AppCallbackMailbox? rendezvous = context.Payload.Mailbox;
            return pipeline.Items.ElementAtOrDefault(itemIndex) switch
            {
                null => PipelineItemNotFound(serviceTaskType, itemIndex),

                ServiceTaskStage when rendezvous is not null => MailboxReceiptOnStage(serviceTaskType, itemIndex),

                ServiceTaskStage stage => await ExecuteStage(
                    context,
                    stage,
                    itemIndex,
                    serviceTask,
                    serviceTaskContext
                ),

                ReplySegment segment when rendezvous is { } segmentReceipt => await ExecuteSegmentReply(
                    context,
                    segment,
                    segmentReceipt,
                    itemIndex,
                    serviceTaskType,
                    serviceTaskContext
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

                // A step whose item answers an exchange, handed nothing to answer.
                ReplySegment or PipelineConclusion.ReplyExchange => MailboxReceiptMissing(serviceTaskType, itemIndex),

                PipelineConclusion.FinalStep when rendezvous is not null => MailboxReceiptOnConclusion(
                    serviceTaskType,
                    itemIndex
                ),

                PipelineConclusion.FinalStep final => await ExecuteConclusion(final, serviceTask, serviceTaskContext),

                // Drift guard for this assembly's own vocabulary: the item hierarchy is closed, so the only way
                // here is a shape added without a branch to execute it.
                { } item => throw new UnreachableException($"Unknown pipeline item type: {item.GetType().Name}"),
            };
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }

    /// <summary>
    /// One pipeline stage, dispatched on the stage's own shape so each kind's work delegate is called with
    /// exactly the arguments it declares. Reached only for a stage carrying no rendezvous — <see cref="Execute"/>
    /// decided both of those before calling.
    /// </summary>
    private static async Task<ProcessEngineCommandResult> ExecuteStage(
        ProcessEngineCommandContext context,
        ServiceTaskStage stage,
        int stageIndex,
        IPipelineServiceTask serviceTask,
        ServiceTaskContext serviceTaskContext
    ) =>
        stage switch
        {
            ServiceTaskStage.Plain plain => MapStageResult(await plain.Work(serviceTaskContext), serviceTask),
            ServiceTaskStage.MailboxOpening opening => await ExecuteMailboxOpeningStage(
                context,
                opening,
                stageIndex,
                serviceTask,
                serviceTaskContext
            ),
            // Drift guard for this assembly's own vocabulary: ServiceTaskStage is a closed two-member set, so
            // the only way here is a third stage shape added without a branch to execute it.
            _ => throw new UnreachableException($"Unknown service task stage type: {stage.GetType().Name}"),
        };

    /// <summary>
    /// The stage that opens the exchange's mailbox: it is handed the address the mint step published, so it
    /// can send it.
    /// </summary>
    /// <remarks>
    /// One drift guard, <c>MailboxIdMissingFromState</c>, for two scenarios the stage cannot recover from
    /// either way — it has no way to obtain an address, and retrying only repeats the read:
    /// <list type="bullet">
    /// <item>
    /// <description>
    /// a redeploy <em>added</em> the declaration at this index while a workflow enqueued against the
    /// declaration-free shape was in flight, so that workflow's step list holds no mint step at all.
    /// </description>
    /// </item>
    /// <item>
    /// <description>
    /// the mint step did run — it is the immediately preceding step, with nothing between — and the record it
    /// left did not survive into this step's state.
    /// </description>
    /// </item>
    /// </list>
    /// </remarks>
    private static async Task<ProcessEngineCommandResult> ExecuteMailboxOpeningStage(
        ProcessEngineCommandContext context,
        ServiceTaskStage.MailboxOpening stage,
        int stageIndex,
        IPipelineServiceTask serviceTask,
        ServiceTaskContext serviceTaskContext
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
        return MapStageResult(await stage.Work(serviceTaskContext, mailbox), serviceTask);
    }

    /// <summary>
    /// One execution of an exchange's reply handler: exactly one message, or the news that no message can
    /// arrive. Every disagreement between the engine's rendezvous and this pipeline is a permanent failure
    /// rather than a silent default — either wrong answer ends the exchange falsely.
    /// </summary>
    /// <remarks>
    /// Two guards run before the handler does. The first is a drift guard, unreachable from app code, which is
    /// why it survived the compile-time move. The second is not: it guards runtime-supplied integration data no
    /// type can bind. A third, <c>MailboxReceiptMissing</c>, used to stand here and has moved into
    /// <see cref="Execute"/>'s dispatch, which is where the question is now decided — this method is handed the
    /// rendezvous as a non-nullable argument and has none left to ask.
    /// <list type="bullet">
    /// <item>
    /// <term><c>MailboxReceiptAmbiguous</c></term>
    /// <description>
    /// the rendezvous carries neither a message nor a closure reason, or both. Exactly one is present by the
    /// engine's contract, so this is engine drift: a rendezvous shape this app-lib does not model. "Neither"
    /// must not read as closed, because an absent message is the instruction to conclude.
    /// </description>
    /// </item>
    /// <item>
    /// <term><c>MailboxDeliveryEnvelopeInvalid</c></term>
    /// <description>
    /// the delivered bytes do not open as something this application sealed. <strong>Reachable from app
    /// code</strong>, unlike the one above: <see cref="IServiceTaskReplyForwarder"/> takes both the mailbox id
    /// and the service task type from its caller — deliberately, because deriving either can sign its own
    /// mistake — so forwarding under the wrong one seals for a different mailbox or task and fails the unwrap
    /// here. The other routes are a forged or altered delivery and an app code that expired while the message
    /// waited unread at its position; that last needs nothing to be wrong with the message, which is why the
    /// wording names it.
    /// </description>
    /// </item>
    /// </list>
    /// </remarks>
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
            // Opening the envelope is what makes the mailbox id, task type and idempotency key trustworthy — all
            // three are read from the delivered callback.
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
    /// The exchange answered by the pipeline's <em>terminal</em>: the handler's verdict is the task's own
    /// vocabulary, so the relay maps it and the exchange's conclusion is the task's.
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
                // The index the step carries, so a successor names this same handler however the pipeline
                // resolves at that later hop.
                handlerItemIndex,
                exchange.OpeningIndex
            );
    }

    /// <summary>
    /// The exchange answered by a handler the pipeline <em>carries on past</em>: the handler's verdict is the
    /// stage vocabulary, so the relay maps it and the exchange's conclusion starts the pipeline's next
    /// segment rather than the task's conclusion.
    /// </summary>
    private Task<ProcessEngineCommandResult> ExecuteSegmentReply(
        ProcessEngineCommandContext context,
        ReplySegment segment,
        AppCallbackMailbox receipt,
        int handlerItemIndex,
        string serviceTaskType,
        ServiceTaskContext serviceTaskContext
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
                // As above: the step's own index names this handler, and the exchange it answers is the
                // handler's composition data rather than anything re-derived at a later hop.
                handlerItemIndex,
                segment.OpeningIndex
            );
    }

    /// <summary>
    /// The step that concludes the pipeline — the last step of its <em>final segment</em>, named by the item
    /// index of the conclusion like every other step. It answers no message, and cannot be holding one: a
    /// rendezvous on a concluding step is <c>MailboxReceiptOnConclusion</c>, decided by the dispatch switch
    /// before this is reached.
    /// </summary>
    private static async Task<ProcessEngineCommandResult> ExecuteConclusion(
        PipelineConclusion.FinalStep final,
        IPipelineServiceTask serviceTask,
        ServiceTaskContext serviceTaskContext
    ) => MapServiceTaskResult(await final.Work(serviceTaskContext), serviceTask);

    /// <summary>
    /// <c>PipelineItemNotFound</c>: the step names an item the pipeline resolving at this hop does not have.
    /// The pipeline moved under this workflow while it was in flight — stages or handlers inserted, reordered
    /// or removed shift every index behind them — and an edit to the composed process invalidates an old
    /// enqueue exactly as an edited BPMN file does. The step list is fixed at enqueue time, so the workflow
    /// keeps addressing its item by the old index until it settles.
    /// </summary>
    /// <remarks>
    /// One code for every shape of step, receive steps included: the index space is items, so a receive step
    /// whose handler was withdrawn misses here for the same reason a stage step does, and this is the
    /// receiving half of the send side's <c>MailboxDeclarationNotFound</c>. A plain not-found verdict, because
    /// an index resolves to one item or none and there is no old value to stand anything in for. Permanent,
    /// for the reason every drift guard on this path is: the step's payload never changes, so a retry replays
    /// the same index against the same code. Nor may the runtime pick a neighbouring item — a handler that
    /// answers a different exchange would read this exchange's message and settle on it.
    /// </remarks>
    private static FailedProcessEngineCommandResult PipelineItemNotFound(string serviceTaskType, int itemIndex) =>
        FailedProcessEngineCommandResult.Permanent(
            $"Service task '{serviceTaskType}' composes no pipeline item at index {itemIndex}. A pipeline's "
                + "indexes are positions in its composition: if stages or reply handlers were inserted, "
                + "reordered or removed since this workflow was enqueued, every index behind the change has "
                + "moved. Resume the workflow on the code that enqueued it, or abandon it deliberately.",
            "PipelineItemNotFound"
        );

    /// <summary>
    /// <c>MailboxReceiptOnStage</c>: the engine handed a stage a mailbox rendezvous, and only a reply handler
    /// answers messages. Two routes, and with one index they are indistinguishable from here: the pipeline was
    /// reshaped since this workflow was enqueued, so the index a receive step carries now lands on a stage; or
    /// the workflow was not built by this application's pipeline expansion at all — an engine whose
    /// receive-workflow shape has drifted, or a hand-enqueued workflow. Permanent either way: the step's
    /// payload never changes, and running the stage would answer no message while repeating work.
    /// </summary>
    private static FailedProcessEngineCommandResult MailboxReceiptOnStage(string serviceTaskType, int itemIndex) =>
        FailedProcessEngineCommandResult.Permanent(
            $"The stage at index {itemIndex} of service task '{serviceTaskType}' was handed a mailbox message, "
                + "but only a pipeline's reply handler answers messages. Either the pipeline was reshaped since "
                + "this workflow was enqueued, so the index this step carries now lands on a stage, or the "
                + "workflow was not built by this application's pipeline expansion.",
            "MailboxReceiptOnStage"
        );

    /// <summary>
    /// <c>MailboxReceiptMissing</c>: a step whose item answers an exchange, handed no rendezvous. One general
    /// rule with two routes, and the message names both for the reason its two siblings do — with one index,
    /// nothing here can tell them apart: an engine that omitted the rendezvous from a receive workflow's
    /// callback, and a pipeline reshaped mid-flight so that a step which answers nothing (a concluding step,
    /// say, from a <c>Finally</c> since turned into a reply terminal) now lands on a reply handler. Permanent:
    /// answering without a rendezvous would end the exchange without ever reading the answer it is waiting for.
    /// </summary>
    private static FailedProcessEngineCommandResult MailboxReceiptMissing(string serviceTaskType, int itemIndex) =>
        FailedProcessEngineCommandResult.Permanent(
            $"The item at index {itemIndex} of service task '{serviceTaskType}' answers messages, but this "
                + "step was handed no mailbox rendezvous. Either the workflow engine omitted it from a receive "
                + "workflow's callback, or the pipeline was reshaped since this workflow was enqueued, so the "
                + "index a step that answers nothing carries now lands on a reply handler. Answering without a "
                + "rendezvous would end this exchange without ever reading the answer it is waiting for.",
            "MailboxReceiptMissing"
        );

    /// <summary>
    /// <c>MailboxReceiptOnConclusion</c>: a rendezvous on the pipeline's concluding step — the sibling of
    /// <c>MailboxReceiptOnStage</c>, one item along. A message is answered by a reply handler, never by the
    /// step that concludes the pipeline, so this is the same pair of routes that guard names: a mid-flight
    /// reshape landing a receive step's index on the conclusion, or a workflow this application's expansion
    /// did not build. Permanent, because the step's payload never changes: no retry gives the message a
    /// handler, and picking one would settle an exchange the step never named.
    /// </summary>
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

    /// <summary>
    /// <c>InvalidPayloadException</c>: the payload names no pipeline item. Every step this expansion builds
    /// carries the index of the item it runs — the concluding step included — so an index-less payload was
    /// written by a version of this app-lib whose step identity differed, and an old receive step's
    /// <c>repliesTo</c> lands here too, that property being skipped by deserialization. Permanent, because
    /// the step's payload never changes: a retry replays the same bytes, and defaulting to an index would run
    /// an arbitrary part of the pipeline.
    /// </summary>
    private static FailedProcessEngineCommandResult MissingItemIndex(string serviceTaskType) =>
        FailedProcessEngineCommandResult.Permanent(
            $"A step of service task '{serviceTaskType}' names no pipeline item. Every step of a pipeline — "
                + "its stages, its reply handlers and its conclusion alike — names the one item it runs by "
                + "that item's index, so this workflow was enqueued by a version of this app-lib that "
                + "identified steps differently. Resume it on the version that enqueued it, or abandon it "
                + "deliberately.",
            "InvalidPayloadException"
        );

    /// <summary>
    /// The <c>MailboxDeliveryEnvelopeInvalid</c> failure, kept out of <see cref="ExecuteReply"/>'s control flow
    /// because it is mostly wording. Permanent, because the bytes at a position never change; the handler is
    /// never called, so the exchange ends as a visibly failed workflow rather than on a message the platform
    /// cannot stand behind.
    /// </summary>
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
        IPipelineServiceTask task
    ) =>
        result switch
        {
            // A completed stage never advances the process — the pipeline just moves on to its
            // next engine step.
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
            // Reachable from app code by the route MailboxRelay.Decide's last arm documents, so permanent
            // rather than a throw the outer catch would make retryable.
            _ => UnknownResultType(
                task,
                result,
                nameof(ServiceTaskStageResult),
                $"{nameof(ServiceTaskStageResult.Completed)}, {nameof(ServiceTaskStageResult.Defer)}, "
                    + $"{nameof(ServiceTaskStageResult.FailedRetryable)} or "
                    + $"{nameof(ServiceTaskStageResult.FailedPermanent)}"
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
            // Explicit rather than a catch-all, because the catch-all this replaces concluded an unmapped
            // result as a silent success. Reachable from app code by the route MailboxRelay.Decide's last arm
            // documents, so permanent rather than a throw the outer catch would make retryable.
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
    /// A result type neither mapper knows. An author error rather than drift — see the last arm of
    /// <see cref="MailboxRelay.Decide"/> for how one reaches a runtime whose result roots declare no
    /// accessible constructor — so it fails <em>permanently</em> and names the type: a throw here would be
    /// caught by <see cref="Execute"/> and retried forever on a mistake no retry can fix.
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
    /// <c>ServiceTaskFailedException</c>: the reason code every failure a service task's <em>own code</em>
    /// reported carries, whichever part of the pipeline reported it — a stage, the conclusion, or a reply
    /// handler by way of <see cref="MailboxRelay"/>. Shared with that class rather than duplicated: the code
    /// is operator-visible and reaches in-flight workflows, so two literals would let a reword show apps two
    /// different codes for one condition.
    /// </summary>
    internal const string FailedReasonCode = "ServiceTaskFailedException";

    /// <summary>
    /// The sentence such a failure is reported as, shared with <see cref="MailboxRelay"/>'s handler-failure
    /// arms for the reason <see cref="FailedReasonCode"/> gives.
    /// </summary>
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
