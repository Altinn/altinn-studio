using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

/// <summary>
/// The built-in <see cref="IFiksArkivResponseHandler"/>: it records what the archive said and leaves every
/// decision to <see cref="FiksArkivServiceTask"/>. It used to move the process and mark the instance complete
/// from <c>successHandling</c>/<c>errorHandling</c>, because it ran in the Fiks IO subscriber and nothing else
/// could; the task now applies those settings itself. They mean exactly what they meant before.
/// </summary>
internal sealed class FiksArkivDefaultResponseHandler : IFiksArkivResponseHandler
{
    private readonly ILogger<FiksArkivDefaultResponseHandler> _logger;

    public FiksArkivDefaultResponseHandler(ILogger<FiksArkivDefaultResponseHandler> logger)
    {
        _logger = logger;
    }

    /// <inheritdoc />
    public Task HandleSuccess(
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

        if (payloads?.Count > 1)
            _logger.LogWarning(
                "Message contains multiple responses. This is unexpected and possibly warrants further investigation."
            );

        return Task.CompletedTask;
    }

    /// <inheritdoc />
    public Task HandleError(
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

        return Task.CompletedTask;
    }
}
