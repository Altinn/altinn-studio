namespace Altinn.Studio.Designer.Configuration;

public class StudioOidcLoginSettings : OidcLoginSettings
{
    public string? AcrValues { get; set; }
    public string? ValidIssuer { get; set; }
    public string? AccountLinkUrl { get; set; }
    public AuthorizationDetail[]? AuthorizationDetails { get; set; }
}

public class AuthorizationDetail
{
    public required string Type { get; set; }
    public required string Resource { get; set; }
}
