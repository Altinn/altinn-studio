using System.Diagnostics.CodeAnalysis;

namespace Altinn.App.Core.Features.Process;

/// <summary>
/// This class represents the parameters for executing a service task. For a pipeline step that
/// receives input from its predecessor, see <see cref="ServiceTaskContext{TIn}"/>.
/// </summary>
public record ServiceTaskContext
{
    /// <summary>
    /// An instance data mutator that can be used to read and modify the instance data during the service task execution.
    /// </summary>
    /// <remarks>
    /// Changes are saved after Execute returns a successful result — including a deferral
    /// (<see cref="ServiceTaskResult.Defer"/>), so a polling task can record what it learned and read it
    /// back on its next attempt. Keep in mind that data elements from previous tasks are locked.
    /// </remarks>
    public required IInstanceDataMutator InstanceDataMutator { get; init; }

    /// <summary>
    /// Cancellation token for the operation.
    /// </summary>
    public CancellationToken CancellationToken { get; init; } = CancellationToken.None;

    /// <summary>
    /// The engine-assigned id of the workflow executing this service task. Stable across retries of
    /// the same process transition; a new visit to the task runs under a new workflow id. Service
    /// tasks with external side effects can use it to tell a retried attempt apart from a genuinely
    /// new pass through the task.
    /// </summary>
    public required Guid WorkflowId { get; init; }

    /// <summary>
    /// The engine's identity for the step executing this task. Stable across every attempt of the step
    /// — retries and deferral re-checks alike — which makes it a ready-made idempotency key for an
    /// outbound call the task must not repeat (dispatch a shipment once, then poll). A new visit to the
    /// task runs under a new step id.
    /// </summary>
    /// <remarks>
    /// An idempotency key alone does not decide whether a <em>superseding</em> workflow (after a reject,
    /// or a written-off failure) may repeat the call — that is a business rule, guarded by durable
    /// evidence the task records in instance data via <see cref="InstanceDataMutator"/>.
    /// </remarks>
    public required Guid StepId { get; init; }

    /// <summary>
    /// The clock bounding <em>this attempt</em> (<see cref="ProcessStepOptions.MaxExecutionTime"/>):
    /// how many consecutive errors preceded it, and when it is cut off.
    /// </summary>
    public ServiceTaskAttempt Attempt { get; init; } = new();

    /// <summary>
    /// The clock bounding <em>the whole wait</em> (<see cref="ProcessStepOptions.WaitBudget"/>):
    /// which check this is, when the wait began and ends, and how much allowance is left.
    /// </summary>
    /// <remarks>
    /// Everything here is a pacing signal, never an idempotency guard: the engine records an attempt
    /// only after it answers, so an attempt that performed a side effect and crashed re-runs with all
    /// of these unchanged.
    /// </remarks>
    public ServiceTaskWait Wait { get; init; } = new();
}

/// <summary>
/// The execution context for a pipeline step that receives input — a link
/// (<see cref="IServiceTaskStep{TIn, TOut}"/>) or final (<see cref="IFinalServiceTaskStep{TIn}"/>)
/// step of an <see cref="IStagedServiceTask"/>. It is the ordinary <see cref="ServiceTaskContext"/>
/// plus the previous step's output, typed.
/// </summary>
/// <typeparam name="TIn">The previous step's declared output type.</typeparam>
public sealed record ServiceTaskContext<TIn> : ServiceTaskContext
{
    /// <summary>
    /// Creates an empty context for object-initializer construction (e.g. in unit tests).
    /// </summary>
    public ServiceTaskContext() { }

    [SetsRequiredMembers]
    internal ServiceTaskContext(ServiceTaskContext original, TIn input)
        : base(original)
    {
        Input = input;
    }

    /// <summary>
    /// The previous step's output. Non-null by construction in the runtime: this step cannot run
    /// unless its predecessor completed and produced a value. When the step defers, the same input
    /// is handed to the re-run.
    /// </summary>
    public required TIn Input { get; init; }
}
