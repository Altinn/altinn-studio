using System.Text.Json.Serialization;

namespace WorkflowEngine.Models;

/// <summary>
/// Configuration settings for the workflow engine API.
/// </summary>
public sealed record ApiSettings
{
    /// <summary>
    /// The API key used to authenticate incoming requests to the Process Engine.
    /// </summary>
    [JsonPropertyName("apiKeys")]
    public required IEnumerable<string> ApiKeys { get; set; }
}
