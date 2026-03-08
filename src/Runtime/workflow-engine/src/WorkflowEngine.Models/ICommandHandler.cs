using System.Diagnostics;
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
    /// Optional: validate command data and workflow context at enqueue time.
    /// Called before persistence, giving handlers a chance to reject invalid requests early.
    /// Return null to indicate validation passed.
    /// </summary>
    string? Validate(JsonElement? commandData, JsonElement? workflowContext) => null;
}

/// <summary>
/// Everything a command handler needs to execute a step.
/// </summary>
public sealed record CommandExecutionContext
{
    /// <summary>The parent workflow.</summary>
    public required Workflow Workflow { get; init; }

    /// <summary>The step being executed.</summary>
    public required Step Step { get; init; }

    /// <summary>The opaque command configuration (from <see cref="Command.Data"/>).</summary>
    public JsonElement? CommandData { get; init; }

    /// <summary>State output from the previous step (or <see cref="Workflow.InitialState"/> for the first step).</summary>
    public string? StateIn { get; init; }

    /// <summary>Parent trace context for distributed tracing.</summary>
    public ActivityContext? ParentTraceContext { get; init; }
}

/// <summary>
/// Registry that maps command types to their handlers.
/// </summary>
public interface ICommandHandlerRegistry
{
    /// <summary>Get the handler for the given command type.</summary>
    /// <exception cref="InvalidOperationException">No handler registered for the given type.</exception>
    ICommandHandler GetHandler(string commandType);

    /// <summary>Check if a handler is registered for the given command type.</summary>
    bool HasHandler(string commandType);

    /// <summary>Get all registered handlers.</summary>
    IEnumerable<ICommandHandler> GetAllHandlers();
}
