using System.Collections.Generic;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Studio.Designer.Models.Dto;

/// <summary>
/// Extended representation of a status object that holds the process state of an application instance.
/// The process is defined by the application's process specification BPMN file.
/// </summary>
public class AppProcessState: ProcessState
{
    /// <summary>
    /// Default constructor
    /// </summary>
    public AppProcessState()
    {
    }

    /// <summary>
    /// Constructor that takes a ProcessState object and copies the values.
    /// </summary>
    /// <param name="processState"></param>
    public AppProcessState(ProcessState? processState)
    {
        if(processState == null)
        {
            return;
        }
        Started = processState.Started;
        StartEvent = processState.StartEvent;
        if (processState.CurrentTask != null)
        {
            CurrentTask = processState.CurrentTask;
        }
        Ended = processState.Ended;
        EndEvent = processState.EndEvent;

    }
    /// <summary>
    /// Gets or sets a list of all tasks. The list contains information about the task Id
    /// and the task  type.
    /// </summary>
    public List<AppProcessTaskTypeInfo>? ProcessTasks { get; set; }
}
