namespace Altinn.App.Core.Features.Process;

/// <summary>
/// What the hooks that run when a task starts, ends or is abandoned have in common: the tasks they run for.
/// Implement <see cref="IOnTaskStartingHandler"/>, <see cref="IOnTaskEndingHandler"/> or
/// <see cref="IOnTaskAbandoningHandler"/> rather than this.
/// </summary>
[ImplementableByApps]
public interface IOnTaskLifecycleHandler : IProcessStepConfigurable
{
    /// <summary>
    /// Determines whether the hook should run for the given task ID. At most one implementation of each hook may run
    /// for a task; if more than one returns true for a task in the process definition, the app does not start. The app
    /// calls this when it plans the transition into or out of the task, not when the hook runs, so the answer must
    /// depend on the task ID alone.
    /// </summary>
    /// <param name="taskId">The task ID to check.</param>
    /// <returns>True if the hook should run for this task; otherwise, false.</returns>
    public bool ShouldRunForTask(string taskId);
}
