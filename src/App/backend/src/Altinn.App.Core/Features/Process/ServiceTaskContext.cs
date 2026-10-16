namespace Altinn.App.Core.Features.Process;

/// <summary>
/// This class represents the parameters for executing a service task — a pipeline stage, the concluding
/// step (an <see cref="IServiceTask"/>'s <c>Execute</c>), or one execution of a reply terminal's
/// <c>onMessage</c>/<c>onClosed</c> handler.
/// </summary>
public sealed record ServiceTaskContext
{
    /// <summary>
    /// An instance data mutator that can be used to read and modify the instance data during the service task execution.
    /// </summary>
    /// <remarks>
    /// Changes are saved when execution completes (a stage's <c>Completed</c>, or the task's
    /// concluding result) — and in a pipeline, saved changes are visible to every later stage. A
    /// <em>deferring</em> attempt is stateless: nothing is saved, and data changes made before a
    /// deferral are rejected (see <see cref="ServiceTaskResult.Defer"/>). Keep in mind that data
    /// elements from previous tasks are locked.
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
    /// Reference time for this execution: the explicit workflow schedule when present, otherwise the
    /// persisted time when the workflow step was enqueued.
    /// </summary>
    /// <remarks>Provided by the workflow engine as <c>Workflow.StartAt ?? Step.CreatedAt</c>.</remarks>
    public DateTimeOffset ExecutionReferenceTime { get; internal init; }

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

    /// <summary>
    /// Small named values this pipeline's stages hand to the stages after them, such as the reference an
    /// external system returned for a request an earlier stage sent.
    /// </summary>
    /// <remarks>
    /// Kept only when this step completes. A deferring attempt must not record anything: like data changes,
    /// values recorded before a deferral are rejected. See <see cref="PipelineValues"/>.
    /// </remarks>
    public PipelineValues Values { get; init; } = new();

    /// <summary>
    /// Enqueues side effects, which start once this step's work is saved, such as a follow-up that should not hold up the task.
    /// A deferring attempt must not start anything. See <see cref="SideEffectQueue"/>.
    /// </summary>
    public SideEffectQueue SideEffects { get; init; } = new();

    /// <summary>
    /// The input a side effect was enqueued with, serialized, or <c>null</c> when it has none. Always <c>null</c>
    /// for a service task.
    /// </summary>
    internal string? Input { get; init; }

    /// <summary>
    /// The input a side effect was enqueued with (<c>context.SideEffects.Enqueue&lt;TSideEffect&gt;(input)</c>), read
    /// as <typeparamref name="T"/>, or <c>default</c> when it was enqueued without one. A service task has no
    /// input.
    /// </summary>
    /// <remarks>
    /// The input travels as JSON with the web defaults of <c>System.Text.Json</c> (camelCase names), so read it as
    /// the type it was enqueued with, or as one with the same shape.
    /// </remarks>
    public T? GetInput<T>() => SideEffectInput.Deserialize<T>(Input);
}
