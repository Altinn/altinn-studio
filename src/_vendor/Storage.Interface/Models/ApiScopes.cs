using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Custom scopes for an app
/// </summary>
public class ApiScopes
{
    /// <summary>
    /// Gets or sets the read scope for the app.
    /// Can use '[app]' as placeholders for the app name that will be substituted when validating the token.
    /// Example: "&lt;your-IDporten-org&gt;:[app]/instances.read"
    /// </summary>
    [JsonProperty(PropertyName = "read")]
    public string? Read { get; set; }

    /// <summary>
    /// Gets or sets the write scope for the app.
    /// Can use '[app]' as placeholders for the app name that will be substituted when validating the token.
    /// Example: "&lt;your-IDporten-org&gt;:[app]/instances.write"
    /// </summary>
    [JsonProperty(PropertyName = "write")]
    public string? Write { get; set; }

    /// <summary>
    /// Text resource key for a custom error message to show when a user tries to access the app API without having the required scopes
    /// Will apply if set (takes precedence over the one in 'apiScopesConfiguration')
    /// </summary>
    [JsonProperty(PropertyName = "errorMessageTextResourceKey")]
    public string? ErrorMessageTextResourceKey { get; set; }
}
