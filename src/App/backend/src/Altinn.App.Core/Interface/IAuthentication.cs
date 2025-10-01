namespace Altinn.App.Core.Interface;

/// <summary>
/// Authentication interface.
/// </summary>
[Obsolete(message: "Use Altinn.App.Core.Internal.Auth.IAuthenticationClient instead", error: true)]
public interface IAuthentication
{
    /// <summary>
    /// Refreshes the AltinnStudioRuntime JwtToken.
    /// </summary>
    /// <returns>Response message from Altinn Platform with refreshed token.</returns>
    Task<string> RefreshToken();
}
