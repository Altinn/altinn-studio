using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

/// <summary>
/// Resolves the service owner's token, so an app that cannot authenticate as the service owner, as every workflow
/// save does, fails at startup.
/// </summary>
internal interface IFiksArkivInstanceClient
{
    /// <summary>
    /// Generates a <see cref="AuthenticationMethod.ServiceOwner()"/> JWT token.
    /// </summary>
    internal Task<JwtToken> GetServiceOwnerToken(CancellationToken cancellationToken = default);
}
