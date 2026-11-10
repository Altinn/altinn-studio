namespace Altinn.App.Core.Features.Process;

/// <summary>
/// Hook interface for custom logic after the process has ended.
/// </summary>
/// <remarks>
/// <para><strong>IMPORTANT: Implementations MUST be idempotent - this hook may be retried on failure.</strong>
/// Use <see cref="OnProcessEndedContext.StepId"/> as the idempotency key for an outbound call it must not repeat.</para>
/// <para>
/// Runs after the ended process state is saved to Storage, and before the configured process-end steps
/// (<c>autoDeleteOnProcessEnd</c>, <c>autoConfirmCompleteOnProcessEnd</c>) and the release of the instance. A
/// failure here cannot stop the process from
/// ending; it leaves the ended instance processing until resumed. It runs however the process reached its end event,
/// so it is the place for logic that belongs to the end of the process. Only logic that must be able to stop the
/// process from ending belongs in the <see cref="IOnTaskEndingHandler"/> of the task that leads to the end event;
/// when a rejection ends the process, that task's <see cref="IOnTaskAbandoningHandler"/> runs instead.
/// </para>
/// <para>An app registers at most one implementation; with more, it does not start.</para>
/// <para>
/// A hook cannot confirm the instance as complete for the service owner. An app that needs the confirmation sets
/// <c>autoConfirmCompleteOnProcessEnd</c> in <c>applicationmetadata.json</c>, which confirms when the process ends.
/// Delivering the instance to the service owner belongs in a service task: the engine records each completed
/// stage, so a failure after the delivery does not deliver again.
/// </para>
/// </remarks>
[ImplementableByApps]
public interface IOnProcessEndedHandler : IProcessStepConfigurable
{
    /// <summary>
    /// Executes the ended process hook logic.
    /// </summary>
    /// <param name="context">A context object with relevant parameters and data.</param>
    /// <returns>
    /// A result indicating success or failure. Construct via <see cref="HandlerResult.Success"/>,
    /// <see cref="HandlerResult.FailedRetryable"/>, or <see cref="HandlerResult.FailedPermanent"/>.
    /// </returns>
    public Task<HandlerResult> Execute(OnProcessEndedContext context);
}

/// <summary>
/// Parameters for ended process hook execution.
/// </summary>
public sealed class OnProcessEndedContext
{
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
    /// it a ready-made idempotency key for an outbound call the hook must not repeat. A later transition
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
