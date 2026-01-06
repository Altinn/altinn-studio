namespace WorkflowEngine.Models;

public sealed record Workflow : PersistentItem
{
    public required Actor Actor { get; init; }
    public required InstanceInformation InstanceInformation { get; init; }
    public required IReadOnlyList<Step> Steps { get; init; }

    public static Workflow FromRequest(Request request) =>
        new()
        {
            Key = request.Key,
            InstanceInformation = request.InstanceInformation,
            Actor = request.Actor,
            Steps = request.Commands.Select((cmd, i) => Step.FromRequest(request.Key, cmd, request.Actor, i)).ToList(),
        };

    public override string ToString() => $"[{GetType().Name}] {Key} ({Status})";
};
