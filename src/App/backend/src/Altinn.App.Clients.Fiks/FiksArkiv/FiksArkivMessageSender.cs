using System.Diagnostics;
using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.Extensions;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

internal sealed class FiksArkivMessageSender : IFiksArkivMessageSender
{
    private readonly ILogger<FiksArkivMessageSender> _logger;
    private readonly IFiksIOClient _fiksIOClient;
    private readonly Telemetry? _telemetry;
    private readonly FiksArkivSettings _fiksArkivSettings;
    private readonly IFiksArkivConfigResolver _fiksArkivConfigResolver;
    private readonly AppImplementationFactory _appImplementationFactory;

    public FiksArkivMessageSender(
        IFiksIOClient fiksIOClient,
        IOptions<FiksArkivSettings> fiksArkivSettings,
        IFiksArkivConfigResolver fiksArkivConfigResolver,
        AppImplementationFactory appImplementationFactory,
        ILogger<FiksArkivMessageSender> logger,
        Telemetry? telemetry = null
    )
    {
        _fiksIOClient = fiksIOClient;
        _fiksArkivSettings = fiksArkivSettings.Value;
        _fiksArkivConfigResolver = fiksArkivConfigResolver;
        _appImplementationFactory = appImplementationFactory;
        _logger = logger;
        _telemetry = telemetry;
    }

    /// <inheritdoc />
    public async Task<FiksIOMessageResponse> GenerateAndSendMessage(
        string taskId,
        string messageType,
        Guid sendersReference,
        Guid replyAddress,
        DateTimeOffset executionReferenceTime,
        IInstanceDataMutator dataMutator,
        CancellationToken cancellationToken = default
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
        Guid replyAddress,
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
                // klientKorrelasjonsId is the one field Fiks IO echoes on every reply, so the reply address
                // rides here.
                CorrelationId: replyAddress.ToString()
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
}
