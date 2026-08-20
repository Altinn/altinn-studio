using System.Diagnostics;
using System.Text.Json;
using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

internal sealed class FiksArkivHost : BackgroundService, IFiksArkivHost
{
    private readonly ILogger<FiksArkivHost> _logger;
    private readonly IFiksIOClient _fiksIOClient;
    private readonly Telemetry? _telemetry;
    private readonly IHostEnvironment _env;
    private readonly TimeProvider _timeProvider;
    private readonly FiksArkivSettings _fiksArkivSettings;
    private readonly IFiksArkivConfigResolver _fiksArkivConfigResolver;
    private readonly AppImplementationFactory _appImplementationFactory;
    private readonly IServiceScopeFactory _serviceScopeFactory;

    public FiksArkivHost(
        IFiksIOClient fiksIOClient,
        IOptions<FiksArkivSettings> fiksArkivSettings,
        ILogger<FiksArkivHost> logger,
        IFiksArkivConfigResolver fiksArkivConfigResolver,
        AppImplementationFactory appImplementationFactory,
        IServiceScopeFactory serviceScopeFactory,
        IHostEnvironment env,
        TimeProvider? timeProvider = null,
        Telemetry? telemetry = null
    )
    {
        _logger = logger;
        _fiksIOClient = fiksIOClient;
        _telemetry = telemetry;
        _fiksArkivSettings = fiksArkivSettings.Value;
        _fiksArkivConfigResolver = fiksArkivConfigResolver;
        _appImplementationFactory = appImplementationFactory;
        _serviceScopeFactory = serviceScopeFactory;
        _timeProvider = timeProvider ?? TimeProvider.System;
        _env = env;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            _logger.LogInformation("Fiks Arkiv Service starting");
            await _fiksIOClient.OnMessageReceived(IncomingMessageListener);

            DateTimeOffset nextIteration = GetLoopDelay();
            DateTimeOffset nextHealthCheck = GetHealthCheckDelay();

            // Keep-alive loop
            while (!stoppingToken.IsCancellationRequested)
            {
                TimeSpan delta = nextIteration - _timeProvider.GetUtcNow();
                await _timeProvider.Delay(delta > TimeSpan.Zero ? delta : TimeSpan.Zero, stoppingToken);

                // Perform health check
                if (_timeProvider.GetUtcNow() >= nextHealthCheck)
                {
                    if (await _fiksIOClient.IsHealthy() is false)
                    {
                        _logger.LogError("FiksIO Client is unhealthy, reconnecting.");
                        await _fiksIOClient.Reconnect();
                    }

                    nextHealthCheck = GetHealthCheckDelay();
                }

                nextIteration = GetLoopDelay();
            }
        }
        finally
        {
            _logger.LogInformation("Fiks Arkiv Service stopping.");
            await _fiksIOClient.DisposeAsync();
        }

        return;

        DateTimeOffset GetLoopDelay() => _timeProvider.GetUtcNow() + TimeSpan.FromSeconds(1);
        DateTimeOffset GetHealthCheckDelay() => _timeProvider.GetUtcNow() + TimeSpan.FromMinutes(10);
    }

    /// <inheritdoc />
    public Task<FiksIOMessageResponse> GenerateAndSendMessage(
        string taskId,
        string messageType,
        Guid sendersReference,
        DateTimeOffset executionReferenceTime,
        IInstanceDataMutator dataMutator,
        CancellationToken cancellationToken = default
    ) =>
        GenerateAndSendMessage(
            taskId,
            messageType,
            sendersReference,
            replyAddress: null,
            executionReferenceTime,
            dataMutator,
            cancellationToken
        );

    /// <inheritdoc />
    public Task<FiksIOMessageResponse> GenerateAndSendMessage(
        string taskId,
        string messageType,
        Guid sendersReference,
        Guid replyAddress,
        DateTimeOffset executionReferenceTime,
        IInstanceDataMutator dataMutator,
        CancellationToken cancellationToken = default
    ) =>
        GenerateAndSendMessage(
            taskId,
            messageType,
            sendersReference,
            (Guid?)replyAddress,
            executionReferenceTime,
            dataMutator,
            cancellationToken
        );

    private async Task<FiksIOMessageResponse> GenerateAndSendMessage(
        string taskId,
        string messageType,
        Guid sendersReference,
        Guid? replyAddress,
        DateTimeOffset executionReferenceTime,
        IInstanceDataMutator dataMutator,
        CancellationToken cancellationToken
    )
    {
        using Activity? mainActivity = _telemetry?.StartGenerateAndSendFiksActivity(
            taskId,
            dataMutator.Instance,
            messageType
        );

        (FiksIOMessageRequest request, ReadOnlyMemory<byte> archiveRecordData) = await CreateMessageRequest(
            taskId,
            messageType,
            sendersReference,
            replyAddress,
            executionReferenceTime,
            dataMutator,
            cancellationToken
        );

        SaveArchiveRecord(dataMutator, request, archiveRecordData, taskId);
        return await SendMessage(request, dataMutator.Instance, cancellationToken);
    }

    private async Task<(FiksIOMessageRequest Request, ReadOnlyMemory<byte> ArchiveRecordData)> CreateMessageRequest(
        string taskId,
        string messageType,
        Guid sendersReference,
        Guid? replyAddress,
        DateTimeOffset executionReferenceTime,
        IInstanceDataAccessor dataAccessor,
        CancellationToken cancellationToken
    )
    {
        var recipient = await _fiksArkivConfigResolver.GetRecipient(dataAccessor, cancellationToken);
        IFiksArkivPayloadGenerator payloadGenerator =
            _appImplementationFactory.GetRequired<IFiksArkivPayloadGenerator>();
        IEnumerable<FiksIOMessagePayload> generatedPayloads = await payloadGenerator.GeneratePayload(
            taskId,
            recipient,
            messageType,
            executionReferenceTime,
            dataAccessor,
            cancellationToken
        );
        List<FiksIOMessagePayload> messagePayloads = [.. generatedPayloads];
        int archiveRecordIndex = messagePayloads.FindIndex(x =>
            x.Filename == FiksArkivConstants.Filenames.ArchiveRecord
        );
        FiksIOMessagePayload archiveRecordPayload = messagePayloads.Single(x =>
            x.Filename == FiksArkivConstants.Filenames.ArchiveRecord
        );
        ReadOnlyMemory<byte> archiveRecordData = await ReadPayloadData(archiveRecordPayload, cancellationToken);
        messagePayloads[archiveRecordIndex] = new FiksIOMessagePayload(
            archiveRecordPayload.Filename,
            archiveRecordData
        );

        return (
            new FiksIOMessageRequest(
                Recipient: recipient.AccountId,
                MessageType: messageType,
                SendersReference: sendersReference,
                MessageLifetime: TimeSpan.FromDays(2),
                Payload: messagePayloads,
                // klientKorrelasjonsId is the field Fiks IO echoes on every reply (klientMeldingId is not returned), so
                // the reply address rides here — it is what routes the archive's answers into the mailbox the waiting
                // task reads from. A caller that supplied none gets the instance reference it always carried.
                CorrelationId: replyAddress?.ToString()
                    ?? _fiksArkivConfigResolver.GetCorrelationId(dataAccessor.Instance)
            ),
            archiveRecordData
        );
    }

    private async Task<FiksIOMessageResponse> SendMessage(
        FiksIOMessageRequest request,
        Instance instance,
        CancellationToken cancellationToken
    )
    {
        _logger.LogInformation("Sending Fiks Arkiv message for instance {InstanceId}", instance.Id);

        FiksIOMessageResponse response = await _fiksIOClient.SendMessage(request, cancellationToken);
        _logger.LogInformation("Fiks Arkiv responded with message ID {MessageId}", response.MessageId);

        return response;
    }

    /// <summary>
    /// Hands a message received from Fiks Arkiv to the service task waiting for it, and does nothing else with it.
    /// </summary>
    /// <remarks>
    /// The subscriber performs no archiving logic of its own: it decrypts the payloads — which needs the live
    /// Fiks IO connection and so can only be done here — and delivers them into the mailbox the send opened. What
    /// the answer then does is documented on <see cref="FiksArkivServiceTask"/>, the authoritative account.
    /// Whether Fiks IO should redeliver is the one decision left here, and it follows the forwarder's verdict. Two
    /// conditions are settled without forwarding: no usable reply address, and an outcome no retry can change;
    /// both are acknowledged so they leave the queue, and logged as errors. Every read of the received message
    /// happens inside the try, the telemetry activity included, because the message came from outside and a throw
    /// above the try would escape the listener with no log and no acknowledgement in any environment.
    /// </remarks>
    internal async Task IncomingMessageListener(FiksIOReceivedMessage message)
    {
        Activity? mainActivity = null;

        try
        {
            string? correlationId = ReadCorrelationId(message);

            mainActivity = _telemetry?.StartReceiveFiksActivity(
                message.Message.Sender,
                message.Message.MessageId,
                message.Message.MessageType,
                message.Message.SendersReference,
                message.Message.InReplyToMessage,
                correlationId
            );

            _logger.LogInformation(
                "Received message {MessageType}:{MessageId} from {MessageSender}, in reply to {MessageReplyFor} with "
                    + "senders-reference {SendersReference} and correlation-id {CorrelationId}",
                message.Message.MessageType,
                message.Message.MessageId,
                message.Message.Sender,
                message.Message.InReplyToMessage,
                message.Message.SendersReference,
                correlationId
            );

            _telemetry?.RecordFiksMessageReceived(
                message.IsErrorResponse ? Telemetry.Fiks.FiksResult.Error : Telemetry.Fiks.FiksResult.Success
            );

            // The archive echoes the correlation id the request carried; that value is the id of the mailbox the
            // waiting task opened for this exchange.
            if (!Guid.TryParse(correlationId, out Guid mailboxId) || mailboxId == Guid.Empty)
            {
                _logger.LogError(
                    "Fiks Arkiv message {MessageId} carries no usable correlation id ({CorrelationId}), so there is "
                        + "no way to tell which service task is waiting for it. Acknowledging without forwarding.",
                    message.Message.MessageId,
                    correlationId
                );
                await message.Responder.Ack();
                return;
            }

            // The forwarding failure is caught and turned into a verdict here rather than in a sibling catch, so the
            // responder call stays inside this try: a throw from Ack or NackWithRequeue in a sibling catch would
            // escape the listener with nothing to handle it.
            bool forwarded = false;
            bool requestRedelivery = false;
            try
            {
                await ForwardReply(message, mailboxId);
                forwarded = true;
            }
            catch (ServiceTaskReplyForwardException e)
            {
                mainActivity?.Errored(e);
                requestRedelivery = ShouldRequestRedelivery(e);

                if (requestRedelivery)
                {
                    _logger.LogWarning(
                        e,
                        "Could not forward Fiks Arkiv message {MessageId} ({Outcome}). Requesting redelivery.",
                        message.Message.MessageId,
                        e.Outcome
                    );
                }
                else
                {
                    // Settled: no amount of redelivery will place this message anywhere. Acknowledged and logged as an
                    // error instead, which is what reaches monitoring.
                    _logger.LogError(
                        e,
                        "Fiks Arkiv message {MessageId} could not be delivered to a waiting service task ({Outcome}) and will not be retried: {Error}",
                        message.Message.MessageId,
                        e.Outcome,
                        e.Message
                    );
                }
            }

            if (requestRedelivery)
            {
                await message.Responder.NackWithRequeue();
                return;
            }

            await message.Responder.Ack();

            if (forwarded)
                _logger.LogInformation("Message {MessageId} forwarded successfully", message.Message.MessageId);
        }
        catch (Exception e)
        {
            _logger.LogError(
                e,
                "Fiks Arkiv MessageReceivedHandler failed with unrecoverable error: {Error}",
                e.Message
            );
            mainActivity?.Errored(e);

            // Don't ack messages we failed to process in PROD. Let Fiks IO redeliver and/or trigger alarms.
            if (!_env.IsProduction())
                await message.Responder.Ack();
        }
        finally
        {
            mainActivity?.Dispose();
        }
    }

    /// <summary>
    /// Whether Fiks IO should be asked to deliver this message again. Decided per
    /// <see cref="ServiceTaskReplyForwardException.Outcome"/> rather than by
    /// <see cref="ServiceTaskReplyForwardException.IsTransient"/> alone, so no verdict is a default that drifted.
    /// Three settled ones are easy to misread: a full mailbox never frees a slot, <c>Late</c> means the exchange
    /// has already concluded, and a rejected submission is wrong rather than badly timed. An unknown outcome falls
    /// back to the platform's own classification.
    /// </summary>
    private static bool ShouldRequestRedelivery(ServiceTaskReplyForwardException exception) =>
        exception.Outcome switch
        {
            // Nothing left the app, and the next attempt can succeed: the engine may come back, and the callback
            // code is re-read on every call.
            ServiceTaskReplyForwardOutcome.EngineUnavailable => true,
            ServiceTaskReplyForwardOutcome.SigningUnavailable => true,

            ServiceTaskReplyForwardOutcome.Unroutable => false,
            ServiceTaskReplyForwardOutcome.Late => false,
            ServiceTaskReplyForwardOutcome.PayloadTooLarge => false,
            ServiceTaskReplyForwardOutcome.MailboxFull => false,
            ServiceTaskReplyForwardOutcome.Rejected => false,

            _ => exception.IsTransient,
        };

    /// <summary>
    /// Decrypts the message and delivers it into the mailbox whose id the archive echoed back as the correlation
    /// id.
    /// </summary>
    private async Task ForwardReply(FiksIOReceivedMessage message, Guid mailboxId)
    {
        var payloads = await message.Message.GetDecryptedPayloads();
        var storedMessage = new StoredFiksArkivMessage
        {
            MessageId = message.Message.MessageId,
            MessageType = message.Message.MessageType,
            SendersReference = message.Message.SendersReference,
            InReplyToMessage = message.Message.InReplyToMessage,
            CorrelationId = mailboxId.ToString(),
            Sender = message.Message.Sender,
            Recipient = message.Message.Recipient,
            MessageLifetime = message.Message.MessageLifetime,
            IsReSent = message.Message.IsReSent,
            Headers = message.Message.Headers,
            Payloads =
            [
                .. payloads?.Select(x => new StoredFiksArkivPayload { Filename = x.Filename, Content = x.Content })
                    ?? [],
            ],
        };

        // Resolved per message from a scope rather than injected: this is a singleton BackgroundService, and
        // holding a transient forwarder would pin its HttpClient for the process lifetime.
        await using AsyncServiceScope scope = _serviceScopeFactory.CreateAsyncScope();
        var forwarder = scope.ServiceProvider.GetRequiredService<IServiceTaskReplyForwarder>();

        _logger.LogInformation(
            "Forwarding Fiks Arkiv message {MessageType}:{MessageId} with {PayloadCount} payload(s) to mailbox {MailboxId}",
            storedMessage.MessageType,
            storedMessage.MessageId,
            storedMessage.Payloads?.Count ?? 0,
            mailboxId
        );

        // The Fiks IO message id is the delivery's idempotency key, which is what makes Fiks IO's at-least-once
        // delivery and any retry of this call safe. The service task type is named rather than derived, so an
        // envelope can never be sealed against the wrong handler; the payload is handed over unwrapped.
        await forwarder.ForwardReply(
            mailboxId,
            AltinnTaskTypes.FiksArkiv,
            JsonSerializer.Serialize(storedMessage),
            idempotencyKey: storedMessage.MessageId.ToString()
        );
    }

    /// <summary>
    /// The message's correlation id, or <c>null</c> when it does not have a readable one. Reading the property
    /// base64-decodes the raw header, which throws on anything outside the base64 alphabet — and a Fiks IO account
    /// can receive messages from integrations that put a human-readable string there. Since this field decides
    /// where a reply is routed, an undecodable one must be an ordinary "no correlation id" rather than a fault.
    /// </summary>
    private string? ReadCorrelationId(FiksIOReceivedMessage message)
    {
        try
        {
            return message.Message.CorrelationId;
        }
        catch (Exception e)
        {
            _logger.LogWarning(
                e,
                "Fiks Arkiv message {MessageId} has a correlation id that could not be decoded: {Error}",
                message.Message.MessageId,
                e.Message
            );
            return null;
        }
    }

    private void SaveArchiveRecord(
        IInstanceDataMutator dataMutator,
        FiksIOMessageRequest request,
        ReadOnlyMemory<byte> archiveRecordData,
        string taskId
    )
    {
        _logger.LogInformation("Staging archive record for Fiks Arkiv request: {Request}", request);
        ArgumentNullException.ThrowIfNull(_fiksArkivSettings.Receipt);

        RemoveExistingDataElements(dataMutator, _fiksArkivSettings.Receipt.ArchiveRecord);

        dataMutator.AddBinaryDataElement(
            _fiksArkivSettings.Receipt.ArchiveRecord.DataType,
            "application/xml",
            _fiksArkivSettings.Receipt.ArchiveRecord.GetFilenameOrDefault(),
            archiveRecordData,
            generatedFromTask: taskId
        );
    }

    private void RemoveExistingDataElements(
        IInstanceDataMutator dataMutator,
        FiksArkivDataTypeSettings dataTypeSettings
    )
    {
        foreach (DataElement dataElement in dataMutator.RemoveDataElementsFor(dataTypeSettings))
        {
            _logger.LogInformation(
                "Removing existing {DataType} data from unit of work: {Filename} -> {DataElementId}",
                dataTypeSettings.DataType,
                dataTypeSettings.GetFilenameOrDefault(),
                dataElement.Id
            );
        }
    }

    private static async Task<ReadOnlyMemory<byte>> ReadPayloadData(
        FiksIOMessagePayload payload,
        CancellationToken cancellationToken
    )
    {
        if (payload.Data.CanSeek)
        {
            payload.Data.Position = 0;
        }

        using var memoryStream = new MemoryStream();
        await payload.Data.CopyToAsync(memoryStream, cancellationToken);

        if (payload.Data.CanSeek)
        {
            payload.Data.Position = 0;
        }

        return memoryStream.ToArray();
    }

    /// <inheritdoc />
    public Task ValidateConfiguration(
        IReadOnlyList<DataType> configuredDataTypes,
        IReadOnlyList<ProcessTask> configuredProcessTasks
    )
    {
        if (_fiksArkivSettings.Receipt is null)
            throw new FiksArkivConfigurationException(
                $"{nameof(FiksArkivSettings.Receipt)} configuration is required, but missing."
            );

        _fiksArkivSettings.Receipt.Validate(nameof(_fiksArkivSettings.Receipt), configuredDataTypes);

        IFiksArkivPayloadGenerator payloadGenerator =
            _appImplementationFactory.GetRequired<IFiksArkivPayloadGenerator>();
        return payloadGenerator.ValidateConfiguration(configuredDataTypes, configuredProcessTasks);
    }
}
