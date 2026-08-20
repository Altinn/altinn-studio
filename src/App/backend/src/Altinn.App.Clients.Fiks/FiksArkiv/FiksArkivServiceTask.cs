using System.Text.Json;
using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using KS.Fiks.Arkiv.Models.V1.Arkivering.Arkivmeldingkvittering;
using KS.Fiks.Arkiv.Models.V1.Feilmelding;
using KS.Fiks.Arkiv.Models.V1.Meldingstyper;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

/// <summary>
/// Archives the instance in a Fiks Arkiv endpoint and waits for the archive to answer: a send stage
/// hands the archive record to Fiks IO, and the reply handler processes the messages that come back
/// until the archive either confirms the record or reports that it could not create it.
/// </summary>
/// <remarks>
/// <para>
/// <strong>This is the authoritative account of how a Fiks Arkiv shipment concludes. Everything else
/// that describes the flow points here.</strong>
/// </para>
/// <para>
/// The exchange is asynchronous and multi-message — a municipal archive typically acknowledges receipt
/// first and issues the receipt itself later — so the task opens a <em>mailbox</em> rather than
/// polling: the transition stays open without holding a worker or a lease, and each message the Fiks IO
/// subscriber delivers into it (see <see cref="FiksArkivHost.IncomingMessageListener"/>, which does the
/// decrypting and nothing else) runs the reply handler once, as its own durable, retryable unit of work.
/// </para>
/// <para>
/// So this is where the configured behavior is applied, and where to look for each setting:
/// <list type="bullet">
///   <item>
///     the receipt is stored as the configured confirmation record — see
///     <see cref="Models.FiksArkivReceiptSettings.ConfirmationRecord"/> — and a receipt that cannot be
///     read as one fails the task rather than advancing with no evidence;
///   </item>
///   <item>
///     <c>successHandling</c> decides what happens once the archive has confirmed the record — see
///     <see cref="Models.FiksArkivSuccessHandlingSettings"/>;
///   </item>
///   <item>
///     <c>errorHandling</c> decides how an error <em>reported by the archive</em> concludes the task —
///     see <see cref="Models.FiksArkivErrorHandlingSettings"/>, which also says why it does not cover a
///     send that could not be made at all;
///   </item>
///   <item>
///     and the exchange's own deadline (<see cref="ArchiveReplyTimeout"/>) is what ends a wait the
///     archive never answers, in this task's words rather than the engine's.
///   </item>
/// </list>
/// </para>
/// <para>
/// <see cref="IFiksArkivResponseHandler"/> is still the app's hook into every message the archive
/// sends, and it is called from here — inside the process transition the message belongs to, with the
/// engine's retries behind it, rather than inline in the Fiks IO subscriber against whatever task the
/// instance had reached by then. <strong>What it must no longer do is move the process</strong>: the
/// task's own verdict does that, from <c>successHandling</c>/<c>errorHandling</c>.
/// </para>
/// </remarks>
internal sealed class FiksArkivServiceTask : IPipelineServiceTask
{
    private readonly ILogger<FiksArkivServiceTask> _logger;
    private readonly IFiksArkivHost _fiksArkivHost;
    private readonly IFiksArkivInstanceClient _fiksArkivInstanceClient;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly FiksArkivSettings _fiksArkivSettings;

    /// <summary>
    /// The send stage's wire identity. A workflow enqueued against this pipeline keeps calling back
    /// by this literal until it settles, so it must not drift.
    /// </summary>
    internal const string SendStageName = "SendToArchive";

    /// <summary>
    /// How long the exchange may stay open — how long the archive has to answer before the mailbox
    /// closes and the wait is written off.
    /// </summary>
    /// <remarks>
    /// A municipal archive normally answers within minutes, but the endpoint belongs to the
    /// municipality, not to us: a maintenance window, a failed integration, or a long public holiday
    /// can put days between the send and the receipt. Seven days covers a holiday weekend plus working
    /// days on either side of it, and comfortably outlives the two-day lifetime the outbound Fiks IO
    /// message itself carries. Waiting costs nothing while nothing arrives — no polling, no timer, no
    /// execution — so the budget is bounded by how long the answer is still worth having, not by cost.
    /// <para>
    /// One ceiling sits above it, and it is not checkable when the app starts: the workflow engine's
    /// <c>MaxMailboxTimeout</c>, 21 days by default, which seven days is comfortably inside. See
    /// <see cref="MailboxOptions.Timeout"/> for the separate and general constraint that a workflow's
    /// callback credentials expire with the app code that issued them.
    /// </para>
    /// </remarks>
    internal static readonly TimeSpan ArchiveReplyTimeout = TimeSpan.FromDays(7);

    public string Type => AltinnTaskTypes.FiksArkiv;

    public FiksArkivServiceTask(
        IFiksArkivHost fiksArkivHost,
        IFiksArkivInstanceClient fiksArkivInstanceClient,
        AppImplementationFactory appImplementationFactory,
        IOptions<FiksArkivSettings> fiksArkivSettings,
        ILogger<FiksArkivServiceTask> logger
    )
    {
        _fiksArkivHost = fiksArkivHost;
        _fiksArkivInstanceClient = fiksArkivInstanceClient;
        _appImplementationFactory = appImplementationFactory;
        _fiksArkivSettings = fiksArkivSettings.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    /// <remarks>
    /// The send is its own durable stage so the archive record is handed to Fiks IO once per pass
    /// through the task no matter how many messages come back, and the conclusion is the reply handler
    /// that processes those messages. <see cref="ServiceTaskPipeline.WithReplyFrom"/> names the send as
    /// the stage that opens the mailbox, because the send is what publishes its address.
    /// </remarks>
    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
        pipeline
            .Stage(SendStageName, SendToArchive)
            .Finally(HandleArchiveReply)
            .WithReplyFrom(SendStageName, new MailboxOptions { Timeout = ArchiveReplyTimeout });

    /// <summary>
    /// Generates the archive record and hands it to Fiks IO, addressed so the archive's answers find
    /// their way back to this task's reply handler.
    /// </summary>
    private async Task<ServiceTaskStageResult> SendToArchive(ServiceTaskContext context)
    {
        // Two identities, two jobs. klientMeldingId is this message's own reference and the idempotency
        // key, so it must be stable across retries of this stage — that is StepId. klientKorrelasjonsId
        // is the value Fiks IO echoes on every reply, so it must be the address the archive's answers
        // are routed to — that is the mailbox this stage opened, which is why the mailbox is declared
        // on this stage and readable nowhere else. Swapping them fails silently in the worst way: the
        // send succeeds and no answer is ever routable.
        Guid sendersReference = context.StepId;
        if (sendersReference == Guid.Empty)
        {
            const string errorMessage =
                "The workflow engine did not supply a step id, so there is no retry-stable Fiks client message ID to send with.";
            _logger.LogError("FiksArkivServiceTask cannot send to the archive: {ErrorMessage}", errorMessage);
            return ServiceTaskStageResult.FailedPermanent(errorMessage);
        }

        Guid replyAddress = context.Mailbox.Id;
        if (replyAddress == Guid.Empty)
        {
            const string errorMessage =
                "The mailbox opened for this shipment has no address, so the archive message cannot be addressed "
                + "for its answer — and without it the receipt would never reach the task waiting for it.";
            _logger.LogError("FiksArkivServiceTask cannot send to the archive: {ErrorMessage}", errorMessage);
            return ServiceTaskStageResult.FailedPermanent(errorMessage);
        }

        try
        {
            Instance instance = context.InstanceDataMutator.Instance;
            string taskId = instance.Process.CurrentTask.ElementId;

            _logger.LogInformation(
                "FiksArkivServiceTask is sending the archive record for instance {InstanceId} and task {TaskId}",
                instance.Id,
                taskId
            );

            var response = await _fiksArkivHost.GenerateAndSendMessage(
                taskId,
                FiksArkivConstants.MessageTypes.CreateArchiveRecord,
                sendersReference,
                replyAddress,
                context.ExecutionReferenceTime,
                context.InstanceDataMutator,
                context.CancellationToken
            );

            _logger.LogInformation(
                "FiksArkivServiceTask sent the archive record for instance {InstanceId} with response: {Response}",
                instance.Id,
                response
            );

            return ServiceTaskStageResult.Completed();
        }
        catch (OperationCanceledException e) when (context.CancellationToken.IsCancellationRequested)
        {
            // The workflow engine cut this attempt off at its execution deadline; the shipment may or
            // may not have left. Deliberately its own branch: swept into the catch below, a cut-off
            // attempt would be classified as an archiving failure and — before the setting was narrowed
            // — reported as a successful conclusion, advancing the process with nothing archived.
            _logger.LogWarning(e, "Sending to Fiks Arkiv was cut off before it finished: {ErrorMessage}", e.Message);
            return ServiceTaskStageResult.FailedRetryable(
                "Sending the archive record was cut off at this attempt's execution deadline before Fiks IO "
                    + $"answered, so it is not known whether the shipment left: {e.Message}"
            );
        }
        catch (Exception e)
        {
            // Deliberately a failure even when ErrorHandling.MoveToNextTask is configured: a stage
            // cannot advance the process, and quietly moving on from a send that never happened would
            // leave nothing waiting for a receipt that can never arrive. The setting still governs how
            // an error *from the archive* concludes the task, in HandleArchiveError.
            _logger.LogError(e, "Error occurred while sending to Fiks Arkiv: {ErrorMessage}", e.Message);
            return ServiceTaskStageResult.FailedRetryable(e.Message);
        }
    }

    /// <summary>
    /// Processes the messages the archive sends back, one per execution, until one of them concludes
    /// the exchange — or until the mailbox's own deadline closes it.
    /// </summary>
    private async Task<ServiceTaskResult> HandleArchiveReply(ServiceTaskContext context)
    {
        if (context.Reply is not { } reply)
        {
            // The closing signal: no message can reach this execution any more. Whether that is because
            // the deadline passed or because something closed the mailbox only changes the wording —
            // both demand a conclusion.
            string cause =
                context.ReplyClosedReason == MailboxClosedReason.Deadline
                    ? $"the exchange stayed open for {ArchiveReplyTimeout.TotalDays:0} days without a receipt arriving"
                    : "the exchange was closed before a receipt arrived";

            return ServiceTaskResult.FailedPermanent(
                "The archive never confirmed the record. The archive record was handed to Fiks IO and "
                    + $"{cause}. The record may still be archived — the messages the exchange did receive show "
                    + "whether the archive acknowledged it — so manual follow-up is required."
            );
        }

        if (ReadForwardedMessage(reply) is not { } message)
        {
            // Permanent, not retryable: the bytes at this position never change, so a retry ladder
            // would only stall the messages behind this one on its way to the same conclusion.
            return ServiceTaskResult.FailedPermanent(
                $"The message delivered under id '{reply.IdempotencyKey}' could not be read as a Fiks Arkiv "
                    + "message. Delivering it again produces the same result; manual follow-up is required."
            );
        }

        IReadOnlyList<FiksArkivReceivedMessagePayload>? payloads = message
            .Payloads?.Select(x => ParseMessagePayload(x.Filename, x.Content, message.MessageType))
            .ToList();

        _logger.LogInformation(
            "Processing Fiks Arkiv message {MessageType}:{MessageId} with {PayloadCount} payload(s): {Payloads}",
            message.MessageType,
            message.MessageId,
            payloads?.Count ?? 0,
            payloads?.Select(x => x.Filename)
        );

        bool isError =
            FiksIOConstants.IsErrorType(message.MessageType)
            || payloads?.OfType<FiksArkivReceivedMessagePayload.Error>().Any() is true;

        if (await InvokeResponseHandler(context, message, payloads, isError) is { } handlerFailure)
            return handlerFailure;

        if (isError)
        {
            return HandleArchiveError(message, payloads);
        }

        if (FiksIOConstants.IsReceiptType(message.MessageType))
        {
            return await HandleArchiveReceipt(context, message, payloads);
        }

        // Everything that is neither an error nor the receipt is an intermediate message — the archive
        // acknowledging that it has the record, or a message type we do not model. Neither concludes the
        // exchange, and both are ordinary completions that keep it open for the next message.
        if (FiksIOConstants.IsAcknowledgementType(message.MessageType))
        {
            _logger.LogInformation(
                "The archive has received the record (message {MessageType}:{MessageId}). Awaiting its receipt.",
                message.MessageType,
                message.MessageId
            );
        }
        else
        {
            // Worth an operator's attention: a message type this task does not model can neither
            // conclude the exchange nor be acted on, and it still spends one of the mailbox's positions.
            _logger.LogWarning(
                "Fiks Arkiv message {MessageType}:{MessageId} is not a type this task models, so it cannot conclude "
                    + "the archiving. Awaiting the receipt.",
                message.MessageType,
                message.MessageId
            );
        }

        return ServiceTaskResult.AwaitNextReply();
    }

    /// <summary>
    /// Hands the message to the app's <see cref="IFiksArkivResponseHandler"/>, and reports a failure of
    /// it as this execution's verdict. Returns <c>null</c> when the handler is done and the task's own
    /// decision should follow.
    /// </summary>
    /// <remarks>
    /// <para>
    /// Called for every message, before the task decides anything, so a handler sees acknowledgements,
    /// errors and the receipt alike — and sees them before the confirmation record is staged, which is
    /// the order the Fiks IO subscriber used to call it in.
    /// </para>
    /// <para>
    /// Not called on the closing signal: there is no message to hand over. A handler that needs to know
    /// an exchange ended unanswered is looking at the task's own permanent failure, not at a message.
    /// </para>
    /// <para>
    /// A throw is <em>retryable</em>, not permanent: the message is frozen at its position, so the same
    /// message is handed to the same handler on the next attempt, which is exactly what a transient
    /// dependency of the app's needs. A handler that always throws stalls this exchange until the
    /// mailbox's deadline — visibly, as a failing workflow — rather than concluding the task on a
    /// decision the app never got to make.
    /// </para>
    /// </remarks>
    private async Task<ServiceTaskResult?> InvokeResponseHandler(
        ServiceTaskContext context,
        StoredFiksArkivMessage message,
        IReadOnlyList<FiksArkivReceivedMessagePayload>? payloads,
        bool isError
    )
    {
        IFiksArkivResponseHandler handler = _appImplementationFactory.GetRequired<IFiksArkivResponseHandler>();
        FiksIOReceivedMessage replayed = FiksIOReceivedMessage.Replay(
            new FiksIOReplayedMessage
            {
                MessageId = message.MessageId,
                MessageType = message.MessageType,
                SendersReference = message.SendersReference,
                InReplyToMessage = message.InReplyToMessage,
                CorrelationId = message.CorrelationId,
                Sender = message.Sender,
                Recipient = message.Recipient,
                MessageLifetime = message.MessageLifetime,
                IsReSent = message.IsReSent,
                Headers = message.Headers,
                Payloads = [.. message.Payloads?.Select(x => (x.Filename, x.Content)) ?? []],
            }
        );

        try
        {
            Instance instance = context.InstanceDataMutator.Instance;
            await (
                isError
                    ? handler.HandleError(instance, replayed, payloads, context.CancellationToken)
                    : handler.HandleSuccess(instance, replayed, payloads, context.CancellationToken)
            );

            return null;
        }
        catch (Exception e)
        {
            _logger.LogError(
                e,
                "The configured {Handler} failed on Fiks Arkiv message {MessageType}:{MessageId}: {Error}",
                nameof(IFiksArkivResponseHandler),
                message.MessageType,
                message.MessageId,
                e.Message
            );

            return ServiceTaskResult.FailedRetryable(
                $"The app's {nameof(IFiksArkivResponseHandler)} failed on Fiks Arkiv message {message.MessageId}, "
                    + $"so the archive's answer has not been fully handled: {e.Message}"
            );
        }
    }

    /// <summary>
    /// Concludes the exchange when the archive reports that it could not create the record.
    /// </summary>
    private ServiceTaskResult HandleArchiveError(
        StoredFiksArkivMessage message,
        IReadOnlyList<FiksArkivReceivedMessagePayload>? payloads
    )
    {
        _logger.LogError(
            "Fiks Arkiv message {MessageType}:{MessageId} is an error response: {MessageContent}",
            message.MessageType,
            message.MessageId,
            payloads?.Select(x => x.Content) ?? ["Message contains no content."]
        );

        // The archive has answered, and its answer will not change on a redelivery — so this is a
        // conclusion, not a retry. Which conclusion is the app owner's call: ErrorHandling.MoveToNextTask
        // takes the process down its own path (a "reject" transition by default), and without it the
        // task fails so the failure reaches monitoring rather than being absorbed by the process.
        if (_fiksArkivSettings.ErrorHandling?.MoveToNextTask is true)
            return ServiceTaskResult.Success(action: _fiksArkivSettings.ErrorHandling.GetActionOrDefault());

        return ServiceTaskResult.FailedPermanent(
            $"The archive rejected the record with message type '{message.MessageType}'. "
                + "The archive will not answer differently if asked again; manual follow-up is required."
        );
    }

    /// <summary>
    /// Concludes the exchange when the archive confirms the record: the receipt is recorded on the
    /// instance, and the process moves on.
    /// </summary>
    private async Task<ServiceTaskResult> HandleArchiveReceipt(
        ServiceTaskContext context,
        StoredFiksArkivMessage message,
        IReadOnlyList<FiksArkivReceivedMessagePayload>? payloads
    )
    {
        if (payloads?.OfType<FiksArkivReceivedMessagePayload.Receipt>().FirstOrDefault() is not { } receipt)
        {
            // Deliberately a failure rather than the warning-and-advance this replaces. The confirmation
            // record is the artifact this task exists to produce — the evidence that the archiving
            // happened — so advancing without one would leave the process asserting an outcome it cannot
            // show, and the only trace would be a log line. The alternative considered, saving the raw
            // bytes instead, was rejected: they would be written under a data type declared as XML,
            // which is both dishonest and liable to be rejected on save. The unreadable message itself
            // stays available in the mailbox's record of the delivery and in the log below, so an
            // operator can see exactly what the archive sent.
            _logger.LogError(
                "No readable receipt payload found in Fiks Arkiv message {MessageType}:{MessageId}. Payloads were: {Payloads}",
                message.MessageType,
                message.MessageId,
                payloads?.Select(x => x.Filename)
            );

            return ServiceTaskResult.FailedPermanent(
                $"The archive sent its receipt (message {message.MessageId}) but it could not be read as an "
                    + "archive receipt, so there is no confirmation record to store. The record is most likely "
                    + "archived; manual follow-up is required to confirm it."
            );
        }

        SaveArchiveReceipt(context, receipt);

        // Idempotent per stakeholder, and done before concluding: the conclusion advances the process,
        // which may end it and take the instance with it.
        if (_fiksArkivSettings.SuccessHandling?.MarkInstanceComplete is true)
        {
            await _fiksArkivInstanceClient.MarkInstanceComplete(
                new InstanceIdentifier(context.InstanceDataMutator.Instance),
                context.CancellationToken
            );
        }

        if (_fiksArkivSettings.SuccessHandling is { MoveToNextTask: false })
            return ServiceTaskResult.SuccessWithoutAutoAdvance();

        return ServiceTaskResult.Success(action: _fiksArkivSettings.SuccessHandling?.GetActionOrDefault());
    }

    /// <summary>
    /// Records the archive's receipt on the instance, replacing any receipt an earlier message left.
    /// </summary>
    /// <remarks>
    /// Written through the unit of work rather than straight to Storage, so it lands with everything else
    /// the transition records. Replacement, not accumulation, is what makes a redelivered message harmless
    /// here: any element the configured (data type, filename) pair already owns is removed first, so a
    /// second delivery of the same receipt — or a later one that supersedes it — leaves exactly one
    /// confirmation record either way. That is stronger than keying on the message, and does not depend on
    /// the caller having recognized the redelivery.
    /// </remarks>
    private void SaveArchiveReceipt(ServiceTaskContext context, FiksArkivReceivedMessagePayload.Receipt receipt)
    {
        ArgumentNullException.ThrowIfNull(_fiksArkivSettings.Receipt);
        FiksArkivDataTypeSettings settings = _fiksArkivSettings.Receipt.ConfirmationRecord;
        IInstanceDataMutator dataMutator = context.InstanceDataMutator;
        string filename = settings.GetFilenameOrDefault();

        foreach (DataElement existing in dataMutator.RemoveDataElementsFor(settings))
        {
            _logger.LogInformation(
                "Removing existing {DataType} data from unit of work: {Filename} -> {DataElementId}",
                settings.DataType,
                filename,
                existing.Id
            );
        }

        _logger.LogInformation("Staging archive receipt: {DataType}/{Filename}", settings.DataType, filename);
        dataMutator.AddBinaryDataElement(
            settings.DataType,
            "application/xml",
            filename,
            receipt.Details.SerializeXml(),
            generatedFromTask: dataMutator.Instance.Process?.CurrentTask?.ElementId
        );
    }

    /// <summary>
    /// Reads the message the Fiks IO subscriber delivered. The body traveled through the workflow
    /// engine and is verified to be exactly what was delivered, but it describes a message that came
    /// from outside — so it is read defensively, and an unreadable one fails the task rather than
    /// being silently skipped.
    /// </summary>
    private StoredFiksArkivMessage? ReadForwardedMessage(ServiceTaskReply reply)
    {
        try
        {
            return JsonSerializer.Deserialize<StoredFiksArkivMessage>(reply.Payload);
        }
        catch (Exception e)
        {
            _logger.LogError(
                e,
                "Error deserializing the Fiks Arkiv message delivered under id {IdempotencyKey}: {Exception}",
                reply.IdempotencyKey,
                e.Message
            );
            return null;
        }
    }

    /// <summary>
    /// Deserializes one payload according to the message type it arrived under, falling back to an
    /// <see cref="FiksArkivReceivedMessagePayload.Unknown"/> when it cannot be read.
    /// </summary>
    private FiksArkivReceivedMessagePayload ParseMessagePayload(string filename, string payload, string messageType)
    {
        try
        {
            object? deserializedPayload = messageType switch
            {
                FiksArkivMeldingtype.ArkivmeldingOpprettKvittering => payload.DeserializeXml<ArkivmeldingKvittering>()
                    ?? throw new FiksArkivException($"Error deserializing {nameof(ArkivmeldingKvittering)} data"),
                FiksArkivMeldingtype.Ikkefunnet => payload.DeserializeXml<Ikkefunnet>()
                    ?? throw new FiksArkivException($"Error deserializing {nameof(Ikkefunnet)} data"),
                FiksArkivMeldingtype.Serverfeil => payload.DeserializeXml<Serverfeil>()
                    ?? throw new FiksArkivException($"Error deserializing {nameof(Serverfeil)} data"),
                FiksArkivMeldingtype.Ugyldigforespørsel => payload.DeserializeXml<Ugyldigforespoersel>()
                    ?? throw new FiksArkivException($"Error deserializing {nameof(Ugyldigforespoersel)} data"),
                _ => null,
            };

            return FiksArkivReceivedMessagePayload.Create(filename, payload, deserializedPayload);
        }
        catch (FiksArkivException e)
        {
            _logger.LogError(e, "{Exception}: {Content}", e.Message, payload);
        }
        catch (Exception e)
        {
            _logger.LogError(e, "Error deserializing XML data: {Exception}", e.Message);
        }

        return new FiksArkivReceivedMessagePayload.Unknown(filename, payload);
    }
}
