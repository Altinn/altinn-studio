using System.Text.Json.Serialization;

namespace Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;

/// <summary>
/// Payload sent to the application when an AppCommand is executed.
/// </summary>
public sealed record AppCallbackPayload
{
    /// <summary>
    /// The key identifying which command to execute.
    /// </summary>
    [JsonPropertyName("commandKey")]
    public required string CommandKey { get; init; }

    /// <summary>
    /// The actor on whose behalf the command is executed.
    /// </summary>
    [JsonPropertyName("actor")]
    public required Actor Actor { get; init; }

    /// <summary>
    /// The lock token for the current workflow execution.
    /// </summary>
    [JsonPropertyName("lockToken")]
    public required string LockToken { get; init; }

    /// <summary>
    /// Optional command-specific payload.
    /// </summary>
    [JsonPropertyName("payload")]
    public string? Payload { get; init; }

    /// <summary>
    /// The workflow ID assigned by the engine.
    /// </summary>
    [JsonPropertyName("workflowId")]
    public required Guid WorkflowId { get; init; }

    /// <summary>
    /// Opaque state blob passed through from the previous command.
    /// </summary>
    [JsonPropertyName("state")]
    public string? State { get; init; }
}
