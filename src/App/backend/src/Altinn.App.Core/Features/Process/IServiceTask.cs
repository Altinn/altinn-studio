using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A service task: work the app performs when the process enters a BPMN service task, executed
/// durably by the workflow engine. In its simplest form the task is just <see cref="Execute"/> —
/// one unit of work, run (and on failure retried) as a single workflow-engine step. A task with
/// several consecutive units of work — dispatch then await, or a series of API calls — declares
/// the earlier units as <see cref="Steps"/>, so each gets its own durable step; <see cref="Execute"/>
/// then runs last and concludes the task.
/// </summary>
/// <remarks>
/// <strong>IMPORTANT: Implementations MUST be idempotent — service tasks may be retried on failure.</strong>
/// </remarks>
[ImplementableByApps]
public interface IServiceTask : IProcessTask, IProcessStepConfigurable
{
    /// <summary>
    /// Optional durable steps executed in order before <see cref="Execute"/>. Most tasks need
    /// none — the default is empty. Each step expands to its own workflow-engine step, so it gets
    /// the engine's durability individually: its own retry budget, its own timeout and wait budget
    /// (<see cref="IServiceTaskStep.StepOptions"/>), its own idempotency key
    /// (<see cref="ServiceTaskContext.StepId"/>) — and, crucially, a step that has completed never
    /// runs again. A retry or an operational resume re-enters the task at the failed step, not at
    /// the beginning.
    /// </summary>
    /// <remarks>
    /// <para>
    /// Steps share state the way service tasks already do: through
    /// <see cref="ServiceTaskContext.InstanceDataMutator"/>. A completed step's data changes are
    /// saved and visible to every step after it, and to <see cref="Execute"/>. There is no
    /// separate handoff mechanism; a value a later step needs belongs in the app's own data model.
    /// </para>
    /// <para>
    /// This property is read both when the process transition is enqueued (to expand the engine
    /// steps — the moment the task's step shape is fixed for that workflow's lifetime) and on
    /// every step callback (to dispatch by step name). It must therefore be cheap, deterministic
    /// and side-effect free — return the same steps in the same order every time. The declared
    /// steps are validated at app startup (unique, non-empty names; valid options).
    /// </para>
    /// </remarks>
    public IEnumerable<IServiceTaskStep> Steps => [];

    /// <summary>
    /// Executes the service task — always its last step, and the only one that decides how the
    /// task concludes: <see cref="ServiceTaskResult.Success"/> (with optional auto-advance
    /// action), <see cref="ServiceTaskResult.SuccessWithoutAutoAdvance"/>,
    /// <see cref="ServiceTaskResult.Defer"/> to run again later, or a failure. Unhandled
    /// exceptions are treated as retryable failures. When the task declares <see cref="Steps"/>,
    /// they have all completed by the time this runs.
    /// </summary>
    public Task<ServiceTaskResult> Execute(ServiceTaskContext context);
}
