namespace Altinn.App.Core.Configuration;

/// <summary>
/// Platform-controlled configuration values exposed to the frontend via the bootstrap global data.
/// Populated from Kubernetes ConfigMaps/environment variables using the section name "PlatformFrontendSettings".
/// </summary>
internal class PlatformFrontendSettings
{
    /// <summary>
    /// URL for the postal codes registry.
    /// </summary>
    public Uri PostalCodesUrl { get; set; } = new("https://altinncdn.no/postcodes/registry.json");

    /// <summary>
    /// URL for the authentication url stored in kubernetes store
    /// </summary>
    public Uri? AuthenticationUrl { get; set; }

    /// <summary>
    /// Base URL for the app frontend CDN.
    /// </summary>
    public Uri AppFrontendCdnBaseUrl { get; set; } = new("https://altinncdn.no/toolkits/altinn-app-frontend");

    /// <summary>
    /// URL for the Altinn logo SVG.
    /// </summary>
    public Uri AltinnLogoUrl { get; set; } = new("https://altinncdn.no/img/Altinn-logo-blue.svg");

    /// <summary>
    /// URL for the help circle illustration SVG.
    /// </summary>
    public Uri HelpCircleIllustrationUrl { get; set; } = new("https://altinncdn.no/img/illustration-help-circle.svg");
}
