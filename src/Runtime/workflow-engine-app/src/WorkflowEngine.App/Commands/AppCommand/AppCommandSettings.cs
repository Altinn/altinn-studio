using System.Text.Json.Serialization;

namespace WorkflowEngine.App.Commands.AppCommand;

/// <summary>
/// Configuration settings for Altinn app command integration.
/// </summary>
internal sealed record AppCommandSettings
{
    /// <summary>
    /// The API key used to authenticate requests between the engine and the app.
    /// </summary>
    [JsonPropertyName("apiKey")]
    public required string ApiKey { get; set; }

    /// <summary>
    /// The header name used for API key authentication between the engine and the app.
    /// </summary>
    [JsonPropertyName("apiKeyHeaderName")]
    public string ApiKeyHeaderName { get; set; } = "X-Api-Key";
}
