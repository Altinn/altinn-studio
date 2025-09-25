namespace Altinn.App.Core.Features.Auth;

/// <summary>
/// Provides access to the current authentication context.
/// </summary>
public interface IAuthenticationContext
{
    /// <summary>
    /// The current authentication info.
    /// </summary>
    Authenticated Current { get; }
}
