using Altinn.App.Core.Constants;
using Altinn.App.Core.Features;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Represents the process task responsible for form filling steps.
/// </summary>
public class DataProcessTask : IProcessTask
{
    /// <inheritdoc/>
    public string Type => AltinnTaskTypes.Data;

    /// <inheritdoc/>
    public Task Abandon(IInstanceDataMutator dataMutator) => Task.CompletedTask;

    /// <inheritdoc/>
    public Task End(IInstanceDataMutator dataMutator) => Task.CompletedTask;

    /// <inheritdoc/>
    public Task Start(IInstanceDataMutator dataMutator) => Task.CompletedTask;
}
