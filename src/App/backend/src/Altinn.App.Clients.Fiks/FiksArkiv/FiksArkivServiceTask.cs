using System.Text.Json;
using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO;
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

/// <summary>Archives the instance in a Fiks Arkiv endpoint and waits for the answer.</summary>
/// <remarks>
/// The exchange is asynchronous and multi-message, so the task opens a <em>mailbox</em> rather than polling;
/// each delivered message runs the reply handler as its own durable unit of work.
/// The app's <see cref="IFiksArkivMessageHandler"/>, when one is registered, is called from here —
/// it must not move the process.
/// </remarks>
internal sealed class FiksArkivServiceTask : IPipelineServiceTask
{
    private readonly ILogger<FiksArkivServiceTask> _logger;
    private readonly IFiksArkivMessageSender _fiksArkivMessageSender;
    private readonly IFiksArkivInstanceClient _fiksArkivInstanceClient;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly FiksArkivSettings _fiksArkivSettings;

    /// <summary>
    /// How long the exchange may stay open. Seven days covers a holiday weekend plus working days either side,
    /// and sits inside the engine's <c>MaxMailboxTimeout</c> (21 days), which app startup cannot check. See
    /// <see cref="MailboxOptions.Timeout"/> for the callback-credential constraint.
    /// </summary>
    internal static readonly TimeSpan ArchiveReplyTimeout = TimeSpan.FromDays(7);

    public string Type => AltinnTaskTypes.FiksArkiv;

    public FiksArkivServiceTask(
        IFiksArkivMessageSender fiksArkivMessageSender,
        IFiksArkivInstanceClient fiksArkivInstanceClient,
        AppImplementationFactory appImplementationFactory,
        IOptions<FiksArkivSettings> fiksArkivSettings,
        ILogger<FiksArkivServiceTask> logger
    )
    {
        _fiksArkivMessageSender = fiksArkivMessageSender;
        _fiksArkivInstanceClient = fiksArkivInstanceClient;
        _appImplementationFactory = appImplementationFactory;
        _fiksArkivSettings = fiksArkivSettings.Value;
        _logger = logger;
    }

    /// <inheritdoc />
    /// <remarks>
    /// The send is its own durable stage so the record is handed to Fiks IO once per pass, however many
    /// messages come back, and it is the stage that opens the mailbox because the send is what publishes the
    /// address. The archive answers more than once — an acknowledgement, then a receipt — so the exchange is a
    /// multi-message one.
    /// </remarks>
    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
        pipeline
            .Stage(SendToArchive, new MailboxOptions { Timeout = ArchiveReplyTimeout }, out MailboxHandle archive)
            .ConcludeOnReplies(archive, onMessage: HandleArchiveMessage, onClosed: HandleArchiveClosed);

    private async Task<ServiceTaskOpeningStageResult> SendToArchive(
        ServiceTaskContext context,
        ServiceTaskMailbox mailbox
    )
    {
        // Two identities: klientMeldingId is the idempotency key (StepId, stable across retries);
        // klientKorrelasjonsId is echoed on every reply, so it must be the mailbox. Swapping them fails
        // silently — the send succeeds and no answer is routable.
        Guid sendersReference = context.StepId;
        if (sendersReference == Guid.Empty)
        {
            const string errorMessage =
                "The workflow engine did not supply a step id, so there is no retry-stable Fiks client message ID to send with.";
            _logger.LogError("FiksArkivServiceTask cannot send to the archive: {ErrorMessage}", errorMessage);
            return ServiceTaskOpeningStageResult.FailedPermanent(errorMessage);
        }

        Guid replyAddress = mailbox.Id;

        try
        {
            Instance instance = context.InstanceDataMutator.Instance;
            string taskId = instance.Process.CurrentTask.ElementId;

            _logger.LogInformation(
                "FiksArkivServiceTask is sending the archive record for instance {InstanceId} and task {TaskId}",
                instance.Id,
                taskId
            );

            var response = await _fiksArkivMessageSender.GenerateAndSendMessage(
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

            return ServiceTaskOpeningStageResult.Completed();
        }
        catch (OperationCanceledException e) when (context.CancellationToken.IsCancellationRequested)
        {
            // Never a conclusion: it is not known whether the shipment left, so the exchange must stay
            // open for the answer a departed shipment would get.
            _logger.LogWarning(e, "Sending to Fiks Arkiv was cut off before it finished: {ErrorMessage}", e.Message);
            return ServiceTaskOpeningStageResult.FailedRetryable(
                "Sending the archive record was cut off at this attempt's execution deadline before Fiks IO "
                    + $"answered, so it is not known whether the shipment left: {e.Message}"
            );
        }
        catch (Exception e) when (FiksIOSendFailure.IsCredentialsRefused(e))
        {
            // Deterministic but app-level: no citizen action helps, so errorHandling is not consulted. A
            // plain stage failure rather than a conclusion, deliberately — concluding would close the
            // mailbox, and an operator who fixes the credentials and resumes would then re-run a send whose
            // answers can never be delivered. Left open, the mailbox waits out its own deadline and the
            // resumed send's exchange completes normally.
            _logger.LogError(e, "The archive record can not be sent: {ErrorMessage}", e.Message);
            return ServiceTaskOpeningStageResult.FailedPermanent(
                "The archive record can not be sent: Fiks IO refused the app's integration credentials. "
                    + $"Retrying cannot succeed; fix the credentials and resume the workflow. {e.Message}"
            );
        }
        catch (Exception e) when (FiksIOSendFailure.IsRecipientNotFound(e))
        {
            // Deterministic and case-level — the recipient account comes from the instance's own data, so
            // this send fails identically every time and the archiving cannot succeed: the same verdict an
            // archive rejection gets, concluded down the same errorHandling path.
            _logger.LogError(e, "The archive record can not be sent: {ErrorMessage}", e.Message);

            if (_fiksArkivSettings.ErrorHandling?.MoveToNextTask is true)
            {
                return ServiceTaskOpeningStageResult.Conclude(
                    ServiceTaskResult.Success(action: _fiksArkivSettings.ErrorHandling.GetActionOrDefault())
                );
            }

            return ServiceTaskOpeningStageResult.Conclude(
                ServiceTaskResult.FailedPermanent(
                    "The archive record can not be sent: the recipient account does not exist. Retrying "
                        + $"cannot succeed; manual follow-up is required. {e.Message}"
                )
            );
        }
        catch (Exception e)
        {
            // Transient or unknown: retried, and a retry budget that runs out fails the task — never the
            // errorHandling path, which is reserved for an archiving that cannot succeed.
            _logger.LogError(e, "Error occurred while sending to Fiks Arkiv: {ErrorMessage}", e.Message);
            return ServiceTaskOpeningStageResult.FailedRetryable(e.Message);
        }
    }

    /// <summary>
    /// The exchange ended without the archive confirming the record. Both closure reasons are the same
    /// outcome for this task; only the wording differs.
    /// </summary>
    private Task<ServiceTaskResult> HandleArchiveClosed(ServiceTaskContext context, MailboxClosedReason reason)
    {
        string cause =
            reason == MailboxClosedReason.Deadline
                ? $"the exchange stayed open for {ArchiveReplyTimeout.TotalDays:0} days without a receipt arriving"
                : "the exchange was closed before a receipt arrived";

        return Task.FromResult<ServiceTaskResult>(
            ServiceTaskResult.FailedPermanent(
                "The archive never confirmed the record. The archive record was handed to Fiks IO and "
                    + $"{cause}. The record may still be archived — the messages the exchange did receive show "
                    + "whether the archive acknowledged it — so manual follow-up is required."
            )
        );
    }

    private async Task<ServiceTaskExchangeResult> HandleArchiveMessage(
        ServiceTaskContext context,
        ServiceTaskReply reply
    )
    {
        if (ReadForwardedMessage(reply) is not { } message)
        {
            return ServiceTaskResult.FailedPermanent(
                $"The message delivered under id '{reply.IdempotencyKey}' could not be read as a Fiks Arkiv "
                    + "message. Delivering it again produces the same result; manual follow-up is required."
            );
        }

        _logger.LogInformation(
            "Processing Fiks Arkiv message {MessageType}:{MessageId} with {PayloadCount} payload(s): {Payloads}",
            message.MessageType,
            message.MessageId,
            message.Payloads.Count,
            message.Payloads.Select(x => x.Filename)
        );

        if (await InvokeMessageHandler(context, message) is { } handlerFailure)
            return handlerFailure;

        if (message.IsError)
        {
            return HandleArchiveError(message);
        }

        if (message.IsReceipt)
        {
            return await HandleArchiveReceipt(context, message);
        }

        if (message.IsAcknowledgement)
        {
            _logger.LogInformation(
                "The archive has received the record (message {MessageType}:{MessageId}). Awaiting its receipt.",
                message.MessageType,
                message.MessageId
            );
        }
        else
        {
            _logger.LogWarning(
                "Fiks Arkiv message {MessageType}:{MessageId} is not a type this task models, so it cannot conclude "
                    + "the archiving. Awaiting the receipt.",
                message.MessageType,
                message.MessageId
            );
        }

        return ServiceTaskExchangeResult.AwaitNextReply();
    }

    /// <summary>
    /// Returns <c>null</c> when the task's own decision should follow. A throw is retryable: the message is
    /// frozen at its position, so the next attempt hands it to the same handler.
    /// </summary>
    private async Task<ServiceTaskResult?> InvokeMessageHandler(
        ServiceTaskContext context,
        FiksArkivReceivedMessage message
    )
    {
        IFiksArkivMessageHandler? handler = _appImplementationFactory.Get<IFiksArkivMessageHandler>();
        if (handler is null)
            return null;

        try
        {
            await handler.HandleMessage(message, context);
            return null;
        }
        catch (Exception e)
        {
            _logger.LogError(
                e,
                "The configured {Handler} failed on Fiks Arkiv message {MessageType}:{MessageId}: {Error}",
                nameof(IFiksArkivMessageHandler),
                message.MessageType,
                message.MessageId,
                e.Message
            );

            return ServiceTaskResult.FailedRetryable(
                $"The app's {nameof(IFiksArkivMessageHandler)} failed on Fiks Arkiv message {message.MessageId}, "
                    + $"so the archive's answer has not been fully handled: {e.Message}"
            );
        }
    }

    private ServiceTaskResult HandleArchiveError(FiksArkivReceivedMessage message)
    {
        _logger.LogError(
            "Fiks Arkiv message {MessageType}:{MessageId} is an error response: {MessageContent}",
            message.MessageType,
            message.MessageId,
            message.Payloads.Count > 0
                ? message.Payloads.Select(x => x.Content)
                : (IEnumerable<string>)["Message contains no content."]
        );

        if (_fiksArkivSettings.ErrorHandling?.MoveToNextTask is true)
            return ServiceTaskResult.Success(action: _fiksArkivSettings.ErrorHandling.GetActionOrDefault());

        return ServiceTaskResult.FailedPermanent(
            $"The archive rejected the record with message type '{message.MessageType}'. "
                + "The archive will not answer differently if asked again; manual follow-up is required."
        );
    }

    private async Task<ServiceTaskResult> HandleArchiveReceipt(
        ServiceTaskContext context,
        FiksArkivReceivedMessage message
    )
    {
        if (message.Payloads.OfType<FiksArkivReceivedMessagePayload.Receipt>().FirstOrDefault() is not { } receipt)
        {
            // A failure rather than warn-and-advance: the confirmation record is the artifact this task exists to
            // produce.
            _logger.LogError(
                "No readable receipt payload found in Fiks Arkiv message {MessageType}:{MessageId}. Payloads were: {Payloads}",
                message.MessageType,
                message.MessageId,
                message.Payloads.Select(x => x.Filename)
            );

            return ServiceTaskResult.FailedPermanent(
                $"The archive sent its receipt (message {message.MessageId}) but it could not be read as an "
                    + "archive receipt, so there is no confirmation record to store. The record is most likely "
                    + "archived; manual follow-up is required to confirm it."
            );
        }

        SaveArchiveReceipt(context, receipt);

        // Before concluding: the conclusion advances the process, which may end it and take the instance along.
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
    /// Removing every element the configured (data type, filename) pair owns first is what makes a redelivered
    /// message harmless without recognizing it.
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

    /// <summary>The body is verified round-tripped but originated outside, so it is read defensively.</summary>
    private FiksArkivReceivedMessage? ReadForwardedMessage(ServiceTaskReply reply)
    {
        StoredFiksArkivMessage? stored;
        try
        {
            stored = JsonSerializer.Deserialize<StoredFiksArkivMessage>(reply.Payload);
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

        if (stored is null)
            return null;

        return new FiksArkivReceivedMessage
        {
            MessageId = stored.MessageId,
            MessageType = stored.MessageType,
            SendersReference = stored.SendersReference,
            InReplyToMessage = stored.InReplyToMessage,
            Sender = stored.Sender,
            Recipient = stored.Recipient,
            Payloads =
            [
                .. stored.Payloads?.Select(x => ParseMessagePayload(x.Filename, x.Content, stored.MessageType)) ?? [],
            ],
        };
    }

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
