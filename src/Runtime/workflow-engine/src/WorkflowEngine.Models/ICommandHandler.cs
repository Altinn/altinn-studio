using System.Text.Json;

namespace WorkflowEngine.Models;

/// <summary>
/// Handles execution of a specific command type.
/// Implementations are registered at startup and looked up by <see cref="Command.Type"/> at runtime.
/// </summary>
public interface ICommandHandler
{
    /// <summary>
    /// The command type this handler processes (matches <see cref="Command.Type"/>).
    /// </summary>
    string CommandType { get; }

    /// <summary>
    /// Execute the command. The handler deserializes <see cref="CommandExecutionContext.CommandData"/>
    /// and <see cref="Workflow.Context"/> into its own strongly-typed models.
    /// </summary>
    Task<ExecutionResult> ExecuteAsync(CommandExecutionContext context, CancellationToken cancellationToken);

    /// <summary>
    /// Validates command data and workflow context at enqueue time.
    /// Called before persistence, giving handlers a chance to reject invalid requests early.
    /// </summary>
    CommandValidationResult Validate(JsonElement? commandData, JsonElement? workflowContext);
}
