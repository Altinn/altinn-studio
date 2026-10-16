using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Data;

namespace Altinn.App.Core.Internal.WorkflowEngine.Commands;

/// <summary>
/// Request payload for the ExecuteSideEffect command: the side effect, the one pipeline item this engine step
/// runs, and the input the side effect was enqueued with. Every step of the side effect's workflow carries the
/// same input.
/// </summary>
/// <remarks>
/// <see cref="ItemIndex"/> is nullable for the reason <see cref="ExecuteServiceTaskPayload.ItemIndex"/> is: a
/// missing index must be a legible permanent failure, not item 0.
/// </remarks>
internal sealed record ExecuteSideEffectPayload(string SideEffect, int? ItemIndex = null, string? Input = null)
    : CommandRequestPayload;

/// <summary>
/// Runs one item of a side effect's pipeline (see <see cref="ISideEffect"/>) — a stage, a reply handler or the
/// conclusion — exactly as <see cref="ExecuteServiceTask"/> runs a service task's, except that a side effect never
/// moves the process and cannot change instance data. Its workflows are independent of the process, so a stage
/// can send and the conclusion can wait for the outcome, polling with <see cref="ServiceTaskResult.Defer"/> or
/// listening on a mailbox, without holding anything up.
/// </summary>
internal sealed class ExecuteSideEffect(
    AppImplementationFactory appImplementationFactory,
    MailboxDeliveryEnvelope deliveryEnvelope
) : WorkflowEngineCommandBase<ExecuteSideEffectPayload>
{
    public static string Key => "ExecuteSideEffect";

    /// <summary>Reason code for every failure a side effect's own code reported. Operator-visible.</summary>
    internal const string FailedReasonCode = "SideEffectFailedException";

    private readonly PipelineItemRunner _runner = new(deliveryEnvelope);

    public override string GetKey() => Key;

    /// <summary>
    /// A side effect runs after the commit, so what its steps start can start once their own work is saved.
    /// </summary>
    public override bool EnqueuesStartedSideEffects => true;

    /// <summary>A side effect runs beside the process, so nothing is saved for it.</summary>
    public override bool RunsAsSideEffect => true;

    /// <summary>
    /// Side effects call external systems, like service tasks, so they get the same generous default timeout.
    /// </summary>
    public override ProcessStepOptions? DefaultStepOptions { get; } =
        new() { MaxExecutionTime = ExecuteServiceTask.DefaultServiceTaskTimeout };

    public override async Task<ProcessEngineCommandResult> Execute(
        ProcessEngineCommandContext context,
        ExecuteSideEffectPayload payload
    )
    {
        var host = new PipelineHost.SideEffect(payload.SideEffect, payload.Input);
        if (payload.ItemIndex is not { } itemIndex)
        {
            return FailedProcessEngineCommandResult.Permanent(
                $"A step of {char.ToLowerInvariant(host.Description[0])}{host.Description[1..]} names no pipeline "
                    + "item, so this workflow was not built by this application's side-effect expansion. Abandon "
                    + "it deliberately.",
                "InvalidPayloadException"
            );
        }

        try
        {
            ISideEffect sideEffect =
                appImplementationFactory.FindSideEffect(host.Name)
                ?? throw new InvalidOperationException($"No side effect is registered with the name '{host.Name}'.");

            ServiceTaskPipeline pipeline = sideEffect.ResolvePipeline();

            PipelineValues values = PipelineValuesCarry.Restore(context.StateCarry, host.ValuesKey, itemIndex);
            ServiceTaskContext sideEffectContext = PipelineItemRunner.CreateContext(context, values, payload.Input);

            ProcessEngineCommandResult result = await _runner.Run(
                context,
                host,
                pipeline,
                itemIndex,
                sideEffectContext
            );

            if (result is SuccessfulProcessEngineCommandResult && HasDataChanges(context.InstanceDataMutator))
            {
                return FailedProcessEngineCommandResult.Permanent(
                    $"{host.Description} changed instance data. A side effect runs on the state the transition "
                        + "saved while the process moves on, so it cannot save. Hand values to later stages with "
                        + $"{nameof(ServiceTaskContext)}.{nameof(ServiceTaskContext.Values)} instead.",
                    "SideEffectChangedInstanceData"
                );
            }

            if (result is DeferredProcessEngineCommandResult && sideEffectContext.SideEffects.Started.Count > 0)
            {
                return SideEffectStarts.StartedThenDeferred(host.Description);
            }

            if (
                result is SuccessfulProcessEngineCommandResult
                && SideEffectStarts.Record(
                    sideEffectContext.SideEffects,
                    appImplementationFactory,
                    context.StateCarry,
                    context.InstanceDataMutator.Instance.Process?.CurrentTask?.ElementId
                )
                    is { } refused
            )
            {
                return refused;
            }

            return PipelineValuesCarry.Publish(
                result,
                values,
                context.StateCarry,
                host.ValuesKey,
                concludes: PipelineItemRunner.Concludes(pipeline.Items.ElementAtOrDefault(itemIndex), result),
                owner: host.Description
            );
        }
        catch (Exception ex)
        {
            return FailedProcessEngineCommandResult.Retryable(ex);
        }
    }

    private static bool HasDataChanges(IInstanceDataMutator mutator) =>
        mutator is InstanceDataUnitOfWork unitOfWork && unitOfWork.GetDataElementChanges(false).AllChanges.Count > 0;
}
