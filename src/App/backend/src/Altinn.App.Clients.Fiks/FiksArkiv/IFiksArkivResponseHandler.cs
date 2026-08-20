using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

/// <summary>
/// Handler of the message responses from Fiks Arkiv.
/// </summary>
/// <remarks>
/// Called once per message the archive sends back, from <see cref="FiksArkivServiceTask"/>'s reply handler
/// — inside the transition the message belongs to, with the engine's retries behind it; a throw hands the
/// same message to the handler again. <strong>Do not move the process from here</strong>: the task applies
/// <c>successHandling</c>/<c>errorHandling</c> itself, and a <c>process/next</c> from here is refused with
/// <c>409</c> and only stalls the shipment. The message is <em>replayed</em> — connection-bound members
/// throw; ask <see cref="FiksIOReceivedMessage.IsReplayed"/>. Delivery is at least once;
/// <c>message.Message.MessageId</c> is the deduplication key.
/// </remarks>
[ImplementableByApps]
public interface IFiksArkivResponseHandler
{
    /// <summary>
    /// Handles a successful response from FIKS Arkiv.
    /// </summary>
    /// <param name="instance">The instance for which this message relates to.</param>
    /// <param name="message">The received message.</param>
    /// <param name="payloads">The decrypted and deserialized payloads attached to this message.</param>
    /// <param name="cancellationToken">An optional cancellation token.</param>
    Task HandleSuccess(
        Instance instance,
        FiksIOReceivedMessage message,
        IReadOnlyList<FiksArkivReceivedMessagePayload>? payloads,
        CancellationToken cancellationToken = default
    );

    /// <summary>
    /// Handles an error response from FIKS Arkiv.
    /// </summary>
    /// <param name="instance">The instance for which this message relates to.</param>
    /// <param name="message">The received message.</param>
    /// <param name="payloads">The decrypted and deserialized payloads attached to this message.</param>
    /// <param name="cancellationToken">An optional cancellation token.</param>
    Task HandleError(
        Instance instance,
        FiksIOReceivedMessage message,
        IReadOnlyList<FiksArkivReceivedMessagePayload>? payloads,
        CancellationToken cancellationToken = default
    );
}
