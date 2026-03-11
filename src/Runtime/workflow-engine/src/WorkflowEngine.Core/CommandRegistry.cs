using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;

namespace WorkflowEngine.Api;

/// <summary>
/// Registry that maps command types to their commands.
/// </summary>
internal interface ICommandRegistry
{
    /// <summary>Get the command for the given command type.</summary>
    /// <exception cref="CommandHandlerNotFoundException">No command registered for the given type.</exception>
    ICommand GetCommand(string commandType);

    /// <summary>Check if a command is registered for the given command type.</summary>
    bool HasCommand(string commandType);

    /// <summary>Get all registered commands.</summary>
    IEnumerable<ICommand> GetAllCommands();
}

internal sealed class CommandRegistry : ICommandRegistry
{
    private readonly Dictionary<string, ICommand> _commands;

    public CommandRegistry(IEnumerable<ICommand> commands)
    {
        _commands = commands.ToDictionary(d => d.CommandType, StringComparer.OrdinalIgnoreCase);
    }

    public ICommand GetCommand(string commandType) =>
        _commands.TryGetValue(commandType, out var command)
            ? command
            : throw new CommandHandlerNotFoundException(commandType, _commands.Keys);

    public bool HasCommand(string commandType) => _commands.ContainsKey(commandType);

    public IEnumerable<ICommand> GetAllCommands() => _commands.Values;
}
