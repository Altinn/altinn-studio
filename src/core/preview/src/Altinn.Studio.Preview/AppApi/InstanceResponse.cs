using System.Globalization;
using System.Text.Json.Nodes;

namespace Altinn.Studio.Preview.AppApi;

/// <summary>The instance endpoints' answer. Its owner has a party, which Storage's instance doesn't.</summary>
internal sealed record InstanceResponse<TProcess>(
    string Id,
    InstanceOwnerResponse InstanceOwner,
    string AppId,
    string Org,
    DateTimeOffset Created,
    string CreatedBy,
    DateTimeOffset LastChanged,
    string LastChangedBy,
    DateTimeOffset? DueBefore,
    DateTimeOffset? VisibleAfter,
    ResourceLinks SelfLinks,
    TProcess Process,
    InstanceStatus Status,
    IReadOnlyList<DataElement> Data,
    IReadOnlyList<object> CompleteConfirmations,
    IReadOnlyDictionary<string, string> PresentationTexts,
    IReadOnlyDictionary<string, string> DataValues
);

internal static class InstanceResponse
{
    public static InstanceResponse<ProcessState> From(Instance instance) => From(instance, instance.Process);

    /// <summary>
    /// The instance as the enriched instance endpoint answers with it, with what the user may do in the current task
    /// and the type of every task. In preview the user may do everything.
    /// </summary>
    public static InstanceResponse<EnrichedProcess> Enriched(Instance instance, ProcessDefinition? process) =>
        From(instance, EnrichedProcess.From(instance.Process, process));

    private static InstanceResponse<TProcess> From<TProcess>(Instance instance, TProcess process) =>
        new(
            instance.Id,
            InstanceOwnerResponse.From(instance.InstanceOwner),
            instance.AppId,
            instance.Org,
            instance.Created,
            instance.CreatedBy,
            instance.LastChanged,
            instance.LastChangedBy,
            instance.DueBefore,
            instance.VisibleAfter,
            instance.SelfLinks,
            process,
            instance.Status,
            instance.Data,
            instance.CompleteConfirmations,
            instance.PresentationTexts,
            instance.DataValues
        );
}

internal sealed record InstanceOwnerResponse(
    string PartyId,
    string? PersonNumber,
    string? OrganisationNumber,
    string? Username,
    JsonObject Party
)
{
    public static InstanceOwnerResponse From(InstanceOwner owner) =>
        new(
            owner.PartyId,
            owner.PersonNumber,
            owner.OrganisationNumber,
            owner.Username,
            MockUser.Party(int.Parse(owner.PartyId, CultureInfo.InvariantCulture))
        );
}

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
