using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;

namespace WorkflowEngine.Api;

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
