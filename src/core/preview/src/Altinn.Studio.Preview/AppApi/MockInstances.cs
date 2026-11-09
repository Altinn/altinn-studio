using System.Globalization;
using System.Text.Json.Nodes;
using Altinn.Studio.Preview.Sessions;
using Json.Patch;

namespace Altinn.Studio.Preview.AppApi;

/// <summary>The app's process and data types, which decide what happens to an instance.</summary>
internal sealed record AppDefinition(ProcessDefinition? Process, IReadOnlyList<DataType> DataTypes)
{
    public static AppDefinition Read(AppFiles files) =>
        new(files.Process(), DataType.From(files.ApplicationMetadata()));
}

/// <summary>
/// What the app backend and Storage do with instances, done to a session's state. The store may run a change more than
/// once, so these change only the state they get.
/// </summary>
internal static class MockInstances
{
    /// <summary>
    /// Creates an instance at the process's first task, or at <paramref name="startTask"/>, with the form data
    /// elements the task's data types start with.
    /// </summary>
    /// <param name="startTask">
    /// The task the instance starts at instead, as the editors ask for the task they show. It may be a service task,
    /// or a task the process doesn't have yet, which then counts as a data task.
    /// </param>
    public static Instance Create(
        MockState state,
        AppDefinition app,
        string org,
        string appName,
        int instanceOwnerPartyId,
        DateTimeOffset now,
        string? startTask = null
    )
    {
        Guid instanceGuid = Guid.NewGuid();
        string partyId = instanceOwnerPartyId.ToString(CultureInfo.InvariantCulture);
        var instance = new MockInstance
        {
            Instance = new Instance
            {
                Id = $"{partyId}/{instanceGuid}",
                InstanceOwner = new InstanceOwner(partyId),
                AppId = $"{org}/{appName}",
                Org = org,
                Created = now,
                LastChanged = now,
                Process = new ProcessState { Started = now, StartEvent = app.Process?.StartEvent },
            },
        };
        if (startTask is null)
        {
            Enter(instance, instanceGuid, app, app.Process?.First(), now);
        }
        else
        {
            ProcessTaskDefinition task =
                app.Process?.Task(startTask) ?? new ProcessTaskDefinition(startTask, startTask, "data", "Task");
            Enter(instance, instanceGuid, app, new ProcessStep(task, EndEvent: null), now, passServiceTasks: false);
        }

        state.Instances[instanceGuid] = instance;
        return instance.Instance;
    }

    /// <summary>
    /// Ends the current task and moves the process on, past service tasks, as the app's process engine runs them
    /// without the user. Returns <c>false</c> when the process has no current task to end.
    /// </summary>
    public static bool MoveNext(MockInstance instance, Guid instanceGuid, AppDefinition app, DateTimeOffset now)
    {
        if (instance.Instance.Process.CurrentTask is not { } current || app.Process is null)
        {
            return false;
        }

        HashSet<string> taskDataTypes =
        [
            .. app.DataTypes.Where(dataType => dataType.TaskId == current.ElementId).Select(dataType => dataType.Id),
        ];
        foreach (
            DataElement element in instance.Instance.Data.Where(element => taskDataTypes.Contains(element.DataType))
        )
        {
            element.Locked = true;
        }

        Enter(instance, instanceGuid, app, app.Process.Next(current.ElementId), now);
        return true;
    }

    /// <summary>
    /// Applies the patches to the instance's form data, all of them or none. Returns the new data of each element, or
    /// the reason no patch was applied.
    /// </summary>
    public static PatchOutcome Patch(
        MockInstance instance,
        IReadOnlyList<(Guid DataElementId, JsonPatch Patch)> patches,
        DateTimeOffset now
    )
    {
        Dictionary<Guid, JsonNode?> patched = [];
        foreach ((Guid dataElementId, JsonPatch patch) in patches)
        {
            if (!instance.FormData.TryGetValue(dataElementId, out JsonNode? current))
            {
                return new PatchOutcome(null, $"The instance has no form data element {dataElementId}.");
            }

            // A copy, so a patch that fails later in the list leaves the state as it was.
            JsonNode source = (patched.GetValueOrDefault(dataElementId, current) ?? new JsonObject()).DeepClone();
            PatchResult result = patch.Apply(source);
            if (!result.IsSuccess)
            {
                return new PatchOutcome(null, result.Error);
            }

            patched[dataElementId] = result.Result;
        }

        foreach ((Guid dataElementId, JsonNode? data) in patched)
        {
            instance.FormData[dataElementId] = data;
            if (instance.Instance.Data.Find(element => element.Id == dataElementId.ToString()) is { } element)
            {
                element.LastChanged = now;
            }
        }

        instance.Instance.LastChanged = now;
        return new PatchOutcome(patched, null);
    }

    private static void Enter(
        MockInstance instance,
        Guid instanceGuid,
        AppDefinition app,
        ProcessStep? step,
        DateTimeOffset now,
        bool passServiceTasks = true
    )
    {
        ProcessState process = instance.Instance.Process;
        int flow = process.CurrentTask?.Flow ?? 1;
        while (passServiceTasks && step?.Task is { IsServiceTask: true } serviceTask && app.Process is not null)
        {
            step = app.Process.Next(serviceTask.ElementId);
        }

        instance.Instance.LastChanged = now;
        if (step?.Task is not { } task)
        {
            process.CurrentTask = null;
            if (step?.EndEvent is { } endEvent)
            {
                process.Ended = now;
                process.EndEvent = endEvent;
            }

            return;
        }

        process.CurrentTask = new ProcessTask
        {
            Flow = flow + 1,
            Started = now,
            ElementId = task.ElementId,
            Name = task.Name,
            AltinnTaskType = task.AltinnTaskType,
        };
        foreach (
            DataType dataType in app.DataTypes.Where(dataType =>
                dataType is { IsFormData: true, AutoCreate: true } && dataType.TaskId == task.ElementId
            )
        )
        {
            AddFormData(instance, instanceGuid, dataType, now);
        }
    }

    private static void AddFormData(MockInstance instance, Guid instanceGuid, DataType dataType, DateTimeOffset now)
    {
        Guid dataElementGuid = Guid.NewGuid();
        string user = MockUser.UserId.ToString(CultureInfo.InvariantCulture);
        instance.Instance.Data.Add(
            new DataElement
            {
                Id = dataElementGuid.ToString(),
                InstanceGuid = instanceGuid.ToString(),
                DataType = dataType.Id,
                ContentType = "application/xml",
                BlobStoragePath = $"{instance.Instance.AppId}/{instanceGuid}/data/{dataElementGuid}",
                Created = now,
                CreatedBy = user,
                LastChanged = now,
                LastChangedBy = user,
            }
        );
        instance.FormData[dataElementGuid] = new JsonObject();
    }
}

/// <summary>The new form data of each patched element, or why the patches weren't applied.</summary>
internal sealed record PatchOutcome(IReadOnlyDictionary<Guid, JsonNode?>? NewData, string? Error);
