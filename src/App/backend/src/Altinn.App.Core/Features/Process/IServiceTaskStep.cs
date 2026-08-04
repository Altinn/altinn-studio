namespace Altinn.App.Core.Features.Process;

/// <summary>
/// A single step in an <see cref="IStagedServiceTask"/> pipeline. Do not implement this interface
/// directly (the compiler will not let you) — implement one of its three shapes, which together
/// describe any pipeline of length two or more:
/// <list type="bullet">
/// <item><see cref="IServiceTaskStep{TOut}"/> — the <em>entry</em> step: takes no input, produces
/// the pipeline's first output. Every pipeline starts with exactly one.</item>
/// <item><see cref="IServiceTaskStep{TIn, TOut}"/> — a <em>link</em> step: consumes the previous
/// step's output, produces the next. A pipeline has any number of these, including none.</item>
/// <item><see cref="IFinalServiceTaskStep{TIn}"/> — the <em>final</em> step: consumes the previous
/// step's output and decides how the task concludes (success, auto-advance, deferral or failure).
/// Every pipeline ends with exactly one.</item>
/// </list>
/// Adjacent steps must agree on the handoff type (one step's <c>TOut</c> is the next step's
/// <c>TIn</c>); this is validated at app startup.
/// </summary>
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
    string Name => GetType().Name;

    /// <summary>
    /// Optional per-step execution options (timeout, retry strategy, wait budget) for the engine
    /// step this step expands to. <c>null</c> (the default) means "no override": the field-wise
    /// fallback is the task's own <see cref="IProcessStepConfigurable.StepOptions"/>, then the
    /// service-task command default, then the engine default.
    /// </summary>
    ProcessStepOptions? StepOptions => null;

    /// <summary>
    /// The step's declared input type: <c>TIn</c> for link and final steps, <c>null</c> for the
    /// entry step. Used for startup seam validation and input deserialization.
    /// </summary>
    internal Type? InputType { get; }

    /// <summary>
    /// The step's declared output type: <c>TOut</c> for entry and link steps, <c>null</c> for the
    /// final step. Used for startup seam validation and output serialization.
    /// </summary>
    internal Type? OutputType { get; }

    /// <summary>
    /// Whether this is the pipeline's final step.
    /// </summary>
    internal bool IsFinal { get; }

    /// <summary>
    /// Type-erased execution: builds the typed context around <paramref name="input"/> (already
    /// deserialized to <see cref="InputType"/>), runs the step, and erases the typed result. Each
    /// shape supplies this as a default implementation — it is the only place the generics meet the
    /// runtime, which is what makes the public step contracts fully typed without any reflection.
    /// </summary>
    internal Task<ServiceTaskStepOutcome> Invoke(ServiceTaskContext context, object? input);
}

/// <summary>
/// The <em>entry</em> step of an <see cref="IStagedServiceTask"/> pipeline: takes no input and
/// produces the pipeline's first handoff value. See <see cref="IServiceTaskStep"/> for the pipeline
/// shape rules.
/// </summary>
/// <typeparam name="TOut">
/// The step's output, handed to the next step as its input. Serialized as JSON into the workflow's
/// callback state between steps — keep it a small, transition-scoped value (an id, a receipt), not
/// business data, and do not reshape it while workflows may be in flight.
/// </typeparam>
[ImplementableByApps]
public interface IServiceTaskStep<TOut> : IServiceTaskStep
{
    /// <summary>
    /// Executes the step. Return <see cref="ServiceTaskStepResult.Next{TOut}"/> with the value for
    /// the next step, <see cref="ServiceTaskStepResult.Defer"/> to run this step again later, or a
    /// failure. Unhandled exceptions are treated as retryable failures.
    /// </summary>
    Task<ServiceTaskStepResult<TOut>> Execute(ServiceTaskContext context);

    Type? IServiceTaskStep.InputType => null;

    Type? IServiceTaskStep.OutputType => typeof(TOut);

    bool IServiceTaskStep.IsFinal => false;

    async Task<ServiceTaskStepOutcome> IServiceTaskStep.Invoke(ServiceTaskContext context, object? input) =>
        (await Execute(context)).ToOutcome();
}

/// <summary>
/// A <em>link</em> step of an <see cref="IStagedServiceTask"/> pipeline: consumes the previous
/// step's output and produces the next handoff value. See <see cref="IServiceTaskStep"/> for the
/// pipeline shape rules.
/// </summary>
/// <typeparam name="TIn">The previous step's output, available as <see cref="ServiceTaskContext{TIn}.Input"/>.</typeparam>
/// <typeparam name="TOut">
/// The step's output, handed to the next step as its input. Serialized as JSON into the workflow's
/// callback state between steps — keep it a small, transition-scoped value (an id, a receipt), not
/// business data, and do not reshape it while workflows may be in flight. A value a later step
/// needs must be carried forward through each intermediate output type — the handoff is a relay,
/// not a shared scrapbook.
/// </typeparam>
[ImplementableByApps]
public interface IServiceTaskStep<TIn, TOut> : IServiceTaskStep
{
    /// <summary>
    /// Executes the step. Return <see cref="ServiceTaskStepResult.Next{TOut}"/> with the value for
    /// the next step, <see cref="ServiceTaskStepResult.Defer"/> to run this step again later (its
    /// <see cref="ServiceTaskContext{TIn}.Input"/> is preserved), or a failure. Unhandled exceptions
    /// are treated as retryable failures.
    /// </summary>
    Task<ServiceTaskStepResult<TOut>> Execute(ServiceTaskContext<TIn> context);

    Type? IServiceTaskStep.InputType => typeof(TIn);

    Type? IServiceTaskStep.OutputType => typeof(TOut);

    bool IServiceTaskStep.IsFinal => false;

    async Task<ServiceTaskStepOutcome> IServiceTaskStep.Invoke(ServiceTaskContext context, object? input) =>
        (await Execute(new ServiceTaskContext<TIn>(context, (TIn)input!))).ToOutcome();
}

/// <summary>
/// The <em>final</em> step of an <see cref="IStagedServiceTask"/> pipeline: consumes the previous
/// step's output and concludes the task. This is deliberately the only step shape that returns
/// <see cref="ServiceTaskResult"/> — success with or without process auto-advancement is a
/// task-level outcome, and the type system reserves it for the pipeline's end. See
/// <see cref="IServiceTaskStep"/> for the pipeline shape rules.
/// </summary>
/// <typeparam name="TIn">The previous step's output, available as <see cref="ServiceTaskContext{TIn}.Input"/>.</typeparam>
[ImplementableByApps]
public interface IFinalServiceTaskStep<TIn> : IServiceTaskStep
{
    /// <summary>
    /// Executes the step, concluding the task: <see cref="ServiceTaskResult.Success"/> (with
    /// optional auto-advance action), <see cref="ServiceTaskResult.SuccessWithoutAutoAdvance"/>,
    /// <see cref="ServiceTaskResult.Defer"/> to run this step again later (its
    /// <see cref="ServiceTaskContext{TIn}.Input"/> is preserved — this is where a polling step
    /// waits), or a failure. Unhandled exceptions are treated as retryable failures.
    /// </summary>
    Task<ServiceTaskResult> Execute(ServiceTaskContext<TIn> context);

    Type? IServiceTaskStep.InputType => typeof(TIn);

    Type? IServiceTaskStep.OutputType => null;

    bool IServiceTaskStep.IsFinal => true;

    async Task<ServiceTaskStepOutcome> IServiceTaskStep.Invoke(ServiceTaskContext context, object? input) =>
        new ServiceTaskStepOutcome.Final(await Execute(new ServiceTaskContext<TIn>(context, (TIn)input!)));
}
