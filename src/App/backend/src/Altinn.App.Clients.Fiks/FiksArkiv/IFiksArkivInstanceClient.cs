using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

/// <summary>
/// The service-owner-authenticated Storage calls the Fiks Arkiv task needs beyond its unit of work.
/// </summary>
internal interface IFiksArkivInstanceClient
{
    /// <summary>
    /// Generates a <see cref="AuthenticationMethod.ServiceOwner()"/> JWT token.
    /// </summary>
    internal Task<JwtToken> GetServiceOwnerToken(CancellationToken cancellationToken = default);

    /// <summary>
    /// Marks the instance as complete by the service owner.
    /// </summary>
    Task MarkInstanceComplete(InstanceIdentifier instanceIdentifier, CancellationToken cancellationToken = default);
}
