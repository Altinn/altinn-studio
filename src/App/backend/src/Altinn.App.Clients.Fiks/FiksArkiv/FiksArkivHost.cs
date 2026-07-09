using System.Diagnostics;
using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.Exceptions;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using KS.Fiks.Arkiv.Models.V1.Arkivering.Arkivmeldingkvittering;
using KS.Fiks.Arkiv.Models.V1.Feilmelding;
using KS.Fiks.Arkiv.Models.V1.Meldingstyper;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

internal sealed class FiksArkivHost : BackgroundService, IFiksArkivHost
{
    private readonly ILogger<FiksArkivHost> _logger;
    private readonly IFiksIOClient _fiksIOClient;
    private readonly Telemetry? _telemetry;
    private readonly IFiksArkivInstanceClient _fiksArkivInstanceClient;
    private readonly IHostEnvironment _env;
    private readonly TimeProvider _timeProvider;
    private readonly FiksArkivSettings _fiksArkivSettings;
    private readonly IFiksArkivConfigResolver _fiksArkivConfigResolver;
    private readonly AppImplementationFactory _appImplementationFactory;

    private static readonly TimeSpan _raceConditionDeferralInterval = TimeSpan.FromSeconds(1);

    private IFiksArkivPayloadGenerator _fiksArkivPayloadGenerator =>
        _appImplementationFactory.GetRequired<IFiksArkivPayloadGenerator>();
    private IFiksArkivResponseHandler _fiksArkivResponseHandler =>
        _appImplementationFactory.GetRequired<IFiksArkivResponseHandler>();

    public FiksArkivHost(
        IFiksIOClient fiksIOClient,
        IOptions<FiksArkivSettings> fiksArkivSettings,
        ILogger<FiksArkivHost> logger,
        IFiksArkivConfigResolver fiksArkivConfigResolver,
        IFiksArkivInstanceClient fiksArkivInstanceClient,
        AppImplementationFactory appImplementationFactory,
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
        _fiksArkivInstanceClient = fiksArkivInstanceClient;
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
    public async Task<FiksIOMessageResponse> GenerateAndSendMessage(
        string taskId,
        Instance instance,
        string messageType,
        CancellationToken cancellationToken = default
    )
    {
        FiksIOMessageRequest request = await CreateMessageRequest(
            taskId,
            instance,
            messageType,
            dataAccessor: null,
            cancellationToken
        );

        await SaveArchiveRecord(instance, request);
        return await SendMessage(request, taskId, instance, cancellationToken);
    }

    public async Task StageArchiveRecordForMessage(
        string taskId,
        Instance instance,
        string messageType,
        IInstanceDataMutator dataMutator,
        CancellationToken cancellationToken = default
    )
    {
        FiksIOMessageRequest request = await CreateMessageRequest(
            taskId,
            instance,
            messageType,
            dataMutator,
            cancellationToken
        );

        await SaveArchiveRecord(dataMutator, request, taskId, cancellationToken);
    }

    public async Task<FiksIOMessageResponse> SendStagedMessage(
        string taskId,
        Instance instance,
        string messageType,
        IInstanceDataAccessor dataAccessor,
        CancellationToken cancellationToken = default
    )
    {
        FiksIOMessageRequest request = await CreateMessageRequest(
            taskId,
            instance,
            messageType,
            dataAccessor,
            cancellationToken
        );
        request = await ReplaceArchiveRecordWithCommittedPayload(request, dataAccessor);

        return await SendMessage(request, taskId, instance, cancellationToken);
    }

    private async Task<FiksIOMessageRequest> CreateMessageRequest(
        string taskId,
        Instance instance,
        string messageType,
        IInstanceDataAccessor? dataAccessor,
        CancellationToken cancellationToken
    )
    {
        var instanceId = new InstanceIdentifier(instance.Id);
        var recipient = dataAccessor is not null
            ? await _fiksArkivConfigResolver.GetRecipient(dataAccessor, cancellationToken)
            : await _fiksArkivConfigResolver.GetRecipient(instance, cancellationToken);
        var messagePayloads = await _fiksArkivPayloadGenerator.GeneratePayload(
            taskId,
            instance,
            recipient,
            messageType,
            dataAccessor,
            cancellationToken
        );

        return new FiksIOMessageRequest(
            Recipient: recipient.AccountId,
            MessageType: messageType,
            SendersReference: instanceId.InstanceGuid,
            MessageLifetime: TimeSpan.FromDays(2),
            Payload: messagePayloads,
            CorrelationId: _fiksArkivConfigResolver.GetCorrelationId(instance)
        );
    }

    private async Task<FiksIOMessageResponse> SendMessage(
        FiksIOMessageRequest request,
        string taskId,
        Instance instance,
        CancellationToken cancellationToken
    )
    {
        _logger.LogInformation("Sending Fiks Arkiv message for instance {InstanceId}", instance.Id);
        using Activity? mainActivity = _telemetry?.StartGenerateAndSendFiksActivity(
            taskId,
            instance,
            request.MessageType
        );

        FiksIOMessageResponse response = await _fiksIOClient.SendMessage(request, cancellationToken);
        _logger.LogInformation("Fiks Arkiv responded with message ID {MessageId}", response.MessageId);

        return response;
    }

    private async Task<FiksIOMessageRequest> ReplaceArchiveRecordWithCommittedPayload(
        FiksIOMessageRequest request,
        IInstanceDataAccessor dataAccessor
    )
    {
        ArgumentNullException.ThrowIfNull(_fiksArkivSettings.Receipt);

        DataElement archiveRecordDataElement = dataAccessor
            .Instance.GetOptionalDataElements(_fiksArkivSettings.Receipt.ArchiveRecord.DataType)
            .Single(x => x.Filename == _fiksArkivSettings.Receipt.ArchiveRecord.GetFilenameOrDefault());

        var payloads = request.Payload.Where(x => x.Filename != FiksArkivConstants.Filenames.ArchiveRecord).ToList();
        payloads.Insert(
            0,
            new FiksIOMessagePayload(
                FiksArkivConstants.Filenames.ArchiveRecord,
                await dataAccessor.GetBinaryData(archiveRecordDataElement)
            )
        );

        return request with
        {
            Payload = payloads,
        };
    }

    internal async Task HandleReceivedMessage(Instance instance, FiksIOReceivedMessage message)
    {
        _logger.LogInformation(
            "Handling received Fiks Arkiv message {MessageType}:{MessageId}",
            message.Message.MessageType,
            message.Message.MessageId
        );

        IReadOnlyList<FiksArkivReceivedMessagePayload>? payloads = await DecryptAndDeserializePayloads(message);
        bool isError =
            message.IsErrorResponse || payloads?.OfType<FiksArkivReceivedMessagePayload.Error>().Any() is true;

        _logger.LogInformation(
            "Message contains {PayloadCount} payload(s): {Payloads}",
            payloads?.Count ?? 0,
            payloads?.Select(x => x.Filename)
        );

        _telemetry?.RecordFiksMessageReceived(
            isError ? Telemetry.Fiks.FiksResult.Error : Telemetry.Fiks.FiksResult.Success
        );

        await (
            isError
                ? _fiksArkivResponseHandler.HandleError(instance, message, payloads)
                : _fiksArkivResponseHandler.HandleSuccess(instance, message, payloads)
        );

        // Persist receipt on the instance
        if (message.IsReceiptResponse)
        {
            if (payloads?.FirstOrDefault() is not FiksArkivReceivedMessagePayload.Receipt receipt)
            {
                _logger.LogWarning(
                    "No receipt payload found in Fiks message of type {ReceiptMessageType}. This is unexpected. Payloads were: {Payloads}",
                    FiksArkivConstants.MessageTypes.ArchiveRecordCreationReceipt,
                    payloads
                );
                return;
            }

            await SaveArchiveReceipt(instance, receipt);
        }
    }

    internal async Task IncomingMessageListener(FiksIOReceivedMessage message)
    {
        using Activity? mainActivity = _telemetry?.StartReceiveFiksActivity(
            message.Message.Sender,
            message.Message.MessageId,
            message.Message.MessageType,
            message.Message.SendersReference,
            message.Message.InReplyToMessage,
            message.Message.CorrelationId
        );

        Instance? instance = null;

        try
        {
            _logger.LogInformation(
                "Received message {MessageType}:{MessageId} from {MessageSender}, in reply to {MessageReplyFor} with senders-reference {SendersReference} and correlation-id {CorrelationId}",
                message.Message.MessageType,
                message.Message.MessageId,
                message.Message.Sender,
                message.Message.InReplyToMessage,
                message.Message.SendersReference,
                message.Message.CorrelationId
            );

            instance = await RetrieveInstance(message);

            if (CurrentTaskIsFiksArkiv(instance))
            {
                _logger.LogWarning(
                    "Current task is the Fiks Arkiv service task. This most likely means we are experiencing an order of operation issue with process/next. Deferring processing of message {MessageId} by {DeferralInterval} to give the situation time to resolve itself.",
                    message.Message.MessageId,
                    _raceConditionDeferralInterval
                );

                await Task.Delay(_raceConditionDeferralInterval);
                await message.Responder.NackWithRequeue();

                return;
            }

            using Activity? innerActivity = _telemetry?.StartFiksMessageHandlerActivity(instance, GetType());

            await HandleReceivedMessage(instance, message);
            await message.Responder.Ack();

            _logger.LogInformation(
                "Processing completed successfully for message {MessageId}",
                message.Message.MessageId
            );
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

            // Attempt to move the process forward on error, unless we're still stuck in the service task
            if (!CurrentTaskIsFiksArkiv(instance))
                await TryMoveProcessOnError(instance);
        }
    }

    /// <summary>
    /// Checks if the current task on the instance is the Fiks Arkiv service task.
    /// If so, that means we're experiencing an order of operation issue and should attempt to wait for
    /// the process/next sequence to finish before proceeding.
    /// </summary>
    private static bool CurrentTaskIsFiksArkiv(Instance? instance) =>
        instance?.Process?.CurrentTask?.AltinnTaskType?.Equals(
            AltinnTaskTypes.FiksArkiv,
            StringComparison.OrdinalIgnoreCase
        )
            is true;

    private async Task<DataElement> SaveArchiveRecord(Instance instance, FiksIOMessageRequest request)
    {
        _logger.LogInformation("Saving archive record for Fiks Arkiv request: {Request}", request);
        ArgumentNullException.ThrowIfNull(_fiksArkivSettings.Receipt);

        await DeleteExistingDataElements(instance, _fiksArkivSettings.Receipt.ArchiveRecord);

        DataElement result = await _fiksArkivInstanceClient.InsertBinaryData(
            new InstanceIdentifier(instance),
            _fiksArkivSettings.Receipt.ArchiveRecord.DataType,
            "application/xml",
            _fiksArkivSettings.Receipt.ArchiveRecord.GetFilenameOrDefault(),
            request.Payload.Single(x => x.Filename == FiksArkivConstants.Filenames.ArchiveRecord).Data
        );

        _logger.LogInformation(
            "Saved {Filename} with ID {DataElementId} to instance {InstanceId}",
            result.Filename,
            result.Id,
            instance.Id
        );

        return result;
    }

    private async Task SaveArchiveRecord(
        IInstanceDataMutator dataMutator,
        FiksIOMessageRequest request,
        string taskId,
        CancellationToken cancellationToken
    )
    {
        _logger.LogInformation("Staging archive record for Fiks Arkiv request: {Request}", request);
        ArgumentNullException.ThrowIfNull(_fiksArkivSettings.Receipt);

        DeleteExistingDataElements(dataMutator, _fiksArkivSettings.Receipt.ArchiveRecord);

        FiksIOMessagePayload archiveRecordPayload = request.Payload.Single(x =>
            x.Filename == FiksArkivConstants.Filenames.ArchiveRecord
        );

        dataMutator.AddBinaryDataElement(
            _fiksArkivSettings.Receipt.ArchiveRecord.DataType,
            "application/xml",
            _fiksArkivSettings.Receipt.ArchiveRecord.GetFilenameOrDefault(),
            await ReadPayloadData(archiveRecordPayload, cancellationToken),
            generatedFromTask: taskId
        );
    }

    private async Task<DataElement> SaveArchiveReceipt(
        Instance instance,
        FiksArkivReceivedMessagePayload.Receipt receipt
    )
    {
        _logger.LogInformation("Saving archive receipt: {Receipt}", receipt);
        ArgumentNullException.ThrowIfNull(_fiksArkivSettings.Receipt);

        await DeleteExistingDataElements(instance, _fiksArkivSettings.Receipt.ConfirmationRecord);

        DataElement result = await _fiksArkivInstanceClient.InsertBinaryData(
            new InstanceIdentifier(instance),
            _fiksArkivSettings.Receipt.ConfirmationRecord.DataType,
            "application/xml",
            _fiksArkivSettings.Receipt.ConfirmationRecord.GetFilenameOrDefault(),
            receipt.Details.SerializeXml()
        );

        _logger.LogInformation(
            "Saved {Filename} with ID {DataElementId} to instance {InstanceId}",
            result.Filename,
            result.Id,
            instance.Id
        );

        return result;
    }

    private async Task DeleteExistingDataElements(Instance instance, FiksArkivDataTypeSettings dataTypeSettings)
    {
        var dataElements = instance
            .GetOptionalDataElements(dataTypeSettings.DataType)
            .Where(x => x.Filename == dataTypeSettings.GetFilenameOrDefault())
            .ToList();

        if (dataElements.Count == 0)
            return;

        var instanceIdentifier = new InstanceIdentifier(instance);
        foreach (var dataElement in dataElements)
        {
            _logger.LogInformation(
                "Deleting existing {DataType} data: {Filename} -> {DataElementId}",
                dataTypeSettings.DataType,
                dataTypeSettings.Filename,
                dataElement.Id
            );
            await _fiksArkivInstanceClient.DeleteBinaryData(instanceIdentifier, Guid.Parse(dataElement.Id));
        }
    }

    private void DeleteExistingDataElements(
        IInstanceDataMutator dataMutator,
        FiksArkivDataTypeSettings dataTypeSettings
    )
    {
        var dataElements = dataMutator
            .Instance.GetOptionalDataElements(dataTypeSettings.DataType)
            .Where(x => x.Filename == dataTypeSettings.GetFilenameOrDefault())
            .ToList();

        foreach (var dataElement in dataElements)
        {
            _logger.LogInformation(
                "Removing existing {DataType} data from unit of work: {Filename} -> {DataElementId}",
                dataTypeSettings.DataType,
                dataTypeSettings.Filename,
                dataElement.Id
            );
            dataMutator.RemoveDataElement(dataElement);
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

    private async Task TryMoveProcessOnError(Instance? instance)
    {
        if (instance is null)
        {
            _logger.LogError("Unable to move the process forward, because the `instance` object has not been resolved");
            return;
        }

        if (_fiksArkivSettings.ErrorHandling?.MoveToNextTask is not true)
        {
            _logger.LogWarning(
                "Unable to move the process forward, because the `FiksArkivSettings.AutoSend.ErrorHandling.MoveToNextTask` configuration property has been disabled or not been set"
            );
            return;
        }

        await _fiksArkivInstanceClient.ProcessMoveNext(
            new InstanceIdentifier(instance),
            _fiksArkivSettings.ErrorHandling?.Action
        );
    }

    private async Task<Instance> RetrieveInstance(FiksIOReceivedMessage receivedMessage)
    {
        InstanceIdentifier instanceIdentifier = ParseCorrelationId(receivedMessage.Message.CorrelationId);

        try
        {
            return await _fiksArkivInstanceClient.GetInstance(instanceIdentifier);
        }
        catch (Exception e)
        {
            throw new FiksArkivException($"Error fetching Instance object for {instanceIdentifier}: {e.Message}", e);
        }
    }

    private static InstanceIdentifier ParseCorrelationId(string? correlationId)
    {
        try
        {
            ArgumentNullException.ThrowIfNull(correlationId);
            return InstanceIdentifier.CreateFromUrl(correlationId);
        }
        catch (Exception e)
        {
            throw new FiksArkivException($"Error parsing Correlation ID for received message: {correlationId}", e);
        }
    }

    private async Task<IReadOnlyList<FiksArkivReceivedMessagePayload>?> DecryptAndDeserializePayloads(
        FiksIOReceivedMessage receivedMessage
    )
    {
        var payloads = await receivedMessage.Message.GetDecryptedPayloads();
        return payloads
            ?.Select(x => ParseMessagePayload(x.Filename, x.Content, receivedMessage.Message.MessageType))
            .ToList();
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

        return _fiksArkivPayloadGenerator.ValidateConfiguration(configuredDataTypes, configuredProcessTasks);
    }
}
