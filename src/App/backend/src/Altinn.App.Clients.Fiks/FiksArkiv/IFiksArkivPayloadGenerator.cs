using Altinn.App.Clients.Fiks.FiksArkiv.Models;
using Altinn.App.Clients.Fiks.FiksIO.Models;
using Altinn.App.Core.Features;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

/// <summary>
/// Generator for the content of a Fiks Arkiv message request.
/// </summary>
[ImplementableByApps]
public interface IFiksArkivPayloadGenerator
{
    /// <summary>
    /// Generates the content of a Fiks Arkiv message request.
    /// </summary>
    /// <param name="taskId">The task which triggered the sending.</param>
    /// <param name="instance">The instance for which this message relates to.</param>
    /// <param name="recipient">The recipient of this message.</param>
    /// <param name="messageType">The Fiks Arkiv message type (create, update, etc)</param>
    /// <param name="cancellationToken">An optional cancellation token</param>
    Task<IEnumerable<FiksIOMessagePayload>> GeneratePayload(
        string taskId,
        Instance instance,
        FiksArkivRecipient recipient,
        string messageType,
        CancellationToken cancellationToken = default
    );
}
