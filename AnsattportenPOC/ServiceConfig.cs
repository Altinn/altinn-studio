using System.Text.Json;
using System.Text.Json.Serialization;

namespace AnsattportenPOC;

internal sealed class ServiceConfig
{
    public string MaskinportenApiUri { get; set; }
    public string OidcAuthority { get; set; }
    public string OidcClientId { get; set; }
    public string OidcClientSecret { get; set; }
    public string[] OidcScopes { get; set; }
    public string AcrValues { get; set; }
    public AuthorizationDetail[] AuthorizationDetails { get; set; }

    public string FormatAuthorizationDetails()
    {
        return JsonSerializer.Serialize(AuthorizationDetails);
    }
}

internal sealed class AuthorizationDetail
{
    [JsonPropertyName("type")]
    public string Type { get; set; }

    [JsonPropertyName("resource")]
    public string Resource { get; set; }
}
