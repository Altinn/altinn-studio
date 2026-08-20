using System.Diagnostics;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for the ExecuteServiceTask command: the service task type and, optionally, the
/// pipeline stage this engine step executes. <see cref="StageName"/> is null exactly when the
/// step runs the pipeline's conclusion (its <c>Finally</c> — for an <see cref="IServiceTask"/>,
/// its <c>Execute</c>).
/// </summary>
internal sealed record ExecuteServiceTaskPayload(string ServiceTaskType, string? StageName = null)
    : CommandRequestPayload;

internal sealed class ExecuteServiceTask(
    AppImplementationFactory appImplementationFactory,
    IWorkflowEngineClient workflowEngineClient,
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

    /// <summary>
    /// What <see cref="ServiceTaskContext.Mailbox"/> says when the task opens none — a constant,
    /// since it is the answer for every execution of every service task that never asked for one.
    /// </summary>
    private const string NoMailboxDeclaredReason =
        "ServiceTaskContext.Mailbox was read, but this task opens no mailbox. Declare one on the pipeline with "
        + "WithReplyFrom(\"<stage>\", new MailboxOptions { Timeout = … }), and read it in that stage.";

    /// <summary>
    /// What <see cref="ServiceTaskContext.Reply"/> says when the task opens no mailbox — a constant,
    /// like <see cref="NoMailboxDeclaredReason"/>, and for the same reason.
    /// </summary>
    private const string NoMailboxDeclaredReplyReason =
        "ServiceTaskContext.Reply was read, but this task is not answered by a message. Declare a mailbox on the "
        + "pipeline with WithReplyFrom(\"<stage>\", new MailboxOptions { Timeout = … }); the pipeline's Finally "
        + "then runs once per message, with the message in ServiceTaskContext.Reply.";

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

            // The stage name routes within the pipeline: null is the conclusion (the pipeline's
            // Finally — for a simple task, its Execute), a name is one of the composed stages.
            ServiceTaskPipeline pipeline = serviceTask.ResolvePipeline();

            // The mailbox is opened before the declaring stage's work runs, so the stage has an
            // address to publish in the very message it sends. Minting it is keyed on this step, so
            // an attempt that sent and then crashed is handed the same address on its retry.
            MailboxResolution mailbox = await ResolveMailbox(context, pipeline, payload.StageName);
            if (mailbox.Failure is { } mintFailure)
            {
                return mintFailure;
            }

            // What this execution answers, if anything: the message standing at its position, the
            // fact that the mailbox closed without one, or — for every stage and every task that is
            // not answered by a message — nothing at all.
            ReplyResolution reply = ResolveReply(context, pipeline, payload.StageName, serviceTaskType);
            if (reply.Failure is { } replyFailure)
            {
                return replyFailure;
            }

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
                MailboxOrDefault = mailbox.Mailbox,
                MailboxUnavailableReason = mailbox.UnavailableReason,
                ReplyOrDefault = reply.Reply,
                MailboxClosedReasonOrDefault = reply.ClosedReason,
                ReplyUnavailableReason = reply.UnavailableReason,
            };

            if (payload.StageName is { } stageName)
            {
                return await ExecuteStage(pipeline, serviceTask, stageName, serviceTaskContext);
            }

            ServiceTaskResult conclusion = await pipeline.Final(serviceTaskContext);

            // A conclusion that answers a message is the relay's, not the ordinary mapping's: which
            // verdicts end the exchange, and what the saga does about it, is one decision and lives
            // in one place.
            return context.Payload.Mailbox is { } receipt
                ? MailboxRelay.Decide(conclusion, serviceTaskType, context.Payload.StepId, receipt, context.StateCarry)
                : MapServiceTaskResult(conclusion, serviceTask);
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }

    /// <summary>
    /// What this execution knows about the pipeline's mailbox: the mailbox itself when this is the
    /// stage that opens it, otherwise the sentence explaining where it <em>is</em> readable — and, in
    /// place of both, the failure when the mailbox should have been opened and could not be.
    /// </summary>
    private readonly record struct MailboxResolution(
        ServiceTaskMailbox? Mailbox,
        string? UnavailableReason,
        FailedProcessEngineCommandResult? Failure
    );

    /// <summary>
    /// Mints the pipeline's mailbox when this execution is the stage that declared it; otherwise
    /// records why <see cref="ServiceTaskContext.Mailbox"/> is not readable here, so the throw the
    /// app sees names the stage that can read it rather than stating that something is missing.
    /// </summary>
    private async Task<MailboxResolution> ResolveMailbox(
        ProcessEngineCommandContext context,
        ServiceTaskPipeline pipeline,
        string? stageName
    )
    {
        // The overwhelmingly common case — a task that opens no mailbox at all — answers with a
        // constant, because this method runs on every service-task execution in every app.
        if (pipeline.Mailbox is not { } declaration)
        {
            return new MailboxResolution(null, NoMailboxDeclaredReason, null);
        }

        if (!string.Equals(declaration.StageName, stageName, StringComparison.Ordinal))
        {
            string executing = stageName is null ? "the pipeline's conclusion" : $"stage '{stageName}'";
            return new MailboxResolution(
                null,
                $"{nameof(ServiceTaskContext)}.{nameof(ServiceTaskContext.Mailbox)} was read in {executing}, but this "
                    + $"task's mailbox is opened by stage '{declaration.StageName}' and is readable only there. The "
                    + "stage that sends is the stage that publishes the address.",
                null
            );
        }

        // The mint's idempotency key is the executing step's id, which is what makes a retry replay
        // onto the mailbox this stage already published. An engine that did not send one would leave
        // it empty — and an empty key is a *constant*, so every mailbox in the namespace would
        // collapse onto one shared inbox and every task would read every other task's messages.
        // Refusing outright is the only safe answer, and it can only ever be a deployment mismatch.
        if (context.Payload.StepId == Guid.Empty)
        {
            return new MailboxResolution(
                null,
                null,
                FailedProcessEngineCommandResult.Permanent(
                    $"Stage '{declaration.StageName}' opens a mailbox, but the workflow engine supplied no step id to "
                        + "key it on. A mailbox keyed on an empty id would be shared by every task in this "
                        + "application. Upgrade the workflow engine to a version that sends stepId.",
                    "MailboxStepIdMissing"
                )
            );
        }

        MailboxMintResult result = await workflowEngineClient.MintMailbox(
            $"{context.AppId.Org}/{context.AppId.App}",
            new MailboxCreateRequest
            {
                IdempotencyKey = context.Payload.StepId.ToString(),
                Timeout = declaration.Options.Timeout,
                CollectionKey = ProcessNextRequestFactory.CreateCollectionKey(context.InstanceId),
            },
            context.CancellationToken
        );

        if (result is MailboxMintResult.Minted minted)
        {
            // The address has to outlive this callback: the step that enqueues the first receive
            // workflow runs later in the Main workflow and cannot re-derive the mint's key (it is this
            // stage's step id). Recording it on the carry puts it in the state blob this callback
            // publishes, from where every step in between forwards it untouched.
            //
            // The carry escapes this attempt only if the attempt succeeds — a failing callback returns
            // without capturing state at all, and a deferral echoes the incoming blob unchanged — so
            // recording here rather than after the stage's work changes nothing. What hands a retry the
            // address its predecessor published is the mint above, keyed on this step's id.
            context.StateCarry.RecordMailbox(minted.Mailbox.Id);
        }

        return result switch
        {
            MailboxMintResult.Minted m => new MailboxResolution(
                new ServiceTaskMailbox { Id = m.Mailbox.Id, Deadline = m.Mailbox.Deadline },
                null,
                null
            ),

            // The engine read the declaration and found it impossible — most often a Timeout past the
            // engine's maximum, which app startup cannot check because the maximum is the engine's.
            // Retrying replays the same rejection, so this fails the transition once, with the
            // engine's own words, instead of a day later with none.
            MailboxMintResult.Rejected rejected => new MailboxResolution(
                null,
                null,
                FailedProcessEngineCommandResult.Permanent(
                    $"The workflow engine refused the mailbox opened by stage '{declaration.StageName}': "
                        + $"{rejected.Detail}",
                    "MailboxRejected"
                )
            ),

            // The collection is at its open-mailbox cap. Retryable — the cap clears as mailboxes
            // reach their deadlines — but named on the first failure, because a cap hit here means
            // this instance already holds the maximum number of open mailboxes, a runaway ops should
            // see rather than a bare 429 repeated up the ladder.
            MailboxMintResult.AtCapacity atCapacity => new MailboxResolution(
                null,
                null,
                FailedProcessEngineCommandResult.Retryable(
                    $"The workflow engine could not open the mailbox for stage '{declaration.StageName}' yet: "
                        + $"{atCapacity.Detail}",
                    "MailboxAtCapacity"
                )
            ),

            _ => throw new UnreachableException($"Unknown mailbox mint result type: {result.GetType().Name}"),
        };
    }

    /// <summary>
    /// What this execution knows about the message it answers: the message, or the closure that
    /// stands in for one, or the sentence explaining that this execution answers no message at all —
    /// and, in place of all three, the failure when the engine's rendezvous block and the pipeline's
    /// own declaration contradict each other.
    /// </summary>
    private readonly record struct ReplyResolution(
        ServiceTaskReply? Reply,
        MailboxClosedReason? ClosedReason,
        string? UnavailableReason,
        FailedProcessEngineCommandResult? Failure
    );

    /// <summary>
    /// Reads the engine's rendezvous block into the shape the pipeline's conclusion sees, or records
    /// why this execution has none to read.
    /// </summary>
    /// <remarks>
    /// Every disagreement between the block and the pipeline is a permanent failure rather than a
    /// silent default, because the two ways to be wrong here are the two ways this design can lie: a
    /// conclusion told "no message" when one exists would answer the wrong question, and a
    /// conclusion told nothing at all where a message was expected would conclude the task on
    /// nothing. Neither is a state a retry can improve.
    /// </remarks>
    private ReplyResolution ResolveReply(
        ProcessEngineCommandContext context,
        ServiceTaskPipeline pipeline,
        string? stageName,
        string serviceTaskType
    )
    {
        AppCallbackMailbox? receipt = context.Payload.Mailbox;

        if (stageName is { } executingStage)
        {
            // The engine puts the block on a receive workflow's first step and nowhere else, and a
            // receive workflow's one step is the conclusion — so a stage carrying one means the
            // workflow was not built by this app-lib's expansion.
            if (receipt is not null)
            {
                return new ReplyResolution(
                    null,
                    null,
                    null,
                    FailedProcessEngineCommandResult.Permanent(
                        $"Stage '{executingStage}' of service task '{serviceTaskType}' was handed a mailbox message, "
                            + "but only a pipeline's conclusion answers messages. This workflow was not built by this "
                            + "application's pipeline expansion.",
                        "MailboxReceiptOnStage"
                    )
                );
            }

            return new ReplyResolution(
                null,
                null,
                $"{nameof(ServiceTaskContext)}.{nameof(ServiceTaskContext.Reply)} was read in stage "
                    + $"'{executingStage}', but a stage never answers a message. The pipeline's conclusion is what "
                    + "runs once per message; a stage runs once, before the exchange opens or as part of opening it.",
                null
            );
        }

        if (pipeline.Mailbox is null)
        {
            if (receipt is not null)
            {
                return new ReplyResolution(
                    null,
                    null,
                    null,
                    FailedProcessEngineCommandResult.Permanent(
                        $"Service task '{serviceTaskType}' was handed a mailbox message, but its pipeline declares no "
                            + "mailbox. The declaration was removed while an exchange was in flight, or this workflow "
                            + "belongs to a different task.",
                        "MailboxReceiptWithoutDeclaration"
                    )
                );
            }

            return new ReplyResolution(null, null, NoMailboxDeclaredReplyReason, null);
        }

        // A declaring pipeline's conclusion is emitted on receive workflows only, so it can only run
        // with a rendezvous block. Without one it would conclude the task on nothing, which is the
        // exact state this step exists to end.
        if (receipt is null)
        {
            return new ReplyResolution(
                null,
                null,
                null,
                FailedProcessEngineCommandResult.Permanent(
                    $"Service task '{serviceTaskType}' is answered by a message, but the workflow engine handed its "
                        + "conclusion no mailbox rendezvous. Concluding here would settle the task without ever "
                        + "reading the answer it is waiting for.",
                    "MailboxReceiptMissing"
                )
            );
        }

        // Exactly one of the two is present, by the engine's contract. Both absent cannot be read as
        // "closed": an absent message is an instruction to conclude the exchange, not an absence of
        // information, so accepting it unstated would let a malformed callback end an exchange.
        if ((receipt.Delivery is null) == (receipt.DisposedReason is null))
        {
            return new ReplyResolution(
                null,
                null,
                null,
                FailedProcessEngineCommandResult.Permanent(
                    $"Service task '{serviceTaskType}' was handed a mailbox rendezvous carrying "
                        + (
                            receipt.Delivery is null
                                ? "neither a message nor a reason the mailbox closed"
                                : "both a message and a reason the mailbox closed"
                        )
                        + ". Exactly one of the two is always present, so this callback cannot be answered.",
                    "MailboxReceiptAmbiguous"
                )
            );
        }

        if (receipt.Delivery is { } delivery)
        {
            // The body the handler reads is the one this app forwarded, or the step does not run at
            // all. The envelope is bound to this mailbox, this service task and this idempotency key,
            // all three read from the delivered callback — so opening it is what makes those three
            // trustworthy rather than the opening trusting them.
            string body;
            try
            {
                body = deliveryEnvelope.Unwrap(delivery.Payload, receipt.Id, serviceTaskType, delivery.IdempotencyKey);
            }
            catch (MailboxDeliveryEnvelopeException ex)
            {
                // Permanent: the bytes at this position never change, so every retry re-derives the
                // same refusal. Concluding on the raw payload instead would hand a handler content
                // nothing vouched for, which is the whole point of the envelope; and the handler is
                // never called, so the exchange ends as a visible failed workflow rather than on a
                // message the platform cannot stand behind.
                return new ReplyResolution(
                    null,
                    null,
                    null,
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
                    )
                );
            }

            return new ReplyResolution(
                new ServiceTaskReply
                {
                    Payload = body,
                    IdempotencyKey = delivery.IdempotencyKey,
                    AcceptedAt = delivery.AcceptedAt,
                    Position = receipt.Seq,
                },
                null,
                null,
                null
            );
        }

        return new ReplyResolution(
            null,
            receipt.DisposedReason switch
            {
                MailboxDisposedReason.Deadline => MailboxClosedReason.Deadline,
                _ => MailboxClosedReason.Request,
            },
            null,
            null
        );
    }

    private static async Task<ProcessEngineCommandResult> ExecuteStage(
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

        return MapStageResult(await stage.Work(serviceTaskContext), serviceTask);
    }

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
            _ => throw new UnreachableException($"Unknown stage result type: {result.GetType().Name}"),
        };

    /// <summary>
    /// What a conclusion that answers no message is told when it asks for another one. Only the
    /// conclusion of a pipeline that declared a mailbox holds a message, so nothing else has one to
    /// follow, and there is no receiver to enqueue.
    /// </summary>
    private static FailedProcessEngineCommandResult AwaitNextReplyOutsideAnExchange(IPipelineServiceTask task) =>
        FailedProcessEngineCommandResult.Permanent(
            $"Service task '{task.Type}' answered AwaitNextReply, but this execution is not answering a mailbox "
                + "message, so there is no next message to await. Only the conclusion of a pipeline that declared "
                + "WithReplyFrom may return it.",
            "AwaitNextReplyOutsideAnExchange"
        );

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
            // Explicit, ahead of the catch-all: falling through would answer "success, do not
            // advance" and settle a task that believes it is still waiting for a message.
            ServiceTaskAwaitNextReplyResult => AwaitNextReplyOutsideAnExchange(task),
            ServiceTaskSuccessResult { AutoAdvanceProcess: true } success => new SuccessfulProcessEngineCommandResult
            {
                AutoAdvanceProcess = true,
                AutoAdvanceAction = success.Action,
            },
            _ => new SuccessfulProcessEngineCommandResult(),
        };

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
