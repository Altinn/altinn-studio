using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

/// <summary>
/// Handler of the message responses from Fiks Arkiv.
/// </summary>
/// <remarks>
/// Called once per message the archive sends back, from <see cref="FiksArkivServiceTask"/>'s reply handler —
/// inside the process transition the message belongs to, with the workflow engine's retries behind it. A throw
/// is retryable: the message stays frozen at its position and is handed to the handler again on the next
/// attempt.
/// <para>
/// <strong>Do not move the process from here.</strong> How the task concludes is decided by
/// <c>successHandling</c>/<c>errorHandling</c> and applied by the task itself. A handler that calls
/// <c>process/next</c> anyway cannot advance it twice — the transition this runs inside is still active, so the
/// request is refused with <c>409 Conflict</c> — it only stalls the shipment. Use this to observe, log, notify,
/// or record something of your own.
/// </para>
/// <para>
/// The message is a <em>replayed</em> <see cref="FiksIOReceivedMessage"/>: its values are all there, but the
/// Fiks IO connection it arrived on is long gone, so <see cref="FiksIOReceivedMessage.Responder"/> and the
/// stream members throw. Ask <see cref="FiksIOReceivedMessage.IsReplayed"/> rather than finding out from an
/// exception days into an exchange. Delivery is at least once, and <c>message.Message.MessageId</c> is the key
/// the platform deduplicated on.
/// </para>
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
