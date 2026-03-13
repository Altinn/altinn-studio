using System.Text.Json.Serialization;

// CA1056: URI properties should not be strings
#pragma warning disable CA1056

namespace WorkflowEngine.Commands.Webhook;

public sealed record WebhookCommandData
{
    [JsonPropertyName("uri")]
    public required string Uri { get; init; }

    [JsonPropertyName("payload")]
    public string? Payload { get; init; }

    [JsonPropertyName("contentType")]
    public string? ContentType { get; init; }
}
