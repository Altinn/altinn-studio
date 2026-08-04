namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A service task that does several things, declared as an ordered pipeline of steps. The runtime
/// expands each step into its own workflow-engine step, so every step gets the engine's durability
/// individually: its own retry budget, its own timeout and wait budget
/// (<see cref="IServiceTaskStep.StepOptions"/>), its own idempotency key
/// (<see cref="ServiceTaskContext.StepId"/>) — and, crucially, a step that has succeeded never runs
/// again. A retry or an operational resume re-enters the pipeline at the failed step, not at the
/// beginning.
/// </summary>
/// <remarks>
/// <para>
/// A pipeline is 1 entry step (<see cref="IServiceTaskStep{TOut}"/>), any number of link steps
/// (<see cref="IServiceTaskStep{TIn, TOut}"/>), and exactly 1 final step
/// (<see cref="IFinalServiceTaskStep{TIn}"/>) — in that order. Each step's output is handed to the
/// next step as its typed input; only the final step decides how the task concludes (including
/// process auto-advancement). The pipeline shape is validated at app startup.
/// </para>
/// <para>
/// <see cref="Steps"/> is read both when the process transition is enqueued (to expand the engine
/// steps) and on every step callback (to dispatch by step name). It must therefore be cheap,
/// deterministic and side-effect free — return the same steps in the same order every time.
/// </para>
/// <para>
/// <strong>Each step MUST be idempotent — a step may be retried on failure.</strong> A completed
/// step is never re-run, but the crash window within one attempt (the work succeeded, the response
/// never reached the engine) always exists; <see cref="ServiceTaskContext.StepId"/> is the outbound
/// idempotency key covering it.
/// </para>
/// </remarks>
[ImplementableByApps]
public interface IStagedServiceTask : IServiceTaskBase
{
    /// <summary>
    /// The ordered steps of this task's pipeline. See the interface remarks for the required shape
    /// and the determinism contract.
    /// </summary>
    IEnumerable<IServiceTaskStep> Steps { get; }
}
