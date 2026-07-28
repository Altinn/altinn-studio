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
    /// URL for the Altinn logo SVG.
    /// </summary>
    public Uri AltinnLogoUrl { get; set; } = new("https://altinncdn.no/img/Altinn-logo-blue.svg");

    /// <summary>
    /// URL for the help circle illustration SVG.
    /// </summary>
    public Uri HelpCircleIllustrationUrl { get; set; } = new("https://altinncdn.no/img/illustration-help-circle.svg");

    /// <summary>
    /// Base URL for the Altinn 3 "arbeidsflate" (inbox/message box, profile etc.).
    /// </summary>
    public Uri ArbeidsflateBaseUrl { get; set; } = new("https://af.altinn.no/");

    /// <summary>
    /// Base URL for the access management UI, used to switch party before redirecting to the arbeidsflate.
    /// </summary>
    public Uri AccessManagementBaseUrl { get; set; } = new("https://am.ui.altinn.no/");
}
