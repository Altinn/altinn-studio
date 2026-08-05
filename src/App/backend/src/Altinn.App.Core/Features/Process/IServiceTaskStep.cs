namespace Altinn.App.Core.Features.Process;

/// <summary>
/// One durable step of an <see cref="IServiceTask"/>, declared via
/// <see cref="IServiceTask.Steps"/> and executed before the task's own
/// <see cref="IServiceTask.Execute"/>. Runs as its own workflow-engine step: once it reports
/// <see cref="ServiceTaskStepResult.Next"/> it never runs again — the task moves on, and any later
/// retry or resume re-enters at the step that failed, not here. A step cannot conclude the task —
/// <see cref="ServiceTaskStepResult"/> deliberately has no success-with-outcome shape; how the
/// task concludes is reserved for <see cref="IServiceTask.Execute"/>, which always runs last.
/// </summary>
/// <remarks>
/// <para>
/// Steps share state the same way every service task already does: through
/// <see cref="ServiceTaskContext.InstanceDataMutator"/>. Changes made by a step that completes are
/// saved and visible to the steps after it. There is no other channel — a value the next step
/// needs goes in the app's own data model.
/// </para>
/// <para>
/// <strong>The step MUST be idempotent — it may be retried on failure.</strong> Use
/// <see cref="ServiceTaskContext.StepId"/> (stable across this step's attempts, unique to it) as
/// the idempotency key for an outbound call the step must not repeat.
/// </para>
/// </remarks>
[ImplementableByApps]
public interface IServiceTaskStep
{
    /// <summary>
    /// The step's identity, defaulting to the implementing class's name. It names the step in the
    /// engine's records, logs and dashboards, and is how a callback finds its way back to this step.
    /// </summary>
    /// <remarks>
    /// <strong>The name is a compatibility surface for in-flight workflows.</strong> A workflow
    /// enqueued with this step keeps calling back by name until it settles — hours or days later for
    /// a waiting step. Renaming the class (or changing an override of this property) while such
    /// workflows exist strands them with a permanent "unknown step" failure; recovery is redeploying
    /// with the old name pinned via this property and resuming the failed workflows. Prefer keeping
    /// names stable; when a class must be renamed, pin the original name here.
    /// </remarks>
    public string Name => GetType().Name;

    /// <summary>
    /// Optional per-step execution options (timeout, retry strategy, wait budget) for the engine
    /// step this step expands to. <c>null</c> (the default) means "no override": the field-wise
    /// fallback is the task's own <see cref="IProcessStepConfigurable.StepOptions"/>, then the
    /// service-task command default, then the engine default.
    /// </summary>
    public ProcessStepOptions? StepOptions => null;

    /// <summary>
    /// Executes the step. Return <see cref="ServiceTaskStepResult.Next"/> when done (the task
    /// moves on), <see cref="ServiceTaskStepResult.Defer"/> to run this step again later, or a
    /// failure. Unhandled exceptions are treated as retryable failures. Note that a deferring
    /// attempt is stateless: data changes are only saved when the step completes — see
    /// <see cref="ServiceTaskStepResult.Defer"/>.
    /// </summary>
    public Task<ServiceTaskStepResult> Execute(ServiceTaskContext context);
}
