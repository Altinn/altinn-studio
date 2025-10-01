using Altinn.App.Core.Features;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Internal.Auth;

/// <summary>
/// Resolves authentication tokens based on the specified authentication method.
/// </summary>
internal interface IAuthenticationTokenResolver
{
    /// <summary>
    /// Retrieves an access token based on the specified authentication method.
    /// </summary>
    Task<JwtToken> GetAccessToken(
        AuthenticationMethod authenticationMethod,
        CancellationToken cancellationToken = default
    );
}
