using System.Text.Json.Serialization;

namespace WorkflowEngine.CommandHandlers.Handlers.Webhook;

public sealed record WebhookCommandData
{
    [JsonPropertyName("uri")]
    public required string Uri { get; init; }

    [JsonPropertyName("payload")]
    public string? Payload { get; init; }

    [JsonPropertyName("contentType")]
    public string? ContentType { get; init; }
}
