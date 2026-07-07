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
    /// The name of the authorization token header
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
    /// The name of the eFormidling Integration Point token header
    /// </summary>
    public const string EFormidlingAccessTokenHeaderName = "AltinnIntegrationPointToken";

    /// <summary>
    /// Header name for platform access token
    /// </summary>
    internal const string PlatformAccessTokenHeaderName = "PlatformAccessToken";

    /// <summary>
    /// Header name for instance lock token
    /// </summary>
    internal const string LockTokenHeaderName = "Altinn-Storage-Lock-Token";

    /// <summary>
    /// Header that tells Storage the caller manages its own task-generated data cleanup,
    /// so Storage should skip its own cleanup of elements generated from the entered task.
    /// </summary>
    internal const string SkipTaskDataCleanupHeaderName = "Altinn-Storage-Skip-Task-Data-Cleanup";
}
