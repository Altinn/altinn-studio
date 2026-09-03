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

    /// <summary>
    /// URL of the Altinn 3 "arbeidsflate" inbox. Null in environments where the arbeidsflate is not
    /// deployed, which hides every link to it.
    /// </summary>
    /// <remarks>
    /// This and the other arbeidsflate URLs are templates rather than <see cref="Uri"/>s: the frontend substitutes the
    /// <c>{placeholder}</c> segments per request. Keeping the whole URL here means a change to the
    /// arbeidsflate route structure is a configuration change, not a new app frontend release.
    /// </remarks>
    public string? ArbeidsflateInboxUrl { get; set; }

    /// <summary>
    /// URL of a single dialog in the arbeidsflate inbox. Supports the <c>{dialogId}</c> placeholder.
    /// Falls back to <see cref="ArbeidsflateInboxUrl"/> when null.
    /// </summary>
    public string? ArbeidsflateDialogUrl { get; set; }

    /// <summary>
    /// URL of the user profile in the arbeidsflate.
    /// </summary>
    public string? ArbeidsflateProfileUrl { get; set; }

    /// <summary>
    /// URL of the access management endpoint that switches party and redirects onwards. Supports the
    /// <c>{partyId}</c> and <c>{goTo}</c> placeholders. When null the arbeidsflate is linked without
    /// switching party.
    /// </summary>
    public string? AccessManagementChangeAndRedirectUrl { get; set; }
}
