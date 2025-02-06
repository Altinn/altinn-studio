namespace Altinn.App.Core.Features.Auth;

/// <summary>
/// The type of the token, meaning how the user logged in
/// </summary>
public enum TokenIssuer
{
    /// <summary>
    /// Token is missing or invalid
    /// </summary>
    None,

    /// <summary>
    /// Token is unknown or not recognized
    /// </summary>
    Unknown,

    /// <summary>
    /// Token is from Altinn portal or Altinn Authentication through token exchange
    /// </summary>
    Altinn,

    /// <summary>
    /// Token is from Altinn Studio
    /// </summary>
    AltinnStudio,

    /// <summary>
    /// Token is from external ID-porten, e.g. SBS
    /// </summary>
    IDporten,

    /// <summary>
    /// Token is from Maskinporten directly, e.g. service owner token, org token, system user token (when not exchanged)
    /// </summary>
    Maskinporten,
}
