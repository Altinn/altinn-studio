using System.Diagnostics;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for the ExecuteServiceTask command: the service task type, and which part of the
/// pipeline this engine step runs — said by whichever one name the payload carries.
/// </summary>
/// <remarks>
/// <para>
/// <strong>At most one of <see cref="StageName"/> and <see cref="RepliesTo"/> is ever set.</strong> A step
/// runs a stage, answers an exchange, or is the pipeline's conclusion, and the three are told apart by the
/// name present rather than by a flag or by re-deriving the shape from the pipeline. Nothing outside this
/// app-lib's own expansion constructs one of these, so the invariant is established where the payload is
/// written and guarded where it is read: both names set is a permanent <c>InvalidPayloadException</c> in
/// <see cref="ExecuteServiceTask.Execute"/>, a payload written by a version of this app-lib whose step
/// identity differed.
/// </para>
/// <para>
/// Guarded there rather than in a constructor on purpose. The payload is deserialized by
/// <c>WorkflowEngineCommandBase</c> outside any handler, so a throwing constructor would leave the
/// callback as an unhandled exception instead of the legible permanent failure every other payload-shape
/// violation here gets (see <see cref="EnqueueReceiveWorkflow"/>'s own <c>InvalidPayloadException</c>).
/// </para>
/// </remarks>
/// <param name="ServiceTaskType">The service task whose pipeline this step dispatches into.</param>
/// <param name="StageName">The stage this step runs, for a stage step.</param>
/// <param name="RepliesTo">
/// The stage that opened the exchange this step answers, for a receive step — the exchange's identity,
/// fixed when this receiver was enqueued and never re-derived at the hop that runs it, so a stage renamed
/// mid-flight cannot silently address a different exchange.
/// </param>
internal sealed record ExecuteServiceTaskPayload(
    string ServiceTaskType,
    string? StageName = null,
    string? RepliesTo = null
) : CommandRequestPayload;

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

            // Both names set. At most one is ever written, so this payload comes from a version of this
            // app-lib whose step identity differed, and reading it under either name would run the wrong part
            // of the pipeline. Refused before the dispatch below, whose arms each assume one name.
            if (payload is { StageName: not null, RepliesTo: not null })
            {
                return BothStepNames(serviceTaskType, payload);
            }

            // Which part of the pipeline this step runs, decided once from the one name the payload carries
            // and the shape the pipeline resolves to at this hop. Each branch then assumes its shape rather
            // than re-interrogating nullable fields to rediscover it.
            if (payload.StageName is { } stageName)
            {
                return await ExecuteStage(context, pipeline, serviceTask, stageName, serviceTaskContext);
            }

            return (payload.RepliesTo, pipeline.Conclusion) switch
            {
                // A receive step, answering the exchange it names. Which handler runs is re-derived from the
                // pipeline at this hop — a reply terminal is the only shape that can answer an exchange, so a
                // ReplyExchange conclusion is the whole lookup — while the exchange's identity is the name the
                // step carries, and that is what travels on to the successor and the carry.
                ({ } repliesTo, PipelineConclusion.ReplyExchange exchange) => await ExecuteReply(
                    context,
                    exchange,
                    repliesTo,
                    serviceTaskType,
                    serviceTaskContext
                ),

                // A step naming no exchange on a pipeline that answers one. Two jobs, which is why this cell
                // is not folded into the arm above:
                // - It is THE COMPATIBILITY ARM for a receiver enqueued before receive steps named their
                //   exchange: such a receiver arrives with a rendezvous and must still be answered, with the
                //   pipeline's own opening stage standing in for the name it never carried. Do not narrow this
                //   arm away while such workflows can still be in flight.
                // - Without a rendezvous it is the redeploy MailboxReceiptMissing is written for: a
                //   reply-answered pipeline emits no concluding step of its own, so a bare one reaching this
                //   pipeline arrives with nothing to answer.
                (null, PipelineConclusion.ReplyExchange exchange) => await ExecuteReply(
                    context,
                    exchange,
                    repliesTo: null,
                    serviceTaskType,
                    serviceTaskContext
                ),

                // Neither name: the pipeline's conclusion, its Finally.
                (null, PipelineConclusion.FinalStep final) => await ExecuteConclusion(
                    context,
                    final,
                    serviceTask,
                    serviceTaskType,
                    serviceTaskContext
                ),

                // A receive step whose exchange this pipeline no longer answers at all — the reply terminal
                // was withdrawn while the exchange was in flight. The same miss the conclusion arm reports for
                // a rendezvous it cannot account for, in its own words, since this arm does not require one.
                // Naming this step's exchange is what the handler lookup will do once a pipeline can answer
                // one from more than one place.
                (not null, PipelineConclusion.FinalStep) => MailboxReceiptWithoutDeclaration(
                    serviceTaskType,
                    "has a step naming an exchange to answer"
                ),

                // Drift guard for this assembly's own vocabulary: PipelineConclusion is a closed two-member set,
                // so the only way here is a third conclusion shape added without a branch to execute it.
                _ => throw new UnreachableException(
                    $"Unknown pipeline conclusion type: {pipeline.Conclusion.GetType().Name}"
                ),
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
    /// exactly the arguments it declares.
    /// </summary>
    /// <remarks>
    /// Two drift guards run before either shape does:
    /// <list type="bullet">
    /// <item>
    /// <term><c>ServiceTaskStageNotFound</c></term>
    /// <description>
    /// a redeploy renamed or removed this stage while a workflow enqueued against it was in flight. The step
    /// list is fixed at enqueue time, so the workflow keeps calling back by the old name until it settles.
    /// </description>
    /// </item>
    /// <item>
    /// <term><c>MailboxReceiptOnStage</c></term>
    /// <description>
    /// the engine handed a stage a mailbox rendezvous. The rendezvous only ever rides a receive workflow's one
    /// step — the reply handler — so a stage carrying one belongs to a workflow this app-lib's expansion did
    /// not build: an engine whose receive-workflow shape has drifted, or a hand-enqueued workflow.
    /// </description>
    /// </item>
    /// </list>
    /// </remarks>
    private static async Task<ProcessEngineCommandResult> ExecuteStage(
        ProcessEngineCommandContext context,
        ServiceTaskPipeline pipeline,
        IPipelineServiceTask serviceTask,
        string stageName,
        ServiceTaskContext serviceTaskContext
    )
    {
        ServiceTaskStage? stage = pipeline.FindStage(stageName);
        if (stage is null)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"Service task '{serviceTask.Type}' composes no stage named '{stageName}'. Stage names are a "
                    + "compatibility surface for in-flight workflows: if the stage was renamed or removed since this "
                    + "workflow was enqueued, redeploy with the original name restored in "
                    + $"{nameof(IPipelineServiceTask.Define)} and resume the workflow.",
                "ServiceTaskStageNotFound"
            );
        }

        if (context.Payload.Mailbox is not null)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"Stage '{stageName}' of service task '{serviceTask.Type}' was handed a mailbox message, but only a "
                    + "pipeline's reply handler answers messages. This workflow was not built by this application's "
                    + "pipeline expansion.",
                "MailboxReceiptOnStage"
            );
        }

        return stage switch
        {
            ServiceTaskStage.Plain plain => MapStageResult(await plain.Work(serviceTaskContext), serviceTask),
            ServiceTaskStage.MailboxOpening opening => await ExecuteMailboxOpeningStage(
                context,
                opening,
                serviceTask,
                serviceTaskContext
            ),
            // Drift guard for this assembly's own vocabulary: ServiceTaskStage is a closed two-member set, so
            // the only way here is a third stage shape added without a branch to execute it.
            _ => throw new UnreachableException($"Unknown service task stage type: {stage.GetType().Name}"),
        };
    }

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
    /// a redeploy <em>added</em> the declaration to this stage while a workflow enqueued against the
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
        IPipelineServiceTask serviceTask,
        ServiceTaskContext serviceTaskContext
    )
    {
        if (context.StateCarry.FindMailbox(stage.Name) is not { } carried)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"Stage '{stage.Name}' opens a mailbox, but no mailbox id for it reached this step in the workflow "
                    + "state. Either this workflow was enqueued before the stage opened one — its step list was "
                    + "fixed then, and holds no mint step to record an id — or the mint step ran immediately before "
                    + "this stage and its record did not survive into this step's state. If the declaration was "
                    + $"just added to '{stage.Name}': every workflow enqueued against the previous shape fails "
                    + "here, so redeploy with it rolled back and resume them, or abandon them deliberately.",
                "MailboxIdMissingFromState"
            );
        }

        ServiceTaskMailbox mailbox = new() { Id = carried.Id, Deadline = carried.Deadline };
        return MapStageResult(await stage.Work(serviceTaskContext, mailbox), serviceTask);
    }

    /// <summary>
    /// One execution of an exchange's reply handler: exactly one message, or the news that no message can
    /// arrive. Every disagreement between the engine's rendezvous and this pipeline is a permanent failure
    /// rather than a silent default — either wrong answer concludes the task falsely.
    /// </summary>
    /// <remarks>
    /// Three guards run before the handler does. The first two are drift guards, unreachable from app code,
    /// which is why they survived the compile-time move. The third is not: it guards runtime-supplied
    /// integration data no type can bind.
    /// <list type="bullet">
    /// <item>
    /// <term><c>MailboxReceiptMissing</c></term>
    /// <description>
    /// this pipeline is answered by a message, but the engine handed the step no rendezvous. Reached by a
    /// redeploy that turned a <c>Finally</c> into a reply terminal while a workflow was in flight — that
    /// workflow's Main still carries a bare concluding step, which arrives here with nothing to answer — and
    /// by an engine that omitted the rendezvous from a receive workflow's callback.
    /// </description>
    /// </item>
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
    /// code</strong>, unlike the two above: <see cref="IServiceTaskReplyForwarder"/> takes both the mailbox id
    /// and the service task type from its caller — deliberately, because deriving either can sign its own
    /// mistake — so forwarding under the wrong one seals for a different mailbox or task and fails the unwrap
    /// here. The other routes are a forged or altered delivery and an app code that expired while the message
    /// waited unread at its position; that last needs nothing to be wrong with the message, which is why the
    /// wording names it.
    /// </description>
    /// </item>
    /// </list>
    /// </remarks>
    /// <param name="context">The callback being executed.</param>
    /// <param name="exchange">The reply terminal answering this exchange, re-derived at this hop.</param>
    /// <param name="repliesTo">
    /// The exchange's identity as the step carries it, or <c>null</c> for a receiver enqueued before receive
    /// steps carried one. This — not the pipeline's current opening stage — is what the successor is enqueued
    /// against and what the carry is keyed on, so a stage renamed mid-flight cannot make the successor address
    /// a different exchange or make the concluding write miss the entry it must drop.
    /// </param>
    /// <param name="serviceTaskType">The task whose exchange this is.</param>
    /// <param name="serviceTaskContext">The context handed to whichever handler runs.</param>
    private async Task<ProcessEngineCommandResult> ExecuteReply(
        ProcessEngineCommandContext context,
        PipelineConclusion.ReplyExchange exchange,
        string? repliesTo,
        string serviceTaskType,
        ServiceTaskContext serviceTaskContext
    )
    {
        if (context.Payload.Mailbox is not { } receipt)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"Service task '{serviceTaskType}' is answered by a message, but the workflow engine handed its "
                    + "reply handler no mailbox rendezvous. Concluding here would settle the task without ever "
                    + "reading the answer it is waiting for.",
                "MailboxReceiptMissing"
            );
        }

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

        ServiceTaskExchangeResult verdict;
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

            verdict = await exchange.OnMessage(
                serviceTaskContext,
                new ServiceTaskReply
                {
                    Payload = body,
                    IdempotencyKey = delivery.IdempotencyKey,
                    AcceptedAt = delivery.AcceptedAt,
                    Position = receipt.Seq,
                }
            );
        }
        else
        {
            verdict = await exchange.OnClosed(
                serviceTaskContext,
                receipt.DisposedReason switch
                {
                    MailboxDisposedReason.Deadline => MailboxClosedReason.Deadline,
                    _ => MailboxClosedReason.Request,
                }
            );
        }

        return MailboxRelay.Decide(
            verdict,
            serviceTaskType,
            context.Payload.StepId,
            receipt,
            context.StateCarry,
            // The carried name, falling back to the pipeline's own only for a receiver that carries none: the
            // exchange's identity is fixed at its first enqueue, and re-deriving it here would hand a
            // mid-flight rename to both the successor's enqueue and the carry key the conclusion drops.
            repliesTo ?? exchange.OpeningStageName
        );
    }

    /// <summary>
    /// The pipeline's concluding step, for a task that answers no message — Main's last step.
    /// </summary>
    /// <remarks>
    /// One drift guard, <c>MailboxReceiptWithoutDeclaration</c>: the engine handed a rendezvous to a pipeline
    /// that opens no mailbox. Reached by a receive workflow whose mailbox belongs to one task while its step
    /// payload names another, which is the task this execution resolved and found mailbox-free, and by a
    /// workflow this app-lib's expansion did not build — one carrying a mailbox declaration on a step that
    /// names no exchange.
    /// </remarks>
    private static async Task<ProcessEngineCommandResult> ExecuteConclusion(
        ProcessEngineCommandContext context,
        PipelineConclusion.FinalStep final,
        IPipelineServiceTask serviceTask,
        string serviceTaskType,
        ServiceTaskContext serviceTaskContext
    )
    {
        if (context.Payload.Mailbox is not null)
        {
            return MailboxReceiptWithoutDeclaration(serviceTaskType, "was handed a mailbox message");
        }

        return MapServiceTaskResult(await final.Work(serviceTaskContext), serviceTask);
    }

    /// <summary>
    /// <c>MailboxReceiptWithoutDeclaration</c>: this pipeline has no reply handler for the exchange in front
    /// of it. Kept out of both call sites' control flow because it is mostly wording, and shared by them
    /// because they are one miss reached two ways — a receive step naming an exchange the pipeline no longer
    /// answers, and a concluding step handed a rendezvous the pipeline cannot account for.
    /// </summary>
    /// <param name="serviceTaskType">The task whose pipeline answers no message.</param>
    /// <param name="observed">
    /// What made the miss visible, in the caller's own words — the two routes notice it by different things,
    /// and only one of them has a rendezvous to point at. Parameterized for the reason
    /// <c>MailboxReceiptAmbiguous</c> parameterizes its own middle clause: one reason code, one shared
    /// explanation, and no sentence claiming something its caller never checked.
    /// </param>
    private static FailedProcessEngineCommandResult MailboxReceiptWithoutDeclaration(
        string serviceTaskType,
        string observed
    ) =>
        FailedProcessEngineCommandResult.Permanent(
            $"Service task '{serviceTaskType}' {observed}, but its pipeline opens no "
                + "mailbox. The declaration was removed while an exchange was in flight, or this workflow "
                + "belongs to a different task.",
            "MailboxReceiptWithoutDeclaration"
        );

    /// <summary>
    /// <c>InvalidPayloadException</c>: the payload names both a stage and an exchange. App-lib drift — this
    /// app-lib's expansion writes at most one of the two, so the workflow was enqueued by a version whose
    /// step identity differed. Permanent, because the step's payload never changes: a retry replays the same
    /// bytes, and guessing which name to honour would run the wrong part of the pipeline.
    /// </summary>
    private static FailedProcessEngineCommandResult BothStepNames(
        string serviceTaskType,
        ExecuteServiceTaskPayload payload
    ) =>
        FailedProcessEngineCommandResult.Permanent(
            $"A step of service task '{serviceTaskType}' names both the stage '{payload.StageName}' and the "
                + $"exchange opened by stage '{payload.RepliesTo}'. A step is one or the other — it runs a "
                + "stage, answers an exchange, or is the pipeline's conclusion — so this workflow was "
                + "enqueued by a version of this app-lib that identified steps differently. Resume it on the "
                + "version that enqueued it, or abandon it deliberately.",
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

    private static FailedProcessEngineCommandResult MapFailure(
        IPipelineServiceTask task,
        string errorMessage,
        bool permanent
    )
    {
        string message = $"Service task '{task.Type}' failed: {errorMessage}";
        return permanent
            ? FailedProcessEngineCommandResult.Permanent(message, "ServiceTaskFailedException")
            : FailedProcessEngineCommandResult.Retryable(message, "ServiceTaskFailedException");
    }
}
