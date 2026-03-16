using System.Text.Json.Serialization;

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
    [JsonPropertyName("type")]
    public required string Type { get; set; }

    [JsonPropertyName("resource")]
    public required string Resource { get; set; }

    [JsonPropertyName("organizationform")]
    public string? OrganizationForm { get; set; }
}
