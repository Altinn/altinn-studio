using Altinn.App.Core.Internal.Process.ProcessTasks;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A service task defined as a pipeline: ordered durable stages followed by the one concluding
/// step, composed in <see cref="Define"/>. A task that does one thing should implement
/// <see cref="IServiceTask"/> instead — this interface specialized to just the concluding step.
/// </summary>
/// <remarks>
/// <para>
/// Each stage runs as its own workflow-engine step, with its own retry budget, timeout, wait
/// budget and idempotency key (<see cref="ServiceTaskContext.StepId"/>) — and, crucially, a
/// completed stage never runs again: a retry or an operational resume re-enters the pipeline at
/// the failed stage, not at the beginning.
/// </para>
/// <para>
/// Stages share state the way service tasks always have: through
/// <see cref="ServiceTaskContext.InstanceDataMutator"/>. A completed stage's data changes are
/// saved and visible to every stage after it — there is no separate handoff mechanism.
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
    /// <c>Finally</c> — the builder's types make any other shape uncompilable.
    /// </summary>
    /// <remarks>
    /// Called when a transition is enqueued (fixing the pipeline's shape for that workflow's
    /// lifetime), on every stage callback (to dispatch by stage name), and at app startup (to
    /// validate it). It must therefore be cheap, deterministic and side-effect free — work
    /// happens inside the stages when the engine runs them.
    /// </remarks>
    public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline);
}
