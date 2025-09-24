using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Api.Models;

/// <summary>
/// Extended representation of a status object that holds the process state of an application instance.
/// The process is defined by the application's process specification BPMN file.
/// </summary>
public class AppProcessState : ProcessState
{
    /// <summary>
    /// Actions that can be performed and if the user is allowed to perform them.
    /// </summary>
    public Dictionary<string, bool>? Actions { get; set; }
}
