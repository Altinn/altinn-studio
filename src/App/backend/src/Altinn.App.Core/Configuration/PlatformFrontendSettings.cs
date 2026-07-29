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
    /// URL that logs the user out of Altinn.
    /// </summary>
    public string? LogoutUrl { get; set; }

    /// <summary>
    /// URL that logs the user in and returns them to <c>{goTo}</c>.
    /// </summary>
    public string? LoginUrl { get; set; }

    /// <summary>
    /// URL that forces a step-up to authentication level high and returns the user to <c>{goTo}</c>.
    /// </summary>
    public string? UpgradeAuthenticationLevelUrl { get; set; }
}
