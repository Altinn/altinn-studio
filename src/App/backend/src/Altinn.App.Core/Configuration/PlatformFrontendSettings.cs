namespace Altinn.App.Core.Configuration;

/// <summary>
/// Platform-controlled configuration values exposed to the frontend via the bootstrap global data.
/// Populated from Kubernetes ConfigMaps/environment variables using the section name "PlatformFrontendSettings".
/// </summary>
/// <remarks>
/// The app frontend takes every platform link from these URLs and never derives one from the page's host. A link whose
/// URL is null (or empty) is still shown, visibly marked as not configured, and clicking it names the missing setting
/// instead of navigating, so a misconfigured environment is obvious rather than masked.
/// </remarks>
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
    /// URL that logs the user out of Altinn. Null shows the logout link as not configured.
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
    /// URL of the Altinn overview of all forms. Null shows the link to it as not configured.
    /// </summary>
    public string? AllFormsUrl { get; set; }

    /// <summary>
    /// URL of the Altinn 3 "arbeidsflate" inbox. Null in environments where the arbeidsflate is not
    /// deployed, which shows every link to it as not configured.
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
    /// URL of the user profile in the arbeidsflate. Null shows the link to it as not configured.
    /// </summary>
    public string? ArbeidsflateProfileUrl { get; set; }

    /// <summary>
    /// URL of the access management endpoint that switches party and redirects onwards. Supports the
    /// <c>{partyId}</c> and <c>{goTo}</c> placeholders. When null the arbeidsflate is linked without
    /// switching party.
    /// </summary>
    public string? AccessManagementChangeAndRedirectUrl { get; set; }

    /// <summary>
    /// URL of the access management front page, where users can see who can delegate rights. Null shows the link to
    /// it as not configured.
    /// </summary>
    public string? AccessManagementUrl { get; set; }

    /// <summary>
    /// URL of the Altinn help page about roles and rights. Null shows the link to it as not configured.
    /// </summary>
    public string? RolesAndRightsHelpUrl { get; set; }

    /// <summary>
    /// URL of the arbeidsflate profile settings for parties. Null shows the link to it as not configured.
    /// </summary>
    public string? ArbeidsflatePartiesUrl { get; set; }
}
