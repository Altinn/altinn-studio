using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A service task defined as a pipeline: an ordered series of durable stages followed by the one
/// concluding step, composed in <see cref="Define"/>. This is the general shape of every service
/// task — a task that does one thing should implement <see cref="IServiceTask"/> instead, which is
/// this interface specialized to a pipeline of just the concluding step.
/// </summary>
/// <remarks>
/// <para>
/// Each stage runs as its own workflow-engine step, so it gets the engine's durability
/// individually: its own retry budget, its own timeout and wait budget, its own idempotency key
/// (<see cref="ServiceTaskContext.StepId"/>) — and, crucially, a stage that has completed never
/// runs again. A retry or an operational resume re-enters the pipeline at the failed stage, not at
/// the beginning.
/// </para>
/// <para>
/// Stages share state the way service tasks always have: through
/// <see cref="ServiceTaskContext.InstanceDataMutator"/>. A completed stage's data changes are
/// saved and visible to every stage after it. There is no separate handoff mechanism; a value a
/// later stage needs belongs in the app's own data model.
/// </para>
/// <para>
/// <strong>Implementations MUST be idempotent — every stage may be retried on failure.</strong>
/// </para>
/// </remarks>
[ImplementableByApps]
public interface IPipelineServiceTask : IProcessTask, IProcessStepConfigurable
{
    /// <summary>
    /// Defines the task's pipeline: zero or more <c>Stage</c> calls, ended by the one
    /// <c>Finally</c> — the type of the builder makes any other shape uncompilable. Stage names
    /// are explicit and are a compatibility surface for in-flight workflows (a workflow enqueued
    /// with a stage keeps calling back by that name until it settles), so renaming a stage's
    /// method is refactor-safe while the name literal stays put.
    /// </summary>
    /// <remarks>
    /// This method is called when the process transition is enqueued (fixing the pipeline's shape
    /// for that workflow's lifetime), on every stage callback (to dispatch by stage name), and at
    /// app startup (to validate it). It must therefore be cheap, deterministic and side-effect
    /// free: compose the same pipeline every time, and do no work — work happens inside the
    /// stages when the engine runs them.
    /// </remarks>
    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline);
}
