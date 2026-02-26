using Altinn.App.Core.Internal.Process.ProcessTasks.ServiceTasks;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Process engine interface that defines the Altinn App process engine
/// </summary>
public interface IProcessEngine
{
    /// <summary>
    /// Method to start a new process
    /// </summary>
    Task<ProcessChangeResult> GenerateProcessStartEvents(ProcessStartRequest processStartRequest);

    /// <summary>
    /// Method to move process to next task/event
    /// </summary>
    Task<ProcessChangeResult> Next(ProcessNextRequest request, CancellationToken ct = default);

    /// <summary>
    /// Check if the Altinn task type is a service task
    /// </summary>
    IServiceTask? CheckIfServiceTask(string? altinnTaskType);

    /// <summary>
    /// Handle process events and update storage
    /// </summary>
    /// <param name="instance"></param>
    /// <param name="prefill"></param>
    /// <param name="events"></param>
    Task<Instance> HandleEventsAndUpdateStorage(
        Instance instance,
        Dictionary<string, string>? prefill,
        List<InstanceEvent>? events
    );
}
