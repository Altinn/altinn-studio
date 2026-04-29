#pragma warning disable CA1032 // Standard exception constructors are intentionally omitted — this exception requires domain-specific parameters

namespace WorkflowEngine.Models.Exceptions;

/// <summary>
/// Thrown when a workflow step references a command type for which no handler is registered.
/// This is a non-retryable error — the step will never succeed without a matching handler.
/// </summary>
public sealed class CommandHandlerNotFoundException : EngineException
{
    /// <summary>
    /// The unresolved command type discriminator.
    /// </summary>
    public string CommandType { get; }

    /// <summary>
    /// The command types that were registered when resolution failed, for diagnostics.
    /// </summary>
    public IReadOnlyList<string> RegisteredTypes { get; }

    /// <summary>
    /// Creates a new <see cref="CommandHandlerNotFoundException"/> for the given unresolved command type.
    /// </summary>
    public CommandHandlerNotFoundException(string commandType, IEnumerable<string> registeredTypes)
        : base(
            $"No handler registered for command type '{commandType}'. "
                + $"Registered types: {string.Join(", ", registeredTypes)}"
        )
    {
        CommandType = commandType;
        RegisteredTypes = registeredTypes.ToList().AsReadOnly();
    }
}
