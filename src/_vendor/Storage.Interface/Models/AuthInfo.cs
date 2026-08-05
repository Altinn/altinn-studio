#nullable disable

using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Artifacts from storage needed by authorization for doing authorization
/// </summary>
[JsonObject(ItemNullValueHandling = NullValueHandling.Ignore)]
public class AuthInfo
{
    /// <summary>
    /// Gets or sets the current process of the instance to authorize
    /// </summary>
    [JsonProperty(PropertyName = "process")]
    public ProcessState Process { get; set; }

    /// <summary>
    /// Gets or sets app id for the instance to authorize
    /// </summary>
    [JsonProperty(PropertyName = "appId")]
    public string AppId { get; set; }
}
