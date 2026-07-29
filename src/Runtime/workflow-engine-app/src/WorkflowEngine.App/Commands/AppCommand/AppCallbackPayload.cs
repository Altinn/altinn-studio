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

    [JsonPropertyName("lockToken")]
    public required string LockToken { get; init; }

    [JsonPropertyName("payload")]
    public string? Payload { get; init; }

    [JsonPropertyName("workflowId")]
    public required Guid WorkflowId { get; init; }

    [JsonPropertyName("state")]
    public string? State { get; init; }

    /// <summary>
    /// How many times this step has already deferred. <c>0</c> on a first execution, so a command can
    /// tell an opening attempt from a re-check and adapt its poll cadence or its logging.
    /// </summary>
    [JsonPropertyName("deferCount")]
    public int DeferCount { get; init; }

    /// <summary>
    /// The absolute instant at which the step's wait budget runs out, or <c>null</c> before its first
    /// deferral (nothing is being waited on yet, so the full budget is still ahead).
    /// </summary>
    /// <remarks>
    /// Sent as a deadline rather than a remaining duration deliberately: a remaining duration starts
    /// aging the moment it is serialized, and the callback then spends unknown time in flight and in the
    /// app's own processing. A deadline stays true however long the round trip takes.
    /// </remarks>
    [JsonPropertyName("waitDeadline")]
    public DateTimeOffset? WaitDeadline { get; init; }
}
