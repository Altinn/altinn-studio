using System.Text.Json.Serialization;

// CA1056: URI properties should not be strings
#pragma warning disable CA1056

namespace WorkflowEngine.Commands.Webhook;

/// <summary>
/// Data payload for the built-in webhook command. The engine sends an HTTP request to <see cref="Uri"/>;
/// presence of <see cref="Payload"/> selects POST, absence selects GET.
/// </summary>
public sealed record WebhookCommandData
{
    /// <summary>
    /// Absolute URI to call.
    /// </summary>
    [JsonPropertyName("uri")]
    public required string Uri { get; init; }

    /// <summary>
    /// Optional request body. Sent verbatim; format is the caller's responsibility.
    /// </summary>
    [JsonPropertyName("payload")]
    public string? Payload { get; init; }

    /// <summary>
    /// Optional <c>Content-Type</c> header value applied when <see cref="Payload"/> is present.
    /// </summary>
    [JsonPropertyName("contentType")]
    public string? ContentType { get; init; }
}
