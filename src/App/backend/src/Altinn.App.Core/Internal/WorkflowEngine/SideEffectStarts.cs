using System.Text.Json;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// Moves the side effects a step started (<see cref="SideEffectStarter"/>) into the workflow state, where they wait
/// until the callback controller enqueues them: right after the transition is saved for a step that runs before
/// it, right after the step's own save for one that runs after it.
/// </summary>
internal static class SideEffectStarts
{
    /// <summary>
    /// Resolves what <paramref name="starter"/> holds to the registered side effects and records them in
    /// <paramref name="carry"/>. Call it only when the step succeeded: a failed step starts nothing.
    /// </summary>
    /// <param name="starter">What the step's code started.</param>
    /// <param name="appImplementationFactory">Where the registered side effects are found.</param>
    /// <param name="carry">The carry the callback publishes, where the started side effects wait.</param>
    /// <param name="startedFrom">The BPMN element current when the step ran, which names the side effect's workflow.</param>
    /// <returns>A permanent failure when a started side effect cannot be enqueued, otherwise <c>null</c>.</returns>
    public static FailedProcessEngineCommandResult? Record(
        SideEffectStarter starter,
        AppImplementationFactory appImplementationFactory,
        WorkflowCallbackStateCarry carry,
        string? startedFrom
    )
    {
        if (starter.Started.Count == 0)
        {
            return null;
        }

        List<ISideEffect> registered = [.. appImplementationFactory.GetAll<ISideEffect>()];
        var pending = new List<PendingSideEffect>(starter.Started.Count);
        foreach (StartedSideEffect started in starter.Started)
        {
            ISideEffect? sideEffect =
                registered.LastOrDefault(candidate => candidate.GetType() == started.SideEffect)
                ?? registered.LastOrDefault(started.SideEffect.IsInstanceOfType);
            if (sideEffect is null)
            {
                return FailedProcessEngineCommandResult.Permanent(
                    $"The side effect {started.SideEffect.Name} was started, but no side effect of that type is "
                        + $"registered. Register it with services.AddTransient<{nameof(ISideEffect)}, "
                        + $"{started.SideEffect.Name}>().",
                    "SideEffectNotRegistered"
                );
            }

            string? input;
            try
            {
                input = SideEffectInput.Serialize(started.Input);
            }
            catch (Exception ex) when (ex is JsonException or NotSupportedException)
            {
                return FailedProcessEngineCommandResult.Permanent(
                    $"The input side effect '{sideEffect.Name}' was started with cannot be serialized as JSON: "
                        + ex.Message,
                    "SideEffectInputInvalid"
                );
            }

            pending.Add(
                new PendingSideEffect
                {
                    Name = sideEffect.Name,
                    Input = input,
                    StartedFrom = startedFrom,
                }
            );
        }

        carry.RecordStartedSideEffects(pending);
        return null;
    }

    /// <summary>
    /// The refusal for a step that started side effects and then deferred: a deferral is stateless, so what it
    /// started would be lost without a word.
    /// </summary>
    public static FailedProcessEngineCommandResult StartedThenDeferred(string owner) =>
        FailedProcessEngineCommandResult.Permanent(
            $"{owner} started side effects and then deferred. A deferral is stateless, so nothing it starts is "
                + "kept: start side effects from a step that completes.",
            "SideEffectsStartedOnDeferral"
        );
}
