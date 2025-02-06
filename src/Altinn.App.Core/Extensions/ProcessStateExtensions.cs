using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Extensions;

/// <summary>
/// Extension methods for <see cref="ProcessState"/>
/// </summary>
public static class ProcessStateExtensions
{
    /// <summary>
    /// Copies the values of the original <see cref="ProcessState"/> to a new instance.
    /// </summary>
    /// <param name="original">The original <see cref="ProcessState"/>.</param>
    /// <returns>New object with copies of values form original</returns>
    public static ProcessState Copy(this ProcessState original)
    {
        ProcessState copyOfState = new ProcessState();

        if (original.CurrentTask != null)
        {
            copyOfState.CurrentTask = new ProcessElementInfo();
            copyOfState.CurrentTask.FlowType = original.CurrentTask.FlowType;
            copyOfState.CurrentTask.Name = original.CurrentTask.Name;
#pragma warning disable CS0618 // Type or member is obsolete
            copyOfState.CurrentTask.Validated = original.CurrentTask.Validated;
#pragma warning restore CS0618 // Type or member is obsolete
            copyOfState.CurrentTask.AltinnTaskType = original.CurrentTask.AltinnTaskType;
            copyOfState.CurrentTask.Flow = original.CurrentTask.Flow;
            copyOfState.CurrentTask.ElementId = original.CurrentTask.ElementId;
            copyOfState.CurrentTask.Started = original.CurrentTask.Started;
            copyOfState.CurrentTask.Ended = original.CurrentTask.Ended;
        }

        copyOfState.EndEvent = original.EndEvent;
        copyOfState.Started = original.Started;
        copyOfState.Ended = original.Ended;
        copyOfState.StartEvent = original.StartEvent;

        return copyOfState;
    }
}
