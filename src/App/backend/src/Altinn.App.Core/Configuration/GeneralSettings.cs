using System.Text;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Configuration;

/// <summary>
/// General configuration settings
/// </summary>
public class GeneralSettings
{
    /// <summary>
    /// Gets or sets the soft validation prefix.
    /// </summary>
    public string SoftValidationPrefix { get; set; } = "*WARNING*";

    /// <summary>
    /// Gets or sets the fixed validation prefix.
    /// </summary>
    public string FixedValidationPrefix { get; set; } = "*FIXED*";

    /// <summary>
    /// Gets or sets the info validation prefix.
    /// </summary>
    public string InfoValidationPrefix { get; set; } = "*INFO*";

    /// <summary>
    /// Gets or sets the success validation prefix.
    /// </summary>
    public string SuccessValidationPrefix { get; set; } = "*SUCCESS*";

    /// <summary>
    /// Gets or sets the host name. This is used for cookes,
    /// and might not be the full url you can access the app on.
    /// </summary>
    public string HostName { get; set; } = "local.altinn.cloud";

    /// <summary>
    /// Gets or sets a value indicating whether to disable localtest validation on startup.
    /// </summary>
    public bool DisableLocaltestValidation { get; set; }

    internal bool DisableAppConfigurationCache { get; set; }

    internal bool IsTest { get; set; }

    /// <summary>
    /// The externally accesible base url for the app with trailing /
    /// </summary>
    /// <remarks>
    /// This setting offers the following replacemnts
    /// <br />
    /// {hostName}: GeneralSettings::Hostname<br />
    /// {org}: Org from applicationmetadata.json<br />
    /// {app}: App from applicationmetadata.json<br />
    /// </remarks>
    public string ExternalAppBaseUrl { get; set; } = "http://{hostName}/{org}/{app}/";

    /// <summary>
    /// Convenience method to get <see cref="ExternalAppBaseUrl" /> with segments replaced and trailing /
    /// </summary>
    public string FormattedExternalAppBaseUrl(AppIdentifier app)
    {
        var sb = new StringBuilder(ExternalAppBaseUrl.ToLowerInvariant());
        sb.Replace("{hostname}", HostName);
        sb.Replace("{org}", app.Org);
        sb.Replace("{app}", app.App);
        return sb.ToString();
    }

    /// <summary>
    /// Gets or sets the AltinnParty cookie name.
    /// </summary>
    public string AltinnPartyCookieName { get; set; } = "AltinnPartyId";

    /// <summary>
    /// Gets the altinn party cookie from kubernetes environment variables or appSettings if environment variable is missing.
    /// </summary>
    public string GetAltinnPartyCookieName
    {
        get
        {
            return Environment.GetEnvironmentVariable("GeneralSettings__AltinnPartyCookieName")
                ?? AltinnPartyCookieName;
        }
    }
}

internal static class GeneralSettingsExtensions
{
    /// <summary>
    /// Convenience method to get <see cref="GeneralSettings.ExternalAppBaseUrl" /> with segments replaced and trailing # and / as this is how the url is used in the app.
    /// </summary>
    /// <param name="settings">The general settings</param>
    /// <param name="app">The app identifier</param>
    /// <returns>The formatted url</returns>
    public static string FormattedExternalAppBaseUrlWithTrailingPound(this GeneralSettings settings, AppIdentifier app)
    {
        return settings.FormattedExternalAppBaseUrl(app).TrimEnd('/') + "/#";
    }
}
