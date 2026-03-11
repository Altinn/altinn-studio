namespace WorkflowEngine.Models;

/// <summary>
/// Describes a command type: its expected data shapes and how to validate and execute it.
/// Implementations are registered at startup and looked up by <see cref="CommandDefinition.Type"/> at runtime.
/// The engine deserializes <see cref="CommandDefinition.Data"/> and <see cref="Workflow.Context"/> into
/// the declared types before calling <see cref="Validate"/> or <see cref="ExecuteAsync"/>.
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
    Task<ExecutionResult> ExecuteAsync(CommandExecutionContext context, CancellationToken cancellationToken);
}
