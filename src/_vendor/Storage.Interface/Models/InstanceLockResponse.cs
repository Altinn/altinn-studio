#nullable disable

using System.Text.Json.Serialization;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Represents a response when acquiring an instance lock.
/// </summary>
public class InstanceLockResponse
{
    /// <summary>
    /// Gets or sets the lock token.
    /// </summary>
    [JsonProperty(PropertyName = "lockToken")]
    [JsonPropertyName("lockToken")]
    public string LockToken { get; set; }
}
