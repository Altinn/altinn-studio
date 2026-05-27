using Altinn.App.Core.Features;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Implement this interface to create a new type of task for the process engine.
/// </summary>
/// <remarks>
/// When migrating from the legacy task lifecycle interfaces, move start/end/abandon logic into this interface and
/// use <see cref="IInstanceDataAccessor.Instance" /> to access the instance. Use the data mutator for any data
/// changes that should be persisted by the process engine.
/// </remarks>
[ImplementableByApps]
public interface IProcessTask
{
    /// <summary>
    /// The type is used to identify the correct task implementation for a given task type in the process config file.
    /// </summary>
    string Type { get; }

    /// <summary>
    /// Any logic to be executed when a task is started should be put in this method.
    /// </summary>
    /// <param name="dataMutator">The data mutator providing access to instance data and mutations.</param>
    Task Start(IInstanceDataMutator dataMutator)
    {
        return Task.CompletedTask;
    }

    /// <summary>
    /// Any logic to be executed when a task is ended should be put in this method.
    /// </summary>
    /// <param name="dataMutator">The data mutator providing access to instance data and mutations.</param>
    Task End(IInstanceDataMutator dataMutator)
    {
        return Task.CompletedTask;
    }

    /// <summary>
    /// Any logic to be executed when a task is abandoned should be put in this method.
    /// </summary>
    /// <param name="dataMutator">The data mutator providing access to instance data and mutations.</param>
    Task Abandon(IInstanceDataMutator dataMutator)
    {
        return Task.CompletedTask;
    }
}
