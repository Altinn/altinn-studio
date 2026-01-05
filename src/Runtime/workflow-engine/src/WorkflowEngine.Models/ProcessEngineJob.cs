namespace WorkflowEngine.Models;

public sealed record ProcessEngineJob : ProcessEngineItem
{
    public required ProcessEngineActor Actor { get; init; }
    public required InstanceInformation InstanceInformation { get; init; }
    public required IReadOnlyList<ProcessEngineTask> Tasks { get; init; }

    public static ProcessEngineJob FromRequest(ProcessEngineJobRequest jobRequest) =>
        new()
        {
            Key = jobRequest.Key,
            InstanceInformation = jobRequest.InstanceInformation,
            Actor = jobRequest.Actor,
            Tasks = jobRequest
                .Commands.Select((cmd, i) => ProcessEngineTask.FromRequest(jobRequest.Key, cmd, jobRequest.Actor, i))
                .ToList(),
        };

    public override string ToString() => $"[{GetType().Name}] {Key} ({Status})";
};
