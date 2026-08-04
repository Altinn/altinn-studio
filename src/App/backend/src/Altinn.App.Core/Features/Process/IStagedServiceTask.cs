namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A service task that does several things, declared as an ordered pipeline: the work steps
/// (<see cref="Steps"/>) followed by the one step that concludes the task
/// (<see cref="FinalStep"/>). The runtime expands each step into its own workflow-engine step, so
/// every step gets the engine's durability individually: its own retry budget, its own timeout and
/// wait budget (<see cref="IServiceTaskStepBase.StepOptions"/>), its own idempotency key
/// (<see cref="ServiceTaskContext.StepId"/>) — and, crucially, a step that has completed never
/// runs again. A retry or an operational resume re-enters the pipeline at the failed step, not at
/// the beginning.
/// </summary>
/// <remarks>
/// <para>
/// Steps share state the way service tasks already do: through
/// <see cref="ServiceTaskContext.InstanceDataMutator"/>. A completed step's data changes are saved
/// and visible to every step after it (and to later passes through the task — instance data
/// outlives the transition). There is no separate handoff mechanism; a value a later step needs
/// belongs in the app's own data model.
/// </para>
/// <para>
/// <see cref="Steps"/> and <see cref="FinalStep"/> are read both when the process transition is
/// enqueued (to expand the engine steps — the moment the pipeline's shape is fixed for that
/// workflow's lifetime) and on every step callback (to dispatch by step name). They must therefore
/// be cheap, deterministic and side-effect free — return the same steps in the same order every
/// time. The pipeline is validated at app startup: at least one work step, unique step names, each
/// step exactly one kind.
/// </para>
/// <para>
/// A task that does <em>one</em> thing should implement <see cref="IServiceTask"/> instead — this
/// interface is for work that benefits from per-step durability.
/// </para>
/// </remarks>
[ImplementableByApps]
public interface IStagedServiceTask : IServiceTaskBase
{
    /// <summary>
    /// The pipeline's work steps, in execution order. Each must implement
    /// <see cref="IServiceTaskStep"/> only (never also <see cref="IFinalServiceTaskStep"/>).
    /// </summary>
    IEnumerable<IServiceTaskStep> Steps { get; }

    /// <summary>
    /// The pipeline's concluding step, always executed last. Declared separately so that "exactly
    /// one final step, at the end" is the shape of the contract rather than a convention.
    /// </summary>
    IFinalServiceTaskStep FinalStep { get; }
}
