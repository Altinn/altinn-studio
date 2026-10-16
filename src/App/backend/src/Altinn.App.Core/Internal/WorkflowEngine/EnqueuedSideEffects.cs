using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Moves the side effects a step enqueued (<see cref="SideEffectQueue"/>) into the workflow state, where they wait
/// until the callback controller hands them to the engine: right after the transition is saved for a step that runs before
/// it, right after the step's own save for one that runs after it.
/// </summary>
internal static class EnqueuedSideEffects
{
    /// <summary>
    /// Resolves what <paramref name="queue"/> holds to the registered side effects and records them in
    /// <paramref name="carry"/>. Call it only when the step succeeded: a failed step starts nothing.
    /// </summary>
    /// <param name="queue">What the step's code enqueued.</param>
    /// <param name="appImplementationFactory">Where the registered side effects are found.</param>
    /// <param name="carry">The carry the callback publishes, where the enqueued side effects wait.</param>
    /// <param name="enqueuedFrom">The BPMN element current when the step ran, which names the side effect's workflow.</param>
    /// <returns>A permanent failure when an enqueued side effect cannot be started, otherwise <c>null</c>.</returns>
    public static FailedProcessEngineCommandResult? Record(
        SideEffectQueue queue,
        AppImplementationFactory appImplementationFactory,
        WorkflowCallbackStateCarry carry,
        string? enqueuedFrom
    )
    {
        if (queue.Enqueued.Count == 0)
        {
            return null;
        }

        List<ISideEffect> registered = [.. appImplementationFactory.GetAll<ISideEffect>()];
        var pending = new List<PendingSideEffect>(queue.Enqueued.Count);
        foreach (EnqueuedSideEffect enqueued in queue.Enqueued)
        {
            ISideEffect? sideEffect =
                registered.LastOrDefault(candidate => candidate.GetType() == enqueued.SideEffect)
                ?? registered.LastOrDefault(enqueued.SideEffect.IsInstanceOfType);
            if (sideEffect is null)
            {
                return FailedProcessEngineCommandResult.Permanent(
                    $"The side effect {enqueued.SideEffect.Name} was enqueued, but no side effect of that type is "
                        + $"registered. Register it with services.AddTransient<{nameof(ISideEffect)}, "
                        + $"{enqueued.SideEffect.Name}>().",
                    "SideEffectNotRegistered"
                );
            }

            string? input;
            try
            {
                input = SideEffectInput.Serialize(enqueued.Input);
            }
            catch (Exception ex) when (ex is JsonException or NotSupportedException)
            {
                return FailedProcessEngineCommandResult.Permanent(
                    $"The input side effect '{sideEffect.Name}' was enqueued with cannot be serialized as JSON: "
                        + ex.Message,
                    "SideEffectInputInvalid"
                );
            }

            pending.Add(
                new PendingSideEffect
                {
                    Name = sideEffect.Name,
                    Input = input,
                    EnqueuedFrom = enqueuedFrom,
                }
            );
        }

        carry.RecordPendingSideEffects(pending);
        return null;
    }

    /// <summary>
    /// The refusal for a step that enqueued side effects and then deferred: a deferral is stateless, so what it
    /// enqueued would be lost without a word.
    /// </summary>
    public static FailedProcessEngineCommandResult EnqueuedThenDeferred(string owner) =>
        FailedProcessEngineCommandResult.Permanent(
            $"{owner} enqueued side effects and then deferred. A deferral is stateless, so nothing it enqueues is "
                + "kept: enqueue side effects from a step that completes.",
            "SideEffectsEnqueuedOnDeferral"
        );
}
