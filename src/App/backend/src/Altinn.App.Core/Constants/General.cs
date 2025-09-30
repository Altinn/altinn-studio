namespace Altinn.App.Core.Constants;

/// <summary>
/// Misc constants, mostly related to HTTP headers and cookies.
/// </summary>
public static class General
{
    /// <summary>
    /// App token name
    /// </summary>
    public const string AppTokenName = "AltinnToken";

    /// <summary>
    /// The name of the authorization token
    /// </summary>
    public const string AuthorizationTokenHeaderName = "Authorization";

    /// <summary>
    /// The name of the cookie used for asp authentication in runtime application
    /// </summary>
    public const string RuntimeCookieName = "AltinnStudioRuntime";

    /// <summary>
    /// The name of the cookie used for asp authentication in designer application
    /// </summary>
    public const string DesignerCookieName = "AltinnStudioDesigner";

    /// <summary>
    /// Header name for API management subscription key
    /// </summary>
    public const string SubscriptionKeyHeaderName = "Ocp-Apim-Subscription-Key";

    /// <summary>
    /// Header name for eFormidling Integration Point access token
    /// </summary>
    public const string EFormidlingAccessTokenHeaderName = "AltinnIntegrationPointToken";

    /// <summary>
    /// Header name for platform access token
    /// </summary>
    internal const string PlatformAccessTokenHeaderName = "PlatformAccessToken";
}
