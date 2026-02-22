using System.Diagnostics;

namespace WorkflowEngine.Models;

public sealed record Workflow : PersistentItem
{
    public string? InstanceLockKey { get; init; }
    public required Actor Actor { get; init; }
    public required InstanceInformation InstanceInformation { get; init; }
    public required IReadOnlyList<Step> Steps { get; init; }

    public DateTimeOffset? ExecutionStartedAt { get; set; }

    public static Workflow FromRequest(EngineRequest engineRequest)
    {
        var steps = engineRequest
            .Steps.Select((step, i) => Step.FromRequest(engineRequest, step, engineRequest.CreatedAt, i))
            .ToList();

        AssignCorrelationIds(steps);

        return new()
        {
            IdempotencyKey = engineRequest.IdempotencyKey,
            InstanceLockKey = engineRequest.InstanceLockKey,
            InstanceInformation = engineRequest.InstanceInformation,
            Actor = engineRequest.Actor,
            CreatedAt = engineRequest.CreatedAt,
            DistributedTraceContext = engineRequest.TraceContext,
            OperationId = engineRequest.OperationId,
            Steps = steps,
        };
    }

    /// <summary>
    /// Assigns a shared CorrelationId to adjacent AppCommand + ReplyAppCommand pairs
    /// that have matching CommandKeys.
    /// </summary>
    private static void AssignCorrelationIds(List<Step> steps)
    {
        for (int i = 0; i < steps.Count - 1; i++)
        {
            if (
                steps[i].Command is Command.AppCommand appCommand
                && steps[i + 1].Command is Command.ReplyAppCommand replyCommand
                && appCommand.CommandKey == replyCommand.CommandKey
            )
            {
                var correlationId = Guid.NewGuid();
                steps[i] = steps[i] with { CorrelationId = correlationId };
                steps[i + 1] = steps[i + 1] with { CorrelationId = correlationId };
            }
        }
    }

    public override string ToString() => $"[{GetType().Name}] {IdempotencyKey} ({Status})";

    public override int GetHashCode() => IdempotencyKey.GetHashCode(StringComparison.InvariantCulture);

    public bool Equals(Workflow? other) =>
        other?.IdempotencyKey.Equals(IdempotencyKey, StringComparison.OrdinalIgnoreCase) is true;
};
