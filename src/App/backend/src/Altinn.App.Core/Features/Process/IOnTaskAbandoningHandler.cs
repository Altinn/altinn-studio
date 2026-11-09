namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Hook interface for custom abandon task logic.
/// </summary>
/// <remarks>
/// <strong>IMPORTANT: Implementations MUST be idempotent - this hook may be retried on failure.</strong>
/// Use <see cref="OnTaskAbandoningContext.StepId"/> as the idempotency key for an outbound call it must not repeat.
/// </remarks>
[ImplementableByApps]
public interface IOnTaskAbandoningHandler : IProcessStepConfigurable
{
    /// <summary>
    /// Determines whether the hook should run for the given task ID. At most one implementation may run for a task; if
    /// more than one returns true for a task in the process definition, the app does not start. The app calls this when
    /// it plans a transition that abandons the task, and again when the hook runs, so the answer must depend on the
    /// task ID alone.
    /// </summary>
    /// <param name="taskId">The task ID to check.</param>
    /// <returns>True if the hook should run for this task; otherwise, false.</returns>
    public bool ShouldRunForTask(string taskId);

    /// <summary>
    /// Executes the abandon task hook logic.
    /// </summary>
    /// <param name="context">A context object with relevant parameters and data.</param>
    /// <returns>
    /// A result indicating success or failure. Construct via <see cref="HandlerResult.Success"/>,
    /// <see cref="HandlerResult.FailedRetryable"/>, or <see cref="HandlerResult.FailedPermanent"/>.
    /// </returns>
    public Task<HandlerResult> Execute(OnTaskAbandoningContext context);
}

/// <summary>
/// Parameters for abandon task hook execution.
/// </summary>
public sealed class OnTaskAbandoningContext
{
    /// <summary>
    /// The ID of the task this hook is running for (the task being abandoned).
    /// Matches the <c>taskId</c> passed to <see cref="IOnTaskAbandoningHandler.ShouldRunForTask"/>.
    /// </summary>
    public required string TaskId { get; init; }

    /// <summary>
    /// An instance data mutator that can be used to access and modify instance data. Changes made will be automatically saved if the hook execution is successful.
    /// </summary>
    public required IInstanceDataMutator InstanceDataMutator { get; init; }

    /// <summary>
    /// Cancellation token for the hook execution.
    /// </summary>
    public CancellationToken CancellationToken { get; init; } = CancellationToken.None;

    /// <summary>
    /// The engine-assigned id of the workflow running this hook, which every step of the process transition
    /// shares. It does not tell one call apart from another; use <see cref="StepId"/> as the idempotency key.
    /// </summary>
    public required Guid WorkflowId { get; init; }

    /// <summary>
    /// The engine's identity for the step running this hook. Stable across every attempt of the step, which makes
    /// it a ready-made idempotency key for an outbound call the hook must not repeat. A new visit to the task
    /// runs under a new step id.
    /// </summary>
    /// <remarks>
    /// <para>
    /// The key covers the whole hook, which runs as one step. A hook that makes several outbound calls derives one
    /// key per call, for example from the step id and a name for the call, so that the receivers tell the calls
    /// apart. A retry runs the whole hook again, including the calls that succeeded before the one that failed.
    /// Work that needs each call to run once, such as sending and then polling, belongs in pipeline stages, which
    /// never run again once they complete; see
    /// <a href="https://github.com/Altinn/altinn-studio/blob/main/src/App/backend/docs/service-task-pipelines.md#stages-durability-and-idempotency">service task pipelines</a>.
    /// </para>
    /// <para>
    /// An idempotency key alone does not decide whether a <em>superseding</em> workflow may repeat the call; that is
    /// a business rule, guarded by durable evidence the hook records in instance data via
    /// <see cref="InstanceDataMutator"/>.
    /// </para>
    /// </remarks>
    public required Guid StepId { get; init; }
}
