using System.Diagnostics;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
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
    /// A pipeline stage: its work, handed the mailbox it opens when it is the stage that declared one.
    /// </summary>
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

        // The rendezvous block only ever rides a receive workflow's one step — the reply handler — so a stage
        // carrying one was not built by this app-lib's expansion.
        if (context.Payload.Mailbox is not null)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"Stage '{stageName}' of service task '{serviceTask.Type}' was handed a mailbox message, but only a "
                    + "pipeline's reply handler answers messages. This workflow was not built by this application's "
                    + "pipeline expansion.",
                "MailboxReceiptOnStage"
            );
        }

        ServiceTaskMailbox? mailbox = null;
        if (stage.OpensMailbox is not null)
        {
            // The mailbox the declaring stage sends as its reply address, minted by the MintMailbox step that ran
            // immediately before it and read back out of the carry here. A broken carry, which retrying only
            // repeats: the stage cannot publish an address it was not handed.
            if (context.StateCarry.FindMailbox(stage.Name) is not { } carried)
            {
                return FailedProcessEngineCommandResult.Permanent(
                    $"Stage '{stage.Name}' opens a mailbox, but no mailbox id for it reached this step in "
                        + "the workflow state. The mint step records it immediately before this stage runs; a step "
                        + "between the two must have dropped it.",
                    "MailboxIdMissingFromState"
                );
            }

            mailbox = new ServiceTaskMailbox { Id = carried.Id, Deadline = carried.Deadline };
        }

        return MapStageResult(await stage.Work(serviceTaskContext, mailbox), serviceTask);
    }

    /// <summary>
    /// One execution of an exchange's reply handler: exactly one message, or the news that no message can
    /// arrive. Every block/pipeline disagreement below is a permanent failure rather than a silent default:
    /// either wrong answer concludes the task falsely.
    /// </summary>
    private async Task<ProcessEngineCommandResult> ExecuteReply(
        ProcessEngineCommandContext context,
        PipelineConclusion.ReplyExchange exchange,
        string serviceTaskType,
        ServiceTaskContext serviceTaskContext
    )
    {
        // A reply handler only runs on receive workflows, so it must have a block.
        if (context.Payload.Mailbox is not { } receipt)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"Service task '{serviceTaskType}' is answered by a message, but the workflow engine handed its "
                    + "reply handler no mailbox rendezvous. Concluding here would settle the task without ever "
                    + "reading the answer it is waiting for.",
                "MailboxReceiptMissing"
            );
        }

        // Exactly one is present, by contract. "Neither" must not read as closed: an absent message is an
        // instruction to conclude, not an absence of information.
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
                // Permanent: the bytes never change. The handler is never called, so the exchange ends as a visible
                // failed workflow rather than on a message the platform cannot stand behind.
                return FailedProcessEngineCommandResult.Permanent(
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
