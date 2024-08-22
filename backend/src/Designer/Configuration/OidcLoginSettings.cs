using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

public class OidcLoginSettings : ISettingsMarker
{
    /// <summary>
    /// Sets the cookie expiry time in minutes.
    /// </summary>
    public int CookieExpiryTimeInMinutes { get; set; } = 59;

    /// <summary>
    /// Url of the identity provider.
    /// </summary>
    public string Authority { get; set; }

    /// <summary>
    /// Client ID for the OpenID Connect provider.
    /// </summary>
    public string ClientId { get; set; }

    /// <summary>
    /// Client secret for the OpenID Connect provider.
    /// </summary>
    public string ClientSecret { get; set; }

    /// <summary>
    /// Scopes for the OpenID Connect provider.
    /// </summary>
    public string[] Scopes { get; set; }

    /// <summary>
    /// Flag to indicate if HTTPS metadata is required. In non-local environments this should be true.
    /// </summary>
    public bool RequireHttpsMetadata { get; set; } = true;

    /// <summary>
    /// If set to true, the client ID and secret will be fetched from the root .env file.
    /// This should be set to true only when running the application locally, and it will be only considered if ASPNETCORE_ENVIRONMENT is set to Development.
    /// If the client id and secrets are set in configuration, f.ex. in user secrets or in application.json, .env file will be ignored.
    /// </summary>
    public bool FetchClientIdAndSecretFromRootEnvFile { get; set; }
}
