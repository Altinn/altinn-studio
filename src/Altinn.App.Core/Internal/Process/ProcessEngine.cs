using System.Security.Claims;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Interface;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.App.Core.Models;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Default implementation of the <see cref="IProcessEngine"/>
/// </summary>
public class ProcessEngine : IProcessEngine
{
    private readonly IProcessReader _processReader;
    private readonly IProfile _profileService;
    private readonly IProcessNavigator _processNavigator;
    private readonly IProcessEventDispatcher _processEventDispatcher;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessEngine"/> class
    /// </summary>
    /// <param name="processReader"></param>
    /// <param name="profileService"></param>
    /// <param name="processNavigator"></param>
    /// <param name="processEventDispatcher"></param>
    public ProcessEngine(
        IProcessReader processReader,
        IProfile profileService,
        IProcessNavigator processNavigator,
        IProcessEventDispatcher processEventDispatcher)
    {
        _processReader = processReader;
        _profileService = profileService;
        _processNavigator = processNavigator;
        _processEventDispatcher = processEventDispatcher;
    }

    /// <inheritdoc/>
    public async Task<ProcessChangeResult> StartProcess(ProcessStartRequest processStartRequest)
    {
        if (processStartRequest.Instance.Process != null)
        {
            return new ProcessChangeResult()
            {
                Success = false,
                ErrorMessage = "Process is already started. Use next.",
                ErrorType = ProcessErrorType.Conflict
            };
        }

        string? validStartElement = ProcessHelper.GetValidStartEventOrError(processStartRequest.StartEventId, _processReader.GetStartEventIds(), out ProcessError? startEventError);
        if (startEventError != null)
        {
            return new ProcessChangeResult()
            {
                Success = false,
                ErrorMessage = "No matching startevent",
                ErrorType = ProcessErrorType.Conflict
            };
        }

        // start process
        ProcessStateChange? startChange = await ProcessStart(processStartRequest.Instance, validStartElement!, processStartRequest.User);
        InstanceEvent? startEvent = startChange?.Events?.First().CopyValues();
        ProcessStateChange? nextChange = await ProcessNext(processStartRequest.Instance, processStartRequest.User);
        InstanceEvent? goToNextEvent = nextChange?.Events?.First().CopyValues();
        List<InstanceEvent> events = new List<InstanceEvent>();
        if (startEvent is not null)
        {
            events.Add(startEvent);
        }
        if (goToNextEvent is not null)
        {
            events.Add(goToNextEvent);
        }
        ProcessStateChange processStateChange = new ProcessStateChange
        {
            OldProcessState = startChange?.OldProcessState,
            NewProcessState = nextChange?.NewProcessState,
            Events = events
        };

        if (!processStartRequest.Dryrun)
        {
            await _processEventDispatcher.UpdateProcessAndDispatchEvents(processStartRequest.Instance, processStartRequest.Prefill, events);
        }

        return new ProcessChangeResult()
        {
            Success = true,
            ProcessStateChange = processStateChange
        };
    }
     
    /// <inheritdoc/>
    public async Task<ProcessChangeResult> Next(ProcessNextRequest request)
    {
        var instance = request.Instance;
        string? currentElementId = instance.Process?.CurrentTask?.ElementId;

        if (currentElementId == null)
        {
            return new ProcessChangeResult()
            {
                Success = false,
                ErrorMessage = $"Instance does not have current task information!",
                ErrorType = ProcessErrorType.Conflict
            };
        }

        var nextResult = await HandleMoveToNext(instance, request.User, request.Action);

        return new ProcessChangeResult()
        {
            Success = true,
            ProcessStateChange = nextResult
        };
    }

    /// <inheritdoc/>
    public async Task<Instance> UpdateInstanceAndRerunEvents(ProcessStartRequest startRequest, List<InstanceEvent>? events)
    {
        return await _processEventDispatcher.UpdateProcessAndDispatchEvents(startRequest.Instance, startRequest.Prefill, events);
    }

    /// <summary>
    /// Does not save process. Instance object is updated.
    /// </summary>
    private async Task<ProcessStateChange?> ProcessStart(Instance instance, string startEvent, ClaimsPrincipal user)
    {
        if (instance.Process == null)
        {
            DateTime now = DateTime.UtcNow;

            ProcessState startState = new ProcessState
            {
                Started = now,
                StartEvent = startEvent,
                CurrentTask = new ProcessElementInfo { Flow = 1, ElementId = startEvent}
            };

            instance.Process = startState;

            List<InstanceEvent> events = new List<InstanceEvent>
            {
                await GenerateProcessChangeEvent(InstanceEventType.process_StartEvent.ToString(), instance, now, user),
            };

            return new ProcessStateChange
            {
                OldProcessState = null!,
                NewProcessState = startState,
                Events = events,
            };
        }

        return null;
    }

    /// <summary>
    /// Moves instance's process to nextElement id. Returns the instance together with process events.
    /// </summary>
    private async Task<ProcessStateChange?> ProcessNext(Instance instance, ClaimsPrincipal userContext, string? action = null)
    {
        if (instance.Process != null)
        {
            ProcessStateChange result = new ProcessStateChange
            {
                OldProcessState = new ProcessState()
                {
                    Started = instance.Process.Started,
                    CurrentTask = instance.Process.CurrentTask,
                    StartEvent = instance.Process.StartEvent
                }
            };

            result.Events = await MoveProcessToNext(instance, userContext, action);
            result.NewProcessState = instance.Process;
            return result;
        }

        return null;
    }
    
    private async Task<List<InstanceEvent>> MoveProcessToNext(
        Instance instance,
        ClaimsPrincipal user,
        string? action = null)
    {
        List<InstanceEvent> events = new List<InstanceEvent>();

        ProcessState previousState = instance.Process.Copy();
        ProcessState currentState = instance.Process;
        string? previousElementId = currentState.CurrentTask?.ElementId;

        ProcessElement? nextElement = await _processNavigator.GetNextTask(instance, instance.Process.CurrentTask.ElementId, action);
        DateTime now = DateTime.UtcNow;
        // ending previous element if task
        if (_processReader.IsProcessTask(previousElementId))
        {
            instance.Process = previousState;
            string eventType = InstanceEventType.process_EndTask.ToString();
            if (action is "reject")
            {
                eventType = InstanceEventType.process_AbandonTask.ToString();
            }
            events.Add(await GenerateProcessChangeEvent(eventType, instance, now, user));
            instance.Process = currentState;
        }

        // ending process if next element is end event
        if (_processReader.IsEndEvent(nextElement?.Id))
        {
            currentState.CurrentTask = null;
            currentState.Ended = now;
            currentState.EndEvent = nextElement!.Id;

            events.Add(await GenerateProcessChangeEvent(InstanceEventType.process_EndEvent.ToString(), instance, now, user));

            // add submit event (to support Altinn2 SBL)
            events.Add(await GenerateProcessChangeEvent(InstanceEventType.Submited.ToString(), instance, now, user));
        }
        else if (_processReader.IsProcessTask(nextElement?.Id))
        {
            var task = nextElement as ProcessTask;
            currentState.CurrentTask = new ProcessElementInfo
            {
                Flow = currentState.CurrentTask?.Flow + 1,
                ElementId = nextElement!.Id,
                Name = nextElement!.Name,
                Started = now,
                AltinnTaskType = task?.ExtensionElements?.AltinnProperties?.TaskType,
                Validated = null,
            };

            events.Add(await GenerateProcessChangeEvent(InstanceEventType.process_StartTask.ToString(), instance, now, user));
        }

        // current state points to the instance's process object. The following statement is unnecessary, but clarifies logic.
        instance.Process = currentState;

        return events;
    }

    private async Task<InstanceEvent> GenerateProcessChangeEvent(string eventType, Instance instance, DateTime now, ClaimsPrincipal user)
    {
        int? userId = user.GetUserIdAsInt();
        InstanceEvent instanceEvent = new InstanceEvent
        {
            InstanceId = instance.Id,
            InstanceOwnerPartyId = instance.InstanceOwner.PartyId,
            EventType = eventType,
            Created = now,
            User = new PlatformUser
            {
                UserId = userId,
                AuthenticationLevel = user.GetAuthenticationLevel(),
                OrgId = user.GetOrg()
            },
            ProcessInfo = instance.Process,
        };

        if (string.IsNullOrEmpty(instanceEvent.User.OrgId) && userId != null)
        {
            UserProfile up = await _profileService.GetUserProfile((int)userId);
            instanceEvent.User.NationalIdentityNumber = up.Party.SSN;
        }

        return instanceEvent;
    }
    
    private async Task<ProcessStateChange?> HandleMoveToNext(Instance instance, ClaimsPrincipal user, string? action)
    {
        var processStateChange = await ProcessNext(instance, user, action);
        if (processStateChange != null)
        {
            instance = await _processEventDispatcher.UpdateProcessAndDispatchEvents(instance, new Dictionary<string, string>(), processStateChange.Events);

            await _processEventDispatcher.RegisterEventWithEventsComponent(instance);
        }

        return processStateChange;
    }
}
