using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Features;

/// <summary>
/// Custom logic to run when the entire process has ended. E.g. when we have arrived at an `endEvent` in the BPMN model
/// </summary>
[ImplementableByApps]
public interface IProcessEnd
{
    /// <summary>
    /// This method is called when the process has ended
    /// </summary>
    /// <param name="instance">The instance</param>
    /// <param name="events">Events that were dispatched in the last processing step</param>
    public Task End(Instance instance, List<InstanceEvent>? events);
}
