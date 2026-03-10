using System.Text.Json.Serialization;

namespace WorkflowEngine.CommandHandlers.Handlers.Webhook;

internal sealed record WebhookCommandData
{
    [JsonPropertyName("uri")]
    public required string Uri { get; init; }

    [JsonPropertyName("payload")]
    public string? Payload { get; init; }

    [JsonPropertyName("contentType")]
    public string? ContentType { get; init; }
}
