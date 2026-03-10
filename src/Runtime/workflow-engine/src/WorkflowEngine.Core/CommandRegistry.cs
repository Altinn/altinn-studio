using WorkflowEngine.Models;
using WorkflowEngine.Models.Exceptions;

namespace WorkflowEngine.Api;

/// <summary>
/// Registry that maps command types to their descriptors.
/// </summary>
internal interface ICommandRegistry
{
    /// <summary>Get the descriptor for the given command type.</summary>
    /// <exception cref="CommandHandlerNotFoundException">No descriptor registered for the given type.</exception>
    ICommandDescriptor GetDescriptor(string commandType);

    /// <summary>Check if a descriptor is registered for the given command type.</summary>
    bool HasDescriptor(string commandType);

    /// <summary>Get all registered descriptors.</summary>
    IEnumerable<ICommandDescriptor> GetAllDescriptors();
}

internal sealed class CommandRegistry : ICommandRegistry
{
    private readonly Dictionary<string, ICommandDescriptor> _descriptors;

    public CommandRegistry(IEnumerable<ICommandDescriptor> descriptors)
    {
        _descriptors = descriptors.ToDictionary(d => d.CommandType, StringComparer.OrdinalIgnoreCase);
    }

    public ICommandDescriptor GetDescriptor(string commandType) =>
        _descriptors.TryGetValue(commandType, out var descriptor)
            ? descriptor
            : throw new CommandHandlerNotFoundException(commandType, _descriptors.Keys);

    public bool HasDescriptor(string commandType) => _descriptors.ContainsKey(commandType);

    public IEnumerable<ICommandDescriptor> GetAllDescriptors() => _descriptors.Values;
}
