namespace WorkflowEngine.Models;

public sealed record Workflow : PersistentItem
{
    public string? InstanceLockKey { get; init; }
    public required Actor Actor { get; init; }
    public required InstanceInformation InstanceInformation { get; init; }
    public DateTimeOffset? BackoffUntil { get; set; }
    public required IReadOnlyList<Step> Steps { get; init; }

    public static Workflow FromRequest(EngineRequest engineRequest) =>
        new()
        {
            IdempotencyKey = engineRequest.Key,
            InstanceInformation = engineRequest.InstanceInformation,
            Actor = engineRequest.Actor,
            TraceContext = engineRequest.TraceContext,
            Steps = engineRequest
                .Commands.Select((cmd, i) => Step.FromRequest(engineRequest.Key, cmd, engineRequest.Actor, i))
                .ToList(),
        };

    public override string ToString() => $"[{GetType().Name}] {IdempotencyKey} ({Status})";
};
