using Altinn.App.Core.Features;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Implement this interface to create a new type of task for the process engine.
/// </summary>
/// <remarks>
/// When migrating from the legacy task lifecycle interfaces, move start/end/abandon logic into this interface and
/// use <see cref="IInstanceDataAccessor.Instance" /> on <see cref="ProcessTaskContext.InstanceDataMutator" /> to access
/// the instance. Use the data mutator for any data changes that should be persisted by the process engine.
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
    /// <param name="context">A context object with relevant parameters and data.</param>
    Task Start(ProcessTaskContext context)
    {
        return Task.CompletedTask;
    }

    /// <summary>
    /// Any logic to be executed when a task is ended should be put in this method.
    /// </summary>
    /// <param name="context">A context object with relevant parameters and data.</param>
    Task End(ProcessTaskContext context)
    {
        return Task.CompletedTask;
    }

    /// <summary>
    /// Any logic to be executed when a task is abandoned should be put in this method.
    /// </summary>
    /// <param name="context">A context object with relevant parameters and data.</param>
    Task Abandon(ProcessTaskContext context)
    {
        return Task.CompletedTask;
    }
}

/// <summary>
/// Parameters for process task lifecycle execution.
/// </summary>
public sealed class ProcessTaskContext
{
    /// <summary>
    /// An instance data mutator that can be used to access and modify instance data. Changes made will be automatically saved if task execution is successful.
    /// </summary>
    public required IInstanceDataMutator InstanceDataMutator { get; init; }
}
