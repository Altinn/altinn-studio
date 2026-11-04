using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace Altinn.App.Clients.Fiks.FiksArkiv;

/// <summary>
/// Resolves the service owner's token, which the Fiks Arkiv startup validation checks.
/// </summary>
internal interface IFiksArkivInstanceClient
{
    /// <summary>
    /// Generates a <see cref="AuthenticationMethod.ServiceOwner()"/> JWT token.
    /// </summary>
    internal Task<JwtToken> GetServiceOwnerToken(CancellationToken cancellationToken = default);
}
