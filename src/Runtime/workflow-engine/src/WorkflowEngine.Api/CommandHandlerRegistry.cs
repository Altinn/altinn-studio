using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;

namespace WorkflowEngine.Api;

/// <summary>
/// Registry that maps command types to their handlers.
/// </summary>
internal interface ICommandHandlerRegistry
{
    /// <summary>Get the handler for the given command type.</summary>
    /// <exception cref="InvalidOperationException">No handler registered for the given type.</exception>
    ICommandHandler GetHandler(string commandType);

    /// <summary>Check if a handler is registered for the given command type.</summary>
    bool HasHandler(string commandType);

    /// <summary>Get all registered handlers.</summary>
    IEnumerable<ICommandHandler> GetAllHandlers();
}

internal sealed class CommandHandlerRegistry : ICommandHandlerRegistry
{
    private readonly Dictionary<string, ICommandHandler> _handlers;

    public CommandHandlerRegistry(IEnumerable<ICommandHandler> handlers)
    {
        _handlers = handlers.ToDictionary(h => h.CommandType, StringComparer.OrdinalIgnoreCase);
    }

    public ICommandHandler GetHandler(string commandType) =>
        _handlers.TryGetValue(commandType, out var handler)
            ? handler
            : throw new CommandHandlerNotFoundException(commandType, _handlers.Keys);

    public bool HasHandler(string commandType) => _handlers.ContainsKey(commandType);

    public IEnumerable<ICommandHandler> GetAllHandlers() => _handlers.Values;
}
