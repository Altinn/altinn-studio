using System.Diagnostics;
using System.Globalization;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for the ExecuteServiceTask command: the service task type, and the one pipeline item this
/// engine step runs, named by its position in <see cref="ServiceTaskPipeline.Items"/>. That item is the whole
/// payload — a step says what it runs, never what runs after it, which the step derives from the pipeline it
/// resolves when it runs. An external stage's send and its receive steps carry the same index.
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
    /// than the engine's. A task overrides it per step, where its pipeline composes the step.
    /// </summary>
    internal static readonly TimeSpan DefaultServiceTaskTimeout = TimeSpan.FromMinutes(10);

    public override string GetKey() => Key;

    public override ProcessStepOptions? DefaultStepOptions { get; } =
        new() { MaxExecutionTime = DefaultServiceTaskTimeout };

    public override async Task<WorkflowEngineCommandResult> Execute(
        WorkflowEngineCommandContext context,
        ExecuteServiceTaskPayload payload
    )
    {
        IInstanceDataMutator instanceDataMutator = context.InstanceDataMutator;
        Instance instance = context.InstanceDataMutator.Instance;
        ProcessState? processState = instance.Process;
        if (processState is null)
        {
            return FailedWorkflowEngineCommandResult.Permanent(
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
            IServiceTask serviceTask =
                appImplementationFactory.FindServiceTask(serviceTaskType)
                ?? throw new ProcessException($"No service task found for type {serviceTaskType}");

            ServiceTaskPipeline pipeline = serviceTask.ResolvePipeline();

            StageContext serviceTaskContext = StageExecution.CreateContext(context);

            // A receive step carries the same item index as its stage's send; the engine's rendezvous, present on a
            // receive workflow's step and never on another, is what tells the two apart.
            AppCallbackMailbox? rendezvous = context.Payload.Mailbox;
            WorkflowEngineCommandResult result = pipeline.Items.ElementAtOrDefault(itemIndex) switch
            {
                null => PipelineItemNotFound(serviceTaskType, itemIndex),

                ServiceTaskItem.Stage when rendezvous is not null => MailboxReceiptOnStage(serviceTaskType, itemIndex),

                ServiceTaskItem.Stage stage => MailboxRelay.DecideStage(
                    await stage.Work(serviceTaskContext),
                    serviceTaskType,
                    context.Payload.StepId,
                    context.StateCarry,
                    itemIndex,
                    pipeline
                ),

                ServiceTaskItem.ExternalStage external when rendezvous is { } receipt => await ExecuteReply(
                    context,
                    external,
                    receipt,
                    itemIndex,
                    serviceTaskType,
                    serviceTaskContext,
                    pipeline
                ),

                ServiceTaskItem.ExternalStage external => await ExecuteSend(
                    context,
                    external,
                    itemIndex,
                    serviceTaskType,
                    serviceTaskContext
                ),

                { } item => throw new UnreachableException($"Unknown pipeline item type: {item.GetType().Name}"),
            };

            return result;
        }
        catch (Exception ex)
        {
            activity?.Errored(ex);
            return FailedWorkflowEngineCommandResult.Retryable(ex);
        }
    }

    /// <summary>
    /// An external stage's send: handed the reply address the mint step right before it opened, so it can publish
    /// it.
    /// </summary>
    private static async Task<WorkflowEngineCommandResult> ExecuteSend(
        WorkflowEngineCommandContext context,
        ServiceTaskItem.ExternalStage stage,
        int stageIndex,
        string serviceTaskType,
        StageContext serviceTaskContext
    )
    {
        if (context.StateCarry.FindMailbox(stageIndex) is not { } carried)
        {
            return FailedWorkflowEngineCommandResult.Permanent(
                $"The external stage at index {stageIndex} of service task '{serviceTaskType}' sends with a reply "
                    + "address, but no mailbox id for it reached this step in the workflow state. Either this "
                    + "workflow was enqueued before the item was an external stage — its step list was fixed then, "
                    + "and holds no mint step to record an id — or the mint step ran immediately before this step "
                    + "and its record did not survive into this step's state.",
                "MailboxIdMissingFromState"
            );
        }

        ReplyAddress address = new() { Id = carried.Id, Deadline = carried.Deadline };
        return MailboxRelay.DecideSend(
            await stage.Send(serviceTaskContext, address),
            serviceTaskType,
            context.Payload.StepId,
            context.StateCarry,
            carried,
            stage,
            stageIndex
        );
    }

    /// <summary>
    /// One receive step of an external stage: exactly one reply, or the news that the reply address closed. Every
    /// disagreement between the engine's rendezvous and this pipeline is a permanent failure — either wrong answer
    /// would end the wait falsely.
    /// </summary>
    private async Task<WorkflowEngineCommandResult> ExecuteReply(
        WorkflowEngineCommandContext context,
        ServiceTaskItem.ExternalStage stage,
        AppCallbackMailbox receipt,
        int stageIndex,
        string serviceTaskType,
        StageContext serviceTaskContext,
        ServiceTaskPipeline pipeline
    )
    {
        if ((receipt.Delivery is null) == (receipt.DisposedReason is null))
        {
            return FailedWorkflowEngineCommandResult.Permanent(
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

        ServiceTaskReplyResult result;
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

            result = await stage.OnReply(
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
        else if (stage.OnTimeout is { } onTimeout)
        {
            result = await onTimeout(serviceTaskContext);
        }
        else
        {
            return NoReplyInTime(serviceTaskType, stage, stageIndex);
        }

        return MailboxRelay.DecideReply(
            result,
            serviceTaskType,
            context.Payload.StepId,
            receipt,
            context.StateCarry,
            stage,
            stageIndex,
            pipeline
        );
    }

    /// <summary>
    /// The reply address of an external stage with no <c>onTimeout</c> closed before its reply handler was done:
    /// the task fails, naming the stage and its timeout.
    /// </summary>
    private static FailedWorkflowEngineCommandResult NoReplyInTime(
        string serviceTaskType,
        ServiceTaskItem.ExternalStage stage,
        int stageIndex
    ) =>
        FailedWorkflowEngineCommandResult.Permanent(
            $"Service task '{serviceTaskType}' failed: the reply address of "
                + (
                    stage.DisplayName is { } name
                        ? $"its stage '{name}' (index {stageIndex})"
                        : $"its stage at index {stageIndex}"
                )
                + " closed before the replies were handled, because its timeout of "
                + $"{stage.Timeout.ToString("c", CultureInfo.InvariantCulture)} ran out or an operator closed it. "
                + "The stage composes no onTimeout to carry on without the replies.",
            "ServiceTaskReplyTimedOut"
        );

    private static FailedWorkflowEngineCommandResult PipelineItemNotFound(string serviceTaskType, int itemIndex) =>
        FailedWorkflowEngineCommandResult.Permanent(
            $"Service task '{serviceTaskType}' composes no pipeline item at index {itemIndex}. A pipeline's "
                + "indexes are positions in its composition: if stages were inserted, reordered or removed since "
                + "this workflow was enqueued, every index behind the change has "
                + "moved. Resume the workflow on the code that enqueued it, or abandon it deliberately.",
            "PipelineItemNotFound"
        );

    private static FailedWorkflowEngineCommandResult MailboxReceiptOnStage(string serviceTaskType, int itemIndex) =>
        FailedWorkflowEngineCommandResult.Permanent(
            $"The stage at index {itemIndex} of service task '{serviceTaskType}' was handed a mailbox message, "
                + "but only an external stage handles replies. Either the pipeline was reshaped since this "
                + "workflow was enqueued, so the index this step carries now lands on a stage, or the workflow "
                + "was not built by this application's pipeline expansion.",
            "MailboxReceiptOnStage"
        );

    private static FailedWorkflowEngineCommandResult MissingItemIndex(string serviceTaskType) =>
        FailedWorkflowEngineCommandResult.Permanent(
            $"A step of service task '{serviceTaskType}' names no pipeline item. Every step of a pipeline — "
                + "its stages, and an external stage's send and replies alike — names the one item it runs by "
                + "that item's index, so this workflow was enqueued by a version of this app-lib that "
                + "identified steps differently. Resume it on the version that enqueued it, or abandon it "
                + "deliberately.",
            "InvalidPayloadException"
        );

    private static FailedWorkflowEngineCommandResult DeliveryEnvelopeInvalid(
        string serviceTaskType,
        AppCallbackMailbox receipt,
        MailboxDeliveryEnvelopeException ex
    ) =>
        FailedWorkflowEngineCommandResult.Permanent(
            $"The message delivered to service task '{serviceTaskType}' at position {receipt.Seq} of "
                + $"mailbox {receipt.Id} cannot be opened as one this application sealed: it was never "
                + "sealed by IServiceTaskReplyForwarder, was altered after forwarding, was sealed for a "
                + "different mailbox, service task or message id, or was sealed with a WorkflowEngineCallback "
                + "app code that has since expired or been unmounted. The last is reachable without anything "
                + "being wrong with the message: a message can wait unread at its position while the replies "
                + "before it are handled, so a long wait can outlive the code that sealed one of its "
                + "messages. "
                + ex.Message,
            "MailboxDeliveryEnvelopeInvalid"
        );

    /// <summary>
    /// Reason code for every failure a service task's own code reported, whichever step reported it. One
    /// definition, shared with <see cref="MailboxRelay"/> — the code is operator-visible.
    /// </summary>
    internal const string FailedReasonCode = "ServiceTaskFailedException";

    /// <summary>The sentence such a failure is reported as, shared with <see cref="MailboxRelay"/>.</summary>
    internal static string FailedMessage(string serviceTaskType, string errorMessage) =>
        $"Service task '{serviceTaskType}' failed: {errorMessage}";
}
