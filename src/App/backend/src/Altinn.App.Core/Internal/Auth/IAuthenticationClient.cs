namespace Altinn.App.Core.Internal.Auth;

/// <summary>
/// Authentication interface.
/// </summary>
public interface IAuthenticationClient
{
    /// <summary>
    /// Refreshes the AltinnStudioRuntime JwtToken.
    /// </summary>
    /// <param name="cancellationToken">An optional cancellation token</param>
    /// <returns>Response message from Altinn Platform with refreshed token.</returns>
    Task<string> RefreshToken(CancellationToken cancellationToken = default);
}
