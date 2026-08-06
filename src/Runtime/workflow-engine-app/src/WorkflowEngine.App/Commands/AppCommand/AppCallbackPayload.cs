using System.Text.Json.Serialization;

namespace WorkflowEngine.App.Commands.AppCommand;

/// <summary>
/// Payload sent to the Altinn application when an AppCommand is executed.
/// </summary>
internal sealed record AppCallbackPayload
{
    [JsonPropertyName("commandKey")]
    public required string CommandKey { get; init; }

    [JsonPropertyName("actor")]
    public required Actor Actor { get; init; }

    [JsonPropertyName("payload")]
    public string? Payload { get; init; }

    [JsonPropertyName("workflowId")]
    public required Guid WorkflowId { get; init; }

    /// <summary>
    /// Stable reference time for this execution: the explicit workflow schedule when present,
    /// otherwise the persisted time when the step was enqueued.
    /// </summary>
    [JsonPropertyName("executionReferenceTime")]
    public required DateTimeOffset ExecutionReferenceTime { get; init; }

    [JsonPropertyName("state")]
    public string? State { get; init; }
}
