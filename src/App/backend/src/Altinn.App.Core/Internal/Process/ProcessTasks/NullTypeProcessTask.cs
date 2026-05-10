using Altinn.App.Core.Features;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Null implementation. Used when no other <see cref="IProcessTask"/> can be found
/// </summary>
public class NullTypeProcessTask : IProcessTask
{
    /// <inheritdoc/>
    public string Type => "NullType";

    /// <inheritdoc/>
    public Task Start(IInstanceDataMutator dataMutator) => Task.CompletedTask;

    /// <inheritdoc/>
    public Task End(IInstanceDataMutator dataMutator) => Task.CompletedTask;

    /// <inheritdoc/>
    public Task Abandon(IInstanceDataMutator dataMutator) => Task.CompletedTask;
}
