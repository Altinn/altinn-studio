namespace Altinn.App.Core.Features.Process;

/// <summary>
/// What every pipeline step of an <see cref="IStagedServiceTask"/> declares, regardless of kind:
/// its identity and its per-step execution options. Implement one of the two kinds —
/// <see cref="IServiceTaskStep"/> for the work steps, <see cref="IFinalServiceTaskStep"/> for the
/// one step that concludes the task (a class must be exactly one of the two).
/// </summary>
public interface IServiceTaskStepBase
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
    string Name => GetType().Name;

    /// <summary>
    /// Optional per-step execution options (timeout, retry strategy, wait budget) for the engine
    /// step this step expands to. <c>null</c> (the default) means "no override": the field-wise
    /// fallback is the task's own <see cref="IProcessStepConfigurable.StepOptions"/>, then the
    /// service-task command default, then the engine default.
    /// </summary>
    ProcessStepOptions? StepOptions => null;
}

/// <summary>
/// A work step of an <see cref="IStagedServiceTask"/> pipeline. Runs as its own durable engine
/// step: once it reports <see cref="ServiceTaskStepResult.Next"/> it never runs again — the
/// pipeline moves on, and any later retry or resume re-enters at the step that failed, not here.
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
public interface IServiceTaskStep : IServiceTaskStepBase
{
    /// <summary>
    /// Executes the step. Return <see cref="ServiceTaskStepResult.Next"/> when done (the pipeline
    /// advances), <see cref="ServiceTaskStepResult.Defer"/> to run this step again later, or a
    /// failure. Unhandled exceptions are treated as retryable failures. Note that a deferring
    /// attempt is stateless: data changes are only saved when the step completes — see
    /// <see cref="ServiceTaskStepResult.Defer"/>.
    /// </summary>
    Task<ServiceTaskStepResult> Execute(ServiceTaskContext context);
}

/// <summary>
/// The concluding step of an <see cref="IStagedServiceTask"/> pipeline — always the pipeline's
/// last step, declared separately as <see cref="IStagedServiceTask.FinalStep"/>. This is
/// deliberately the only step kind that returns <see cref="ServiceTaskResult"/>: how the task
/// concludes (success, auto-advance action, park) is a task-level outcome, and the shape of the
/// contract reserves it for the pipeline's end.
/// </summary>
/// <remarks>
/// The idempotency and state-sharing rules of <see cref="IServiceTaskStep"/> apply here too. This
/// is where a polling pipeline waits: return <see cref="ServiceTaskResult.Defer"/> until the
/// outcome arrives, bounded by this step's <see cref="ProcessStepOptions.WaitBudget"/>.
/// </remarks>
[ImplementableByApps]
public interface IFinalServiceTaskStep : IServiceTaskStepBase
{
    /// <summary>
    /// Executes the step, concluding the task: <see cref="ServiceTaskResult.Success"/> (with
    /// optional auto-advance action), <see cref="ServiceTaskResult.SuccessWithoutAutoAdvance"/>,
    /// <see cref="ServiceTaskResult.Defer"/> to run this step again later, or a failure. Unhandled
    /// exceptions are treated as retryable failures.
    /// </summary>
    Task<ServiceTaskResult> Execute(ServiceTaskContext context);
}
