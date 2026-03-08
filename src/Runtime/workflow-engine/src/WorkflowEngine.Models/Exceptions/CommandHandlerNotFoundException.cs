namespace WorkflowEngine.Models.Exceptions;

/// <summary>
/// Thrown when a workflow step references a command type for which no handler is registered.
/// This is a non-retryable error — the step will never succeed without a matching handler.
/// </summary>
public sealed class CommandHandlerNotFoundException : EngineException
{
    public string CommandType { get; }

    public IReadOnlyList<string> RegisteredTypes { get; }

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
