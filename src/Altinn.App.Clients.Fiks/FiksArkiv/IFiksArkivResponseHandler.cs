using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

/// <summary>
/// Handler of the message responses from Fiks Arkiv.
/// </summary>
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
