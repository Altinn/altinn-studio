using Altinn.App.Clients.Fiks.Constants;
using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

internal sealed class FiksArkivDefaultResponseHandler : IFiksArkivResponseHandler
{
    private readonly FiksArkivSettings _fiksArkivSettings;
    private readonly IFiksArkivInstanceClient _fiksArkivInstanceClient;
    private readonly ILogger<FiksArkivDefaultResponseHandler> _logger;

    public FiksArkivDefaultResponseHandler(
        IOptions<FiksArkivSettings> fiksArkivSettings,
        IFiksArkivInstanceClient fiksArkivInstanceClient,
        ILogger<FiksArkivDefaultResponseHandler> logger
    )
    {
        _fiksArkivSettings = fiksArkivSettings.Value;
        _fiksArkivInstanceClient = fiksArkivInstanceClient;
        _logger = logger;
    }

    /// <inheritdoc />
    public async Task HandleSuccess(
        Instance instance,
        FiksIOReceivedMessage message,
        IReadOnlyList<FiksArkivReceivedMessagePayload>? payloads,
        CancellationToken cancellationToken = default
    )
    {
        _logger.LogInformation(
            "Received message {MessageType}:{MessageId} is a successful response: {MessageContent}",
            message.Message.MessageType,
            message.Message.MessageId,
            payloads?.Select(x => x.Content) ?? ["Message contains no content."]
        );

        if (message.Message.MessageType != FiksArkivConstants.MessageTypes.ArchiveRecordCreationReceipt)
        {
            _logger.LogInformation(
                "We are only interested in {TargetMessageType} messages. Skipping further processing for message of type {MessageType}.",
                FiksArkivConstants.MessageTypes.ArchiveRecordCreationReceipt,
                message.Message.MessageType
            );
            return;
        }

        if (payloads?.Count > 1)
            _logger.LogWarning(
                "Message contains multiple responses. This is unexpected and possibly warrants further investigation."
            );

        if (_fiksArkivSettings.SuccessHandling is null)
        {
            _logger.LogInformation("Success handling is disabled, skipping further processing.");
            return;
        }

        ArgumentNullException.ThrowIfNull(instance);
        InstanceIdentifier instanceIdentifier = new(instance);

        // Move the instance process forward if configured
        if (_fiksArkivSettings.SuccessHandling.MoveToNextTask)
            await _fiksArkivInstanceClient.ProcessMoveNext(
                instanceIdentifier,
                action: _fiksArkivSettings.SuccessHandling.GetActionOrDefault(),
                cancellationToken: cancellationToken
            );

        // Mark the instance as completed if configured
        if (_fiksArkivSettings.SuccessHandling.MarkInstanceComplete)
            await _fiksArkivInstanceClient.MarkInstanceComplete(instanceIdentifier, cancellationToken);
    }

    /// <inheritdoc />
    public async Task HandleError(
        Instance instance,
        FiksIOReceivedMessage message,
        IReadOnlyList<FiksArkivReceivedMessagePayload>? payloads,
        CancellationToken cancellationToken = default
    )
    {
        _logger.LogError(
            "Received message {MessageType}:{MessageId} is an error response: {MessageContent}",
            message.Message.MessageType,
            message.Message.MessageId,
            payloads?.Select(x => x.Content) ?? ["Message contains no content."]
        );

        if (_fiksArkivSettings.ErrorHandling is null)
        {
            _logger.LogInformation("Error handling is disabled, skipping further processing.");
            return;
        }

        ArgumentNullException.ThrowIfNull(instance);

        // Move the instance process forward if configured
        if (_fiksArkivSettings.ErrorHandling.MoveToNextTask)
            await _fiksArkivInstanceClient.ProcessMoveNext(
                new InstanceIdentifier(instance),
                action: _fiksArkivSettings.ErrorHandling.GetActionOrDefault(),
                cancellationToken: cancellationToken
            );
    }
}
