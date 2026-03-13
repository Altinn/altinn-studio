using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Configuration settings for app command integration.
/// </summary>
public sealed record AppCommandSettings
{
    /// <summary>
    /// The API key used to authenticate requests from the App to the Process Engine and from the Process Engine back to the App.
    /// </summary>
    [JsonPropertyName("apiKey")]
    public required string ApiKey { get; set; }

    /// <summary>
    /// The full endpoint URL for application callbacks. String template supports all properties from <see cref="InstanceInformation"/>.
    /// </summary>
    [JsonPropertyName("commandEndpoint")]
    public required string CommandEndpoint { get; set; }
}
