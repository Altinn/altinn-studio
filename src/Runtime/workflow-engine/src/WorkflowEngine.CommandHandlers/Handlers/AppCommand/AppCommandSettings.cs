using System.Text.Json.Serialization;

namespace WorkflowEngine.CommandHandlers.Handlers.AppCommand;

/// <summary>
/// Configuration settings for Altinn app command integration.
/// </summary>
public sealed record AppCommandSettings
{
    /// <summary>
    /// The API key used to authenticate requests between the engine and the app.
    /// </summary>
    [JsonPropertyName("apiKey")]
    public required string ApiKey { get; set; }

    /// <summary>
    /// The full endpoint URL for application callbacks. String template supports
    /// Org, App, InstanceOwnerPartyId, InstanceGuid placeholders.
    /// </summary>
    [JsonPropertyName("commandEndpoint")]
    public required string CommandEndpoint { get; set; }

    /// <summary>
    /// The header name used for API key authentication between the engine and the app.
    /// </summary>
    [JsonPropertyName("apiKeyHeaderName")]
    public string ApiKeyHeaderName { get; set; } = "X-Api-Key";
}
