using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;

namespace Altinn.App.Core.Internal.WorkflowEngine;

/// <summary>
/// A step as the planner composed it: the command it runs, the command's payload, and the options the pipeline
/// item it runs declared. Not yet the engine's request. That is made once, by <see cref="ToStepRequest"/>, at the
/// point of enqueue, where the options resolver and the task the step runs against are at hand. Until then the
/// declared options travel here, so <see cref="StepRequest"/> stays the engine's contract and nothing else.
/// </summary>
internal sealed record PlannedStep
{
    /// <summary>The registered key of the app command the step runs.</summary>
    public required string CommandKey { get; init; }

    /// <summary>
    /// The step's operation id: the command key, or a display identity such as <c>StartTask: 1</c> where several
    /// steps run the same command.
    /// </summary>
    public required string OperationId { get; init; }

    /// <summary>The command's payload, or null for a command that takes none.</summary>
    public CommandRequestPayload? Payload { get; init; }

    /// <summary>
    /// The options the pipeline item this step runs declared — a lifecycle stage, or a service task stage, reply
    /// handler or conclusion — or null for a step whose options come from a hook handler or from the defaults. A
    /// mailbox mint carries none, so it does not inherit the options of the stage it precedes.
    /// </summary>
    public ProcessStepOptions? DeclaredOptions { get; init; }

    /// <summary>
    /// What the step is called where people follow the task's progress: the display name of the item it runs, or
    /// null for a step with no name to show. Sent as the <see cref="WorkflowCommandSet.StepNameLabel"/> label.
    /// </summary>
    public string? StepName { get; init; }

    /// <summary>
    /// The engine's request for this step, its options resolved for <paramref name="taskId"/>: the declared
    /// options, or a hook handler's, win field-wise over the command's default, and a field no tier sets stays off
    /// the wire so the engine applies its own default.
    /// </summary>
    public StepRequest ToStepRequest(ProcessStepOptionsResolver resolver, string? taskId)
    {
        ProcessStepOptions? options = resolver.Resolve(CommandKey, taskId, DeclaredOptions);
        return new StepRequest
        {
            OperationId = OperationId,
            Command = CommandDefinition.Create(
                "app",
                new AppCommandData { CommandKey = CommandKey, Payload = CommandPayloadSerializer.Serialize(Payload) },
                maxExecutionTime: options?.MaxExecutionTime,
                waitBudget: options?.WaitBudget
            ),
            RetryStrategy = options?.RetryStrategy?.ToRetryStrategy(),
            Labels = StepName is null
                ? null
                : new Dictionary<string, string>(StringComparer.Ordinal)
                {
                    [WorkflowCommandSet.StepNameLabel] = StepName,
                },
        };
    }
}

internal static class PlannedStepExtensions
{
    /// <summary>The engine's requests for the steps, in order; see <see cref="PlannedStep.ToStepRequest"/>.</summary>
    public static IEnumerable<StepRequest> ToStepRequests(
        this IEnumerable<PlannedStep> steps,
        ProcessStepOptionsResolver resolver,
        string? taskId
    )
    {
        foreach (PlannedStep step in steps)
            yield return step.ToStepRequest(resolver, taskId);
    }
}
