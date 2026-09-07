using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;

namespace Altinn.App.Core.Internal.Process.ProcessTasks;

/// <summary>
/// Implement this interface to create a new type of task for the process engine.
/// </summary>
/// <remarks>
/// <para>
/// A task type declares what happens when a task of that type is entered, ended or abandoned as lists of
/// <see cref="IProcessTaskCommand"/> keys. Each declared command runs as a durable step of its own in the
/// workflow engine: it commits its data changes when it completes, and a failed command is retried without
/// re-running the commands before it. A task that has nothing to do in a phase declares nothing, and the
/// transition has no step for it.
/// </para>
/// <para>
/// The lists are validated at app startup and fixed when a transition is enqueued, so they must depend on
/// the task's configuration alone: never on instance data, the clock, or anything that can differ between those
/// reads. The BPMN task's element id is provided so a task type can declare different commands for
/// differently configured tasks.
/// </para>
/// <para>
/// The app-facing lifecycle hooks (<see cref="IOnTaskStartingHandler"/> and its siblings) are separate: they
/// run per task id for any task type, before a task type's own start commands and after its end commands.
/// </para>
/// </remarks>
[ImplementableByApps]
public interface IProcessTask
{
    /// <summary>
    /// The type is used to identify the correct task implementation for a given task type in the process config file.
    /// </summary>
    string Type { get; }

    /// <summary>
    /// Validates the configuration of one BPMN task of this type when the app starts. Return one finding per
    /// problem; any finding fails startup with the findings listed. Called once per BPMN task, never at runtime.
    /// </summary>
    IEnumerable<string> ValidateConfiguration(ProcessTaskValidationContext context) => [];

    /// <summary>
    /// The commands that run, in order, when a task of this type is entered. They run before the process state
    /// commits, after the app's <see cref="IOnTaskStartingHandler"/> for the task.
    /// </summary>
    /// <param name="taskId">The BPMN element id of the task being entered.</param>
    IReadOnlyList<ProcessTaskCommandRef> GetStartCommands(string taskId) => [];

    /// <summary>
    /// The commands that run, in order, when a task of this type is ended. They run before the app's
    /// <see cref="IOnTaskEndingHandler"/> for the task and before the task's data is locked.
    /// </summary>
    /// <param name="taskId">The BPMN element id of the task being left.</param>
    IReadOnlyList<ProcessTaskCommandRef> GetEndCommands(string taskId) => [];

    /// <summary>
    /// The commands that run, in order, when a task of this type is abandoned (the process is moved backwards
    /// out of it). They run before the app's <see cref="IOnTaskAbandonHandler"/> for the task.
    /// </summary>
    /// <param name="taskId">The BPMN element id of the task being left.</param>
    IReadOnlyList<ProcessTaskCommandRef> GetAbandonCommands(string taskId) => [];
}
