#nullable disable

using System.Text.Json.Serialization;
using Newtonsoft.Json;

namespace Altinn.Platform.Storage.Interface.Models;

/// <summary>
/// Represents a request to acquire or update an instance lock.
/// </summary>
public class InstanceLockRequest
{
    /// <summary>
    /// Gets or sets the time to live in seconds.
    /// </summary>
    [JsonProperty(PropertyName = "ttlSeconds")]
    [JsonPropertyName("ttlSeconds")]
    public int TtlSeconds { get; set; }
}
