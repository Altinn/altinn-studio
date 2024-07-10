using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

public class OidcLoginSettings : ISettingsMarker
{
    public bool RequireHttpsMetadata { get; set; } = true;
    public int CookieExpiryTimeInMinutes { get; set; } = 60;
    public string Authority { get; set; }
    public string ClientId { get; set; }
    public string ClientSecret { get; set; }
    public string[] Scopes { get; set; }
}
