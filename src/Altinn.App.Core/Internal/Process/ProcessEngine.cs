using System.Diagnostics;
using System.Security.Claims;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
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
    private readonly IProfileClient _profileClient;
    private readonly IProcessNavigator _processNavigator;
    private readonly IProcessEventHandlerDelegator _processEventHandlerDelegator;
    private readonly IProcessEventDispatcher _processEventDispatcher;
    private readonly UserActionService _userActionService;
    private readonly Telemetry? _telemetry;
    private readonly IProcessTaskCleaner _processTaskCleaner;
    private readonly IDataClient _dataClient;
    private readonly IInstanceClient _instanceClient;
    private readonly ModelSerializationService _modelSerialization;
    private readonly IAppMetadata _appMetadata;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessEngine"/> class
    /// </summary>
    public ProcessEngine(
        IProcessReader processReader,
        IProfileClient profileClient,
        IProcessNavigator processNavigator,
        IProcessEventHandlerDelegator processEventsDelegator,
        IProcessEventDispatcher processEventDispatcher,
        IProcessTaskCleaner processTaskCleaner,
        UserActionService userActionService,
        IDataClient dataClient,
        IInstanceClient instanceClient,
        ModelSerializationService modelSerialization,
        IAppMetadata appMetadata,
        Telemetry? telemetry = null
    )
    {
        _processReader = processReader;
        _profileClient = profileClient;
        _processNavigator = processNavigator;
        _processEventHandlerDelegator = processEventsDelegator;
        _processEventDispatcher = processEventDispatcher;
        _processTaskCleaner = processTaskCleaner;
        _userActionService = userActionService;
        _dataClient = dataClient;
        _instanceClient = instanceClient;
        _modelSerialization = modelSerialization;
        _appMetadata = appMetadata;
        _telemetry = telemetry;
    }

    /// <inheritdoc/>
    public async Task<ProcessChangeResult> GenerateProcessStartEvents(ProcessStartRequest processStartRequest)
    {
        using var activity = _telemetry?.StartProcessStartActivity(processStartRequest.Instance);

        if (processStartRequest.Instance.Process != null)
        {
            var result = new ProcessChangeResult()
            {
                Success = false,
                ErrorMessage = "Process is already started. Use next.",
                ErrorType = ProcessErrorType.Conflict
            };
            activity?.SetProcessChangeResult(result);
            return result;
        }

        string? validStartElement = ProcessHelper.GetValidStartEventOrError(
            processStartRequest.StartEventId,
            _processReader.GetStartEventIds(),
            out ProcessError? startEventError
        );
        if (startEventError is not null)
        {
            var result = new ProcessChangeResult()
            {
                Success = false,
                ErrorMessage = "No matching startevent",
                ErrorType = ProcessErrorType.Conflict
            };
            activity?.SetProcessChangeResult(result);
            return result;
        }

        // TODO: assert can be removed when we improve nullability annotation in GetValidStartEventOrError
        Debug.Assert(
            validStartElement is not null,
            "validStartElement should always be nonnull when startEventError is null"
        );

        // start process
        ProcessStateChange? startChange = await ProcessStart(
            processStartRequest.Instance,
            validStartElement,
            processStartRequest.User
        );
        InstanceEvent? startEvent = startChange?.Events?[0].CopyValues();
        ProcessStateChange? nextChange = await ProcessNext(processStartRequest.Instance, processStartRequest.User);
        InstanceEvent? goToNextEvent = nextChange?.Events?[0].CopyValues();
        List<InstanceEvent> events = [];
        if (startEvent is not null)
        {
            events.Add(startEvent);
        }

        if (goToNextEvent is not null)
        {
            events.Add(goToNextEvent);
        }

        ProcessStateChange processStateChange =
            new()
            {
                OldProcessState = startChange?.OldProcessState,
                NewProcessState = nextChange?.NewProcessState,
                Events = events
            };

        _telemetry?.ProcessStarted();

        var changeResult = new ProcessChangeResult() { Success = true, ProcessStateChange = processStateChange };
        activity?.SetProcessChangeResult(changeResult);
        return changeResult;
    }

    /// <inheritdoc/>
    public async Task<ProcessChangeResult> Next(ProcessNextRequest request)
    {
        using var activity = _telemetry?.StartProcessNextActivity(request.Instance, request.Action);

        Instance instance = request.Instance;
        string? currentElementId = instance.Process?.CurrentTask?.ElementId;

        if (currentElementId == null)
        {
            var result = new ProcessChangeResult()
            {
                Success = false,
                ErrorMessage = $"Instance does not have current task information!",
                ErrorType = ProcessErrorType.Conflict
            };
            activity?.SetProcessChangeResult(result);
            return result;
        }

        // Removes existing/stale data elements previously generated from this task
        // TODO: Move this logic to ProcessTaskInitializer.Initialize once the authentication model supports a service/app user with the appropriate scopes
        await _processTaskCleaner.RemoveAllDataElementsGeneratedFromTask(instance, currentElementId);

        int? userId = request.User.GetUserIdAsInt();
        IUserAction? actionHandler = _userActionService.GetActionHandler(request.Action);
        var cachedDataMutator = new InstanceDataUnitOfWork(
            instance,
            _dataClient,
            _instanceClient,
            await _appMetadata.GetApplicationMetadata(),
            _modelSerialization
        );

        UserActionResult actionResult = actionHandler is null
            ? UserActionResult.SuccessResult()
            : await actionHandler.HandleAction(new UserActionContext(cachedDataMutator, userId));

        if (actionResult.ResultType != ResultType.Success)
        {
            var result = new ProcessChangeResult()
            {
                Success = false,
                ErrorMessage = $"Action handler for action {request.Action} failed!",
                ErrorType = actionResult.ErrorType
            };
            activity?.SetProcessChangeResult(result);
            return result;
        }

        var changes = cachedDataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await cachedDataMutator.UpdateInstanceData(changes);
        await cachedDataMutator.SaveChanges(changes);

        // TODO: consider using the same cachedDataMutator for the rest of the process to avoid refetching data from storage

        ProcessStateChange? nextResult = await HandleMoveToNext(instance, request.User, request.Action);

        if (nextResult?.NewProcessState?.Ended is not null)
        {
            _telemetry?.ProcessEnded(nextResult);
        }

        var changeResult = new ProcessChangeResult() { Success = true, ProcessStateChange = nextResult };
        activity?.SetProcessChangeResult(changeResult);
        return changeResult;
    }

    /// <inheritdoc/>
    public async Task<Instance> HandleEventsAndUpdateStorage(
        Instance instance,
        Dictionary<string, string>? prefill,
        List<InstanceEvent>? events
    )
    {
        using (var activity = _telemetry?.StartProcessHandleEventsActivity(instance))
        {
            await _processEventHandlerDelegator.HandleEvents(instance, prefill, events);
        }
        using (var activity = _telemetry?.StartProcessStoreEventsActivity(instance))
        {
            return await _processEventDispatcher.DispatchToStorage(instance, events);
        }
    }

    /// <summary>
    /// Does not save process. Instance object is updated.
    /// </summary>
    private async Task<ProcessStateChange?> ProcessStart(Instance instance, string startEvent, ClaimsPrincipal user)
    {
        if (instance.Process != null)
        {
            return null;
        }

        DateTime now = DateTime.UtcNow;
        ProcessState startState =
            new()
            {
                Started = now,
                StartEvent = startEvent,
                CurrentTask = new ProcessElementInfo { Flow = 1, ElementId = startEvent }
            };

        instance.Process = startState;

        List<InstanceEvent> events =
        [
            await GenerateProcessChangeEvent(InstanceEventType.process_StartEvent.ToString(), instance, now, user)
        ];

        // ! TODO: should probably improve nullability handling in the next major version
        return new ProcessStateChange
        {
            OldProcessState = null!,
            NewProcessState = startState,
            Events = events,
        };
    }

    /// <summary>
    /// Moves instance's process to nextElement id. Returns the instance together with process events.
    /// </summary>
    private async Task<ProcessStateChange?> ProcessNext(
        Instance instance,
        ClaimsPrincipal userContext,
        string? action = null
    )
    {
        if (instance.Process == null)
        {
            return null;
        }

        ProcessStateChange result =
            new()
            {
                OldProcessState = new ProcessState()
                {
                    Started = instance.Process.Started,
                    CurrentTask = instance.Process.CurrentTask,
                    StartEvent = instance.Process.StartEvent
                },
                Events = await MoveProcessToNext(instance, userContext, action),
                NewProcessState = instance.Process
            };
        return result;
    }

    private async Task<List<InstanceEvent>> MoveProcessToNext(
        Instance instance,
        ClaimsPrincipal user,
        string? action = null
    )
    {
        List<InstanceEvent> events = [];

        ProcessState previousState = instance.Process.Copy();
        ProcessState currentState = instance.Process;
        string? previousElementId = currentState.CurrentTask?.ElementId;

        ProcessElement? nextElement = await _processNavigator.GetNextTask(
            instance,
            instance.Process.CurrentTask.ElementId,
            action
        );
        DateTime now = DateTime.UtcNow;
        // ending previous element if task
        if (_processReader.IsProcessTask(previousElementId))
        {
            instance.Process = previousState;
            var eventType = InstanceEventType.process_EndTask.ToString();
            if (action is "reject")
            {
                eventType = InstanceEventType.process_AbandonTask.ToString();
            }

            events.Add(await GenerateProcessChangeEvent(eventType, instance, now, user));
            instance.Process = currentState;
        }

        // ending process if next element is end event
        if (nextElement is null)
        {
            throw new ProcessException("Next process element was unexpectedly null");
        }
        var nextElementId = nextElement.Id;
        if (_processReader.IsEndEvent(nextElementId))
        {
            using var activity = _telemetry?.StartProcessEndActivity(instance);

            currentState.CurrentTask = null;
            currentState.Ended = now;
            currentState.EndEvent = nextElementId;

            events.Add(
                await GenerateProcessChangeEvent(InstanceEventType.process_EndEvent.ToString(), instance, now, user)
            );

            // add submit event (to support Altinn2 SBL)
            events.Add(await GenerateProcessChangeEvent(InstanceEventType.Submited.ToString(), instance, now, user));
        }
        else if (_processReader.IsProcessTask(nextElementId))
        {
            var task = nextElement as ProcessTask;
            currentState.CurrentTask = new ProcessElementInfo
            {
                Flow = currentState.CurrentTask?.Flow + 1,
                ElementId = nextElementId,
                Name = nextElement.Name,
                Started = now,
                AltinnTaskType = task?.ExtensionElements?.TaskExtension?.TaskType,
                FlowType = action is "reject"
                    ? ProcessSequenceFlowType.AbandonCurrentMoveToNext.ToString()
                    : ProcessSequenceFlowType.CompleteCurrentMoveToNext.ToString(),
                Validated = null,
            };

            events.Add(
                await GenerateProcessChangeEvent(InstanceEventType.process_StartTask.ToString(), instance, now, user)
            );
        }

        // current state points to the instance's process object. The following statement is unnecessary, but clarifies logic.
        instance.Process = currentState;

        return events;
    }

    private async Task<InstanceEvent> GenerateProcessChangeEvent(
        string eventType,
        Instance instance,
        DateTime now,
        ClaimsPrincipal user
    )
    {
        int? userId = user.GetUserIdAsInt();
        InstanceEvent instanceEvent =
            new()
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
            UserProfile? up = await _profileClient.GetUserProfile((int)userId);
            instanceEvent.User.NationalIdentityNumber = up?.Party.SSN; //TODO: Should we throw error if both OrgId and userProfile is null?
        }

        return instanceEvent;
    }

    private async Task<ProcessStateChange?> HandleMoveToNext(Instance instance, ClaimsPrincipal user, string? action)
    {
        ProcessStateChange? processStateChange = await ProcessNext(instance, user, action);

        if (processStateChange == null)
        {
            return processStateChange;
        }

        instance = await HandleEventsAndUpdateStorage(instance, null, processStateChange.Events);
        await _processEventDispatcher.RegisterEventWithEventsComponent(instance);

        return processStateChange;
    }
}
