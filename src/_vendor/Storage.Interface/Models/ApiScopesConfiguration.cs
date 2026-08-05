using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Custom API scopes configuration for an app
/// </summary>
[JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
public class ApiScopesConfiguration
{
    /// <summary>
    /// Custom API scopes to authorize user access to the app API.
    /// By default, there are "altinn:instances.read" and "altinn:instances.write" scopes.
    /// </summary>
    [JsonProperty(PropertyName = "users")]
    public ApiScopes? Users { get; set; }

    /// <summary>
    /// Custom API scopes to authorize service owner access to the app API.
    /// By default, there are "altinn:serviceowner/instances.read" and "altinn:serviceowner/instances.write" scopes.
    /// </summary>
    [JsonProperty(PropertyName = "serviceOwners")]
    public ApiScopes? ServiceOwners { get; set; }

    /// <summary>
    /// Text resource key for a custom error message to show when a user tries to access the app API without having the required scopes
    /// Will apply for both service owners and users if specified (has lower precedence than the one in 'users' and 'serviceOwners')
    /// </summary>
    [JsonProperty(PropertyName = "errorMessageTextResourceKey")]
    public string? ErrorMessageTextResourceKey { get; set; }
}
