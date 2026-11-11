namespace Altinn.Studio.Preview.AppApi;

// An instance as the app's enriched instance endpoint returns it: the instance, with what the user may do in the
// current task and the type of every task. In preview the user may do everything.

internal sealed record EnrichedInstance(
    string Id,
    InstanceOwner InstanceOwner,
    string AppId,
    string Org,
    DateTimeOffset Created,
    DateTimeOffset LastChanged,
    EnrichedProcess Process,
    InstanceStatus Status,
    IReadOnlyList<DataElement> Data,
    IReadOnlyList<object> CompleteConfirmations,
    IReadOnlyDictionary<string, string> PresentationTexts,
    IReadOnlyDictionary<string, string> DataValues
)
{
    public static EnrichedInstance From(Instance instance, ProcessDefinition? process) =>
        new(
            instance.Id,
            instance.InstanceOwner,
            instance.AppId,
            instance.Org,
            instance.Created,
            instance.LastChanged,
            EnrichedProcess.From(instance.Process, process),
            new InstanceStatus(
                IsArchived: instance.Process.Ended is not null,
                IsSoftDeleted: false,
                IsHardDeleted: false
            ),
            instance.Data,
            [],
            new Dictionary<string, string>(),
            new Dictionary<string, string>()
        );
}

internal sealed record InstanceStatus(bool IsArchived, bool IsSoftDeleted, bool IsHardDeleted);

internal sealed record EnrichedProcess(
    DateTimeOffset Started,
    string? StartEvent,
    EnrichedTask? CurrentTask,
    DateTimeOffset? Ended,
    string? EndEvent,
    IReadOnlyList<ProcessTaskType> ProcessTasks
)
{
    /// <summary>What the user may do in a task in preview: everything a task can let them do.</summary>
    private static readonly IReadOnlyDictionary<string, bool> s_actions = new Dictionary<string, bool>
    {
        ["read"] = true,
        ["write"] = true,
        ["complete"] = true,
        ["confirm"] = true,
        ["sign"] = true,
        ["reject"] = true,
        ["pay"] = true,
    };

    public static EnrichedProcess From(ProcessState state, ProcessDefinition? process)
    {
        EnrichedTask? currentTask = state.CurrentTask is { } task
            ? new EnrichedTask(
                task.Flow,
                task.Started,
                task.ElementId,
                task.Name,
                task.AltinnTaskType,
                process?.Task(task.ElementId)?.ElementType ?? "Task",
                Read: true,
                Write: true,
                s_actions,
                []
            )
            : null;
        IReadOnlyList<ProcessTaskType> processTasks = process is null
            ? []
            : [.. process.Tasks.Select(t => new ProcessTaskType(t.AltinnTaskType, t.ElementId, t.ElementType))];
        return new EnrichedProcess(
            state.Started,
            state.StartEvent,
            currentTask,
            state.Ended,
            state.EndEvent,
            processTasks
        );
    }
}

internal sealed record EnrichedTask(
    int Flow,
    DateTimeOffset Started,
    string ElementId,
    string Name,
    string AltinnTaskType,
    string ElementType,
    bool Read,
    bool Write,
    IReadOnlyDictionary<string, bool> Actions,
    IReadOnlyList<object> UserActions
);

internal sealed record ProcessTaskType(string AltinnTaskType, string ElementId, string ElementType);
