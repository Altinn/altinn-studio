using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Builds a transition to a preselected BPMN element without running gateways or mutating the instance.
/// </summary>
internal sealed class ProcessTransitionBuilder
{
    private readonly IProcessReader _processReader;
    private readonly Telemetry? _telemetry;

    public ProcessTransitionBuilder(IProcessReader processReader, Telemetry? telemetry = null)
    {
        _processReader = processReader;
        _telemetry = telemetry;
    }

    /// <summary>
    /// Uses the engine's reference time to keep event timestamps stable across callback retries.
    /// </summary>
    /// <exception cref="ProcessException">The process definition has no element with that id.</exception>
    internal ProcessStateChange Build(
        Instance instance,
        string nextElementId,
        string? action,
        Actor actor,
        DateTimeOffset executionReferenceTime
    )
    {
        ProcessElement nextElement =
            _processReader.GetFlowElement(nextElementId)
            ?? throw new ProcessException(
                $"Unable to find the element {nextElementId} the process was moving to in the process definition."
            );
        return Build(instance, nextElement, action, CreatePlatformUser(actor), executionReferenceTime.UtcDateTime);
    }

    internal ProcessStateChange Build(
        Instance instance,
        ProcessElement nextElement,
        string? action,
        PlatformUser user,
        DateTime now
    )
    {
        using var activity = _telemetry?.StartProcessGenerateChangeEventActivity(instance, GetLeaveEventType(action));
        ProcessState process = instance.Process ?? throw new ProcessException("Process is null");
        string currentTaskId =
            process.CurrentTask?.ElementId ?? throw new ProcessException("Current task element ID is null");

        var events = new List<InstanceEvent>();

        ProcessState oldProcessState = new()
        {
            Started = process.Started,
            CurrentTask = process.CurrentTask,
            StartEvent = process.StartEvent,
        };

        if (_processReader.IsProcessTask(currentTaskId))
        {
            events.Add(CreateInstanceEvent(GetLeaveEventType(action), instance, oldProcessState, user, now));
        }

        ProcessState newProcessState = new() { Started = process.Started, StartEvent = process.StartEvent };
        string nextElementId = nextElement.Id;

        if (_processReader.IsEndEvent(nextElementId))
        {
            using var endActivity = _telemetry?.StartProcessEndActivity(instance);

            newProcessState.CurrentTask = null;
            newProcessState.Ended = now;
            newProcessState.EndEvent = nextElementId;

            events.Add(
                CreateInstanceEvent(InstanceEventType.process_EndEvent.ToString(), instance, newProcessState, user, now)
            );
            // Submit event (to support Altinn2 SBL)
            events.Add(
                CreateInstanceEvent(InstanceEventType.Submited.ToString(), instance, newProcessState, user, now)
            );
        }
        else if (_processReader.IsProcessTask(nextElementId))
        {
            var task = nextElement as ProcessTask;
            newProcessState.CurrentTask = new ProcessElementInfo
            {
                Flow = GetNextFlow(process.CurrentTask),
                ElementId = nextElementId,
                Name = nextElement.Name,
                Started = now,
                AltinnTaskType = task?.ExtensionElements?.TaskExtension?.TaskType,
                FlowType = action is "reject"
                    ? ProcessSequenceFlowType.AbandonCurrentMoveToNext.ToString()
                    : ProcessSequenceFlowType.CompleteCurrentMoveToNext.ToString(),
            };

            events.Add(
                CreateInstanceEvent(
                    InstanceEventType.process_StartTask.ToString(),
                    instance,
                    newProcessState,
                    user,
                    now
                )
            );
        }

        return new ProcessStateChange
        {
            OldProcessState = oldProcessState,
            NewProcessState = newProcessState,
            Events = events,
        };
    }

    private static string GetLeaveEventType(string? action) =>
        action is "reject"
            ? InstanceEventType.process_AbandonTask.ToString()
            : InstanceEventType.process_EndTask.ToString();

    /// <summary>
    /// A gateway loop back to the same task still creates a new task visit.
    /// </summary>
    internal static int GetNextFlow(ProcessElementInfo? currentTask) => (currentTask?.Flow ?? 0) + 1;

    internal static InstanceEvent CreateInstanceEvent(
        string eventType,
        Instance instance,
        ProcessState processInfo,
        PlatformUser user,
        DateTime now
    )
    {
        return new InstanceEvent
        {
            InstanceId = instance.Id,
            InstanceOwnerPartyId = instance.InstanceOwner.PartyId,
            EventType = eventType,
            Created = now,
            User = user,
            ProcessInfo = processInfo,
        };
    }

    internal static PlatformUser CreatePlatformUser(Actor actor)
    {
        if (actor.UserId is int userId)
        {
            var platformUser = new PlatformUser
            {
                UserId = userId,
                NationalIdentityNumber = actor.NationalIdentityNumber,
            };
            if (actor.AuthenticationLevel is int authenticationLevel)
            {
                platformUser.AuthenticationLevel = authenticationLevel;
            }
            return platformUser;
        }

        if (actor.SystemUserId is Guid systemUserId)
        {
            var platformUser = new PlatformUser
            {
                SystemUserId = systemUserId,
                SystemUserOwnerOrgNo = actor.SystemUserOwnerOrgNo,
                SystemUserName = actor.SystemUserName,
            };
            if (actor.AuthenticationLevel is int authenticationLevel)
            {
                platformUser.AuthenticationLevel = authenticationLevel;
            }
            return platformUser;
        }

        var orgPlatformUser = new PlatformUser { OrgId = actor.OrgId };
        if (actor.AuthenticationLevel is int orgAuthenticationLevel)
        {
            orgPlatformUser.AuthenticationLevel = orgAuthenticationLevel;
        }
        return orgPlatformUser;
    }
}
