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
    /// Base URL (with trailing /) for the Altinn 3 "arbeidsflate" (inbox/message box, profile etc.).
    /// Supports the <c>{hostName}</c> placeholder which is replaced with <see cref="GeneralSettings.HostName"/>,
    /// so a single value resolves correctly across all environments (e.g. <c>https://af.tt02.altinn.no/</c>).
    /// </summary>
    public string ArbeidsflateBaseUrl { get; set; } = "https://af.{hostName}/";

    /// <summary>
    /// Base URL (with trailing /) for the access management UI, used to switch party before
    /// redirecting to the arbeidsflate. Supports the <c>{hostName}</c> placeholder.
    /// </summary>
    public string AccessManagementBaseUrl { get; set; } = "https://am.ui.{hostName}/";

    /// <summary>
    /// Returns a copy with environment-specific placeholders resolved against the given host name.
    /// </summary>
    public PlatformFrontendSettings Resolve(string hostName) =>
        new()
        {
            PostalCodesUrl = PostalCodesUrl,
            AltinnLogoUrl = AltinnLogoUrl,
            HelpCircleIllustrationUrl = HelpCircleIllustrationUrl,
            ArbeidsflateBaseUrl = ArbeidsflateBaseUrl.Replace(
                "{hostName}",
                hostName,
                StringComparison.OrdinalIgnoreCase
            ),
            AccessManagementBaseUrl = AccessManagementBaseUrl.Replace(
                "{hostName}",
                hostName,
                StringComparison.OrdinalIgnoreCase
            ),
        };
}
