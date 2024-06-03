namespace Altinn.Studio.Designer.Configuration;

public class OidcSettings
{
    public int CookieExpiryTimeInSeconds { get; set; } = 120;
    public string Authority { get; set; }
    public string ClientId { get; set; }
    public string ClientSecret { get; set; }
    public string[] Scopes { get; set; }
    public string AcrValues { get; set; }
    public AuthorizationDetail[] AuthorizationDetails { get; set; }
}
public class AuthorizationDetail
{
    public string Type { get; set; }
    public string Resource { get; set; }
}
