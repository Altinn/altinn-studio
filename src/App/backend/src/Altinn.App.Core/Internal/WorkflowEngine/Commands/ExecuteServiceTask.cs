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
/// step runs the pipeline's conclusion (its <c>Finally</c> — for an <see cref="IServiceTask"/>,
/// its <c>Execute</c>).
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

    private const string NoMailboxDeclaredReason =
        "ServiceTaskContext.Mailbox was read, but this task opens no mailbox. Declare one on the pipeline with "
        + "WithReplyFrom(\"<stage>\", new MailboxOptions { Timeout = … }), and read it in that stage.";

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

            ServiceTaskPipeline pipeline = serviceTask.ResolvePipeline();

            // The mailbox the declaring stage sends as its reply address, minted by the MintMailbox step
            // that ran immediately before it and read back out of the carry here.
            MailboxResolution mailbox = ResolveMailbox(context, pipeline, payload.StageName);
            if (mailbox.Failure is { } mailboxFailure)
            {
                return mailboxFailure;
            }

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

            // ResolveReply refused both mismatched pairs already, so a receipt and a declaration are present
            // together or absent together; the declaration names the exchange the relay concludes.
            return (context.Payload.Mailbox, pipeline.Mailbox) switch
            {
                ({ } receipt, { } declaration) => MailboxRelay.Decide(
                    conclusion,
                    serviceTaskType,
                    context.Payload.StepId,
                    receipt,
                    context.StateCarry,
                    declaration.StageName
                ),
                _ => MapServiceTaskResult(conclusion, serviceTask),
            };
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }

    private readonly record struct MailboxResolution(
        ServiceTaskMailbox? Mailbox,
        string? UnavailableReason,
        FailedProcessEngineCommandResult? Failure
    );

    /// <summary>
    /// The mailbox for this execution: the declaring stage reads the one <see cref="MintMailbox"/> published
    /// immediately before it; every other execution gets the reason reading it is unavailable.
    /// </summary>
    private static MailboxResolution ResolveMailbox(
        ProcessEngineCommandContext context,
        ServiceTaskPipeline pipeline,
        string? stageName
    )
    {
        // The overwhelmingly common case answers with a constant: this runs on every service-task execution.
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

        // A broken carry, which retrying only repeats: the stage cannot publish an address it was not handed.
        if (context.StateCarry.FindMailbox(declaration.StageName) is not { } carried)
        {
            return new MailboxResolution(
                null,
                null,
                FailedProcessEngineCommandResult.Permanent(
                    $"Stage '{declaration.StageName}' opens a mailbox, but no mailbox id for it reached this step in "
                        + "the workflow state. The mint step records it immediately before this stage runs; a step "
                        + "between the two must have dropped it.",
                    "MailboxIdMissingFromState"
                )
            );
        }

        return new MailboxResolution(
            new ServiceTaskMailbox { Id = carried.Id, Deadline = carried.Deadline },
            null,
            null
        );
    }

    private readonly record struct ReplyResolution(
        ServiceTaskReply? Reply,
        MailboxClosedReason? ClosedReason,
        string? UnavailableReason,
        FailedProcessEngineCommandResult? Failure
    );

    /// <summary>
    /// Every block/pipeline disagreement is a permanent failure rather than a silent default: either wrong
    /// answer concludes the task falsely.
    /// </summary>
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
            // The block only ever rides a receive workflow's one step — the conclusion — so a stage carrying one
            // was not built by this app-lib's expansion.
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

        // A declaring pipeline's conclusion only runs on receive workflows, so it must have a block.
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

        // Exactly one is present, by contract. "Neither" must not read as closed: an absent message is an
        // instruction to conclude, not an absence of information.
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
            // Opening the envelope is what makes the mailbox id, task type and idempotency key trustworthy — all
            // three are read from the delivered callback.
            string body;
            try
            {
                body = deliveryEnvelope.Unwrap(delivery.Payload, receipt.Id, serviceTaskType, delivery.IdempotencyKey);
            }
            catch (MailboxDeliveryEnvelopeException ex)
            {
                // Permanent: the bytes never change. The handler is never called, so the exchange ends as a visible
                // failed workflow rather than on a message the platform cannot stand behind.
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
            // Ahead of the catch-all: falling through would settle a task that thinks it is still waiting.
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
