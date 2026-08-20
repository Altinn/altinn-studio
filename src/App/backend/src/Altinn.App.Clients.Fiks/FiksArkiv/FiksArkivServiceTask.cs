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
/// Archives the instance in a Fiks Arkiv endpoint and waits for the archive to answer: a send stage hands the
/// archive record to Fiks IO, and the reply handler processes the messages that come back until the archive
/// either confirms the record or reports that it could not create it.
/// </summary>
/// <remarks>
/// The exchange is asynchronous and multi-message, so the task opens a <em>mailbox</em> rather than polling:
/// the transition stays open without holding a worker or a lease, and each message the Fiks IO subscriber
/// delivers into it runs the reply handler once as its own durable, retryable unit of work. This is where the
/// configured behavior is applied — <see cref="Models.FiksArkivReceiptSettings.ConfirmationRecord"/>,
/// <see cref="Models.FiksArkivSuccessHandlingSettings"/>,
/// <see cref="Models.FiksArkivErrorHandlingSettings"/> and <see cref="ArchiveReplyTimeout"/>.
/// <see cref="IFiksArkivResponseHandler"/> is called from here, inside the process transition the message
/// belongs to; what it must no longer do is move the process — the task's own verdict does that.
/// </remarks>
internal sealed class FiksArkivServiceTask : IPipelineServiceTask
{
    private readonly ILogger<FiksArkivServiceTask> _logger;
    private readonly IFiksArkivHost _fiksArkivHost;
    private readonly IFiksArkivInstanceClient _fiksArkivInstanceClient;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly FiksArkivSettings _fiksArkivSettings;

    /// <summary>
    /// The send stage's wire identity. A workflow enqueued against this pipeline keeps calling back by this
    /// literal until it settles, so it must not drift.
    /// </summary>
    internal const string SendStageName = "SendToArchive";

    /// <summary>
    /// How long the exchange may stay open before the mailbox closes and the wait is written off. Seven days
    /// covers a holiday weekend plus working days either side, and outlives the two-day lifetime the outbound
    /// Fiks IO message carries. Waiting costs nothing while nothing arrives. It sits inside the engine's
    /// <c>MaxMailboxTimeout</c> (21 days), which is not checkable at app startup; see
    /// <see cref="MailboxOptions.Timeout"/> for the separate constraint on callback credentials.
    /// </summary>
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
    /// The send is its own durable stage so the archive record is handed to Fiks IO once per pass through the task
    /// no matter how many messages come back. <see cref="ServiceTaskPipeline.WithReplyFrom"/> names the send as
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
        // Two identities, two jobs. klientMeldingId is this message's own reference and the idempotency key, so it
        // must be stable across retries of this stage — that is StepId. klientKorrelasjonsId is echoed on every
        // reply, so it must be the mailbox this stage opened. Swapping them fails silently: the send succeeds
        // and no answer is ever routable.
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
            // The engine cut this attempt off at its execution deadline; the shipment may or may not have left.
            // Its own branch on purpose: swept into the catch below it would be classified as an archiving
            // failure and reported as a successful conclusion.
            _logger.LogWarning(e, "Sending to Fiks Arkiv was cut off before it finished: {ErrorMessage}", e.Message);
            return ServiceTaskStageResult.FailedRetryable(
                "Sending the archive record was cut off at this attempt's execution deadline before Fiks IO "
                    + $"answered, so it is not known whether the shipment left: {e.Message}"
            );
        }
        catch (Exception e)
        {
            // Deliberately a failure even when ErrorHandling.MoveToNextTask is configured: a stage cannot advance
            // the process, and moving on from a send that never happened would leave nothing waiting for a
            // receipt that can never arrive.
            _logger.LogError(e, "Error occurred while sending to Fiks Arkiv: {ErrorMessage}", e.Message);
            return ServiceTaskStageResult.FailedRetryable(e.Message);
        }
    }

    /// <summary>
    /// Processes the messages the archive sends back, one per execution, until one of them concludes the exchange
    /// — or until the mailbox's own deadline closes it.
    /// </summary>
    private async Task<ServiceTaskResult> HandleArchiveReply(ServiceTaskContext context)
    {
        if (context.Reply is not { } reply)
        {
            // The closing signal: no message can reach this execution any more. Deadline or explicit close only
            // changes the wording — both demand a conclusion.
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
            // Permanent, not retryable: the bytes at this position never change, so a retry ladder would only stall
            // the messages behind this one on its way to the same conclusion.
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

        // Everything that is neither an error nor the receipt is intermediate: neither concludes the exchange, and
        // both are ordinary completions that keep it open for the next message.
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
            // Worth an operator's attention: an unmodeled message type can neither conclude the exchange nor be
            // acted on, and it still spends one of the mailbox's positions.
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
    /// Hands the message to the app's <see cref="IFiksArkivResponseHandler"/>, and reports a failure of it as this
    /// execution's verdict. Returns <c>null</c> when the handler is done and the task's own decision should follow.
    /// Called for every message before the task decides anything, but not on the closing signal — there is no
    /// message to hand over. A throw is retryable rather than permanent: the message is frozen at its position, so
    /// the next attempt hands the same message to the same handler.
    /// </summary>
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

    /// <summary>Concludes the exchange when the archive reports that it could not create the record.</summary>
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

        // The archive has answered, and its answer will not change on a redelivery — so this is a conclusion, not a
        // retry. Which conclusion is the app owner's call, via ErrorHandling.MoveToNextTask.
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
            // Deliberately a failure rather than warn-and-advance: the confirmation record is the artifact this task
            // exists to produce, so advancing without one would leave the process asserting an outcome it cannot
            // show. Saving the raw bytes instead was rejected — they would be written under a data type declared
            // as XML. The unreadable message stays available in the mailbox's record and in the log below.
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

        // Idempotent per stakeholder, and done before concluding: the conclusion advances the process, which may
        // end it and take the instance with it.
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
    /// Records the archive's receipt on the instance, replacing any receipt an earlier message left. Written
    /// through the unit of work so it lands with everything else the transition records. Replacement rather than
    /// accumulation is what makes a redelivered message harmless without the caller having recognized it: any
    /// element the configured (data type, filename) pair already owns is removed first.
    /// </summary>
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
    /// Reads the message the Fiks IO subscriber delivered. The body is verified to be exactly what was delivered,
    /// but it describes a message that came from outside — so it is read defensively, and an unreadable one fails
    /// the task rather than being silently skipped.
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
