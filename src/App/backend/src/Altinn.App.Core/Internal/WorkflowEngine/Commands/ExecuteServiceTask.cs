using System.Diagnostics;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for the ExecuteServiceTask command: the service task type and, optionally, the
/// pipeline stage this engine step executes. <see cref="StageName"/> is null exactly when the
/// step runs the pipeline's conclusion — its <c>Finally</c> (for an <see cref="IServiceTask"/>, its
/// <c>Execute</c>), or the reply handler answering the mailbox a stage opened.
/// </summary>
internal sealed record ExecuteServiceTaskPayload(string ServiceTaskType, string? StageName = null)
    : CommandRequestPayload;

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

            if (payload.StageName is { } stageName)
            {
                return await ExecuteStage(context, pipeline, serviceTask, stageName, serviceTaskContext);
            }

            return pipeline.Conclusion switch
            {
                PipelineConclusion.ReplyExchange exchange => await ExecuteReply(
                    context,
                    exchange,
                    serviceTaskType,
                    serviceTaskContext
                ),
                PipelineConclusion.FinalStep final => await ExecuteConclusion(
                    context,
                    final,
                    serviceTask,
                    serviceTaskType,
                    serviceTaskContext
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
    private async Task<ProcessEngineCommandResult> ExecuteReply(
        ProcessEngineCommandContext context,
        PipelineConclusion.ReplyExchange exchange,
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
            exchange.OpeningStageName
        );
    }

    /// <summary>
    /// The pipeline's concluding step, for a task that answers no message — Main's last step.
    /// </summary>
    /// <remarks>
    /// One drift guard, <c>MailboxReceiptWithoutDeclaration</c>: the engine handed a rendezvous to a pipeline
    /// that opens no mailbox. Reached by a redeploy that withdrew the reply terminal while an exchange was in
    /// flight — the receive workflow parked on that mailbox wakes into a pipeline that has forgotten it — and
    /// by a receive workflow whose mailbox belongs to one task while its step payload names another, which is
    /// the task this execution resolved and found mailbox-free.
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
            return FailedProcessEngineCommandResult.Permanent(
                $"Service task '{serviceTaskType}' was handed a mailbox message, but its pipeline opens no "
                    + "mailbox. The declaration was removed while an exchange was in flight, or this workflow "
                    + "belongs to a different task.",
                "MailboxReceiptWithoutDeclaration"
            );
        }

        return MapServiceTaskResult(await final.Work(serviceTaskContext), serviceTask);
    }

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
