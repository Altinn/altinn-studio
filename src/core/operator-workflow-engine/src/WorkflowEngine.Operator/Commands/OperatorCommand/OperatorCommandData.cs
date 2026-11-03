using System.Text.Json.Serialization;

namespace WorkflowEngine.Operator.Commands.OperatorCommand;

/// <summary>
/// Command.Data shape for operator commands.
/// </summary>
internal sealed record OperatorCommandData
{
    /// <summary>
    /// The operator handler the step runs, such as <c>run.admit</c>. The command posts to it as the last path
    /// segment of <see cref="OperatorCommandSettings.CommandEndpoint"/>.
    /// </summary>
    [JsonPropertyName("commandKey")]
    public required string CommandKey { get; init; }

    /// <summary>
    /// Opaque input for the handler, set by the operator at enqueue. The engine stores it and never parses it.
    /// </summary>
    [JsonPropertyName("payload")]
    public string? Payload { get; init; }
}
