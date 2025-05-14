using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
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
    Task<ProcessChangeResult> Next(ProcessNextRequest request);

    /// <summary>
    /// Method to handle user action
    /// </summary>
    Task<UserActionResult> HandleUserAction(ProcessNextRequest request, CancellationToken ct);

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
