using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Helper class for resolving process task instances by their Altinn task type.
/// </summary>
internal sealed class ProcessTaskResolver
{
    private readonly AppImplementationFactory _appImplementationFactory;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessTaskResolver"/> class.
    /// </summary>
    public ProcessTaskResolver(AppImplementationFactory appImplementationFactory)
    {
        _appImplementationFactory = appImplementationFactory;
    }

    /// <summary>
    /// Gets the process task instance for the given Altinn task type.
    /// </summary>
    /// <param name="altinnTaskType">The Altinn task type identifier.</param>
    /// <returns>The resolved process task instance.</returns>
    /// <exception cref="ProcessException">Thrown when no process task instance is found for the given task type.</exception>
    public IProcessTask GetProcessTaskInstance(string? altinnTaskType)
    {
        if (string.IsNullOrEmpty(altinnTaskType))
        {
            altinnTaskType = "NullType";
        }

        IEnumerable<IServiceTask> serviceTasks = _appImplementationFactory.GetAll<IServiceTask>();
        IServiceTask? serviceTask = serviceTasks.FirstOrDefault(pt => pt.Type == altinnTaskType);

        if (serviceTask is not null)
        {
            return serviceTask;
        }

        IEnumerable<IProcessTask> tasks = _appImplementationFactory.GetAll<IProcessTask>();
        IProcessTask? processTask = tasks.FirstOrDefault(pt => pt.Type == altinnTaskType);

        if (processTask == null)
        {
            throw new ProcessException($"No process task instance found for altinnTaskType {altinnTaskType}");
        }

        return processTask;
    }
}
