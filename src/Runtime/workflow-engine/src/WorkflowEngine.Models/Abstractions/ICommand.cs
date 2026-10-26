namespace WorkflowEngine.Models.Abstractions;

/// <summary>
/// Describes a command type: its expected data shapes and how to validate and execute it.
/// Implementations are registered at startup and looked up by <see cref="CommandDefinition.Type"/> at runtime.
/// The engine deserializes <see cref="CommandDefinition.Data"/> and <see cref="Workflow.Context"/> into
/// the declared types before calling <see cref="Validate"/> or <see cref="Execute"/>.
/// </summary>
public interface ICommand
{
    /// <summary>
    /// The command type this descriptor handles (matches <see cref="CommandDefinition.Type"/>).
    /// </summary>
    string CommandType { get; }

    /// <summary>
    /// The CLR type that <see cref="CommandDefinition.Data"/> should be deserialized into,
    /// or <c>null</c> if the command expects no data.
    /// </summary>
    Type? CommandDataType { get; }

    /// <summary>
    /// The CLR type that <see cref="Workflow.Context"/> should be deserialized into,
    /// or <c>null</c> if the command does not use workflow context.
    /// </summary>
    Type? WorkflowContextType { get; }

    /// <summary>
    /// Validates deserialized command data and workflow context at enqueue time.
    /// Called before persistence, giving descriptors a chance to reject invalid requests early.
    /// </summary>
    CommandValidationResult Validate(object? commandData, object? workflowContext);

    /// <summary>
    /// Executes the command. The <see cref="CommandExecutionContext"/> contains pre-deserialized
    /// typed data accessible via <see cref="CommandExecutionContext.GetCommandData{T}"/>
    /// and <see cref="CommandExecutionContext.GetWorkflowContext{T}"/>.
    /// </summary>
    Task<ExecutionResult> Execute(CommandExecutionContext context, CancellationToken cancellationToken);

    /// <summary>
    /// Describes the domain object a step works on, as telemetry attributes: the engine treats the command data
    /// and the workflow context as opaque, so only the command can name what they refer to. The engine sets the
    /// returned attributes on the step's span and on the workflow's entry span. None by default.
    /// </summary>
    /// <remarks>
    /// Called on every attempt, with the same deserialized values <see cref="Execute"/> receives, before the
    /// command runs — and only while those spans are recorded. Keep it cheap and free of I/O, and return
    /// identifiers, never personal data or secrets, under keys the host defines for its domain: the engine's own
    /// keys name engine concepts only.
    /// A throw is logged and ignored: it never affects the step.
    /// </remarks>
    IReadOnlyList<KeyValuePair<string, object?>> GetTelemetryAttributes(object? commandData, object? workflowContext) =>
        [];
}
