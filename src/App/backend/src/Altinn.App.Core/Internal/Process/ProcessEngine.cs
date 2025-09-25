using System.Diagnostics;
using System.Diagnostics.CodeAnalysis;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Helpers;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.Base;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.App.Core.Internal.Process;

/// <summary>
/// Default implementation of the <see cref="IProcessEngine"/>
/// </summary>
public class ProcessEngine : IProcessEngine
{
    private readonly IProcessReader _processReader;
    private readonly IProcessNavigator _processNavigator;
    private readonly IProcessEventHandlerDelegator _processEventHandlerDelegator;
    private readonly IProcessEventDispatcher _processEventDispatcher;
    private readonly UserActionService _userActionService;
    private readonly Telemetry? _telemetry;
    private readonly IAuthenticationContext _authenticationContext;
    private readonly InstanceDataUnitOfWorkInitializer _instanceDataUnitOfWorkInitializer;
    private readonly AppImplementationFactory _appImplementationFactory;

    /// <summary>
    /// Initializes a new instance of the <see cref="ProcessEngine"/> class
    /// </summary>
    public ProcessEngine(
        IProcessReader processReader,
        IProcessNavigator processNavigator,
        IProcessEventHandlerDelegator processEventsDelegator,
        IProcessEventDispatcher processEventDispatcher,
        UserActionService userActionService,
        IAuthenticationContext authenticationContext,
        IServiceProvider serviceProvider,
        Telemetry? telemetry = null
    )
    {
        _processReader = processReader;
        _processNavigator = processNavigator;
        _processEventHandlerDelegator = processEventsDelegator;
        _processEventDispatcher = processEventDispatcher;
        _userActionService = userActionService;
        _telemetry = telemetry;
        _authenticationContext = authenticationContext;
        _appImplementationFactory = serviceProvider.GetRequiredService<AppImplementationFactory>();
        _instanceDataUnitOfWorkInitializer = serviceProvider.GetRequiredService<InstanceDataUnitOfWorkInitializer>();
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
                ErrorType = ProcessErrorType.Conflict,
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
                ErrorType = ProcessErrorType.Conflict,
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
        ProcessStateChange? startChange = await ProcessStart(processStartRequest.Instance, validStartElement);
        InstanceEvent? startEvent = startChange?.Events?[0].CopyValues();
        ProcessStateChange? nextChange = await ProcessNext(processStartRequest.Instance);
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

        ProcessStateChange processStateChange = new()
        {
            OldProcessState = startChange?.OldProcessState,
            NewProcessState = nextChange?.NewProcessState,
            Events = events,
        };

        _telemetry?.ProcessStarted();

        var changeResult = new ProcessChangeResult() { Success = true, ProcessStateChange = processStateChange };
        activity?.SetProcessChangeResult(changeResult);
        return changeResult;
    }

    /// <inheritdoc/>
    public async Task<UserActionResult> HandleUserAction(ProcessNextRequest request, CancellationToken ct)
    {
        Instance instance = request.Instance;

        var currentAuth = _authenticationContext.Current;
        IUserAction? actionHandler = _userActionService.GetActionHandler(request.Action);

        if (actionHandler is null)
            return UserActionResult.SuccessResult();

        var cachedDataMutator = await _instanceDataUnitOfWorkInitializer.Init(instance, taskId: null, request.Language);

        int? userId = currentAuth switch
        {
            Authenticated.User auth => auth.UserId,
            _ => null,
        };

        UserActionResult actionResult = await actionHandler.HandleAction(
            new UserActionContext(
                cachedDataMutator,
                userId,
                language: request.Language,
                authentication: currentAuth,
                onBehalfOf: request.ActionOnBehalfOf,
                cancellationToken: ct
            )
        );

        if (actionResult.ResultType == ResultType.Failure)
        {
            return actionResult;
        }

        if (cachedDataMutator.HasAbandonIssues)
        {
            throw new Exception(
                "Abandon issues found in data elements. Abandon issues should be handled by the action handler."
            );
        }

        var changes = cachedDataMutator.GetDataElementChanges(initializeAltinnRowId: false);
        await cachedDataMutator.UpdateInstanceData(changes);
        await cachedDataMutator.SaveChanges(changes);

        return actionResult;
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
                ErrorType = ProcessErrorType.Conflict,
            };
            activity?.SetProcessChangeResult(result);
            return result;
        }

        MoveToNextResult moveToNextResult = await HandleMoveToNext(instance, request.Action);

        if (moveToNextResult.IsEndEvent)
        {
            _telemetry?.ProcessEnded(moveToNextResult.ProcessStateChange);
            await RunAppDefinedProcessEndHandlers(instance, moveToNextResult.ProcessStateChange?.Events);
        }

        var changeResult = new ProcessChangeResult()
        {
            Success = true,
            ProcessStateChange = moveToNextResult.ProcessStateChange,
        };
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
    private async Task<ProcessStateChange?> ProcessStart(Instance instance, string startEvent)
    {
        if (instance.Process != null)
        {
            return null;
        }

        DateTime now = DateTime.UtcNow;
        ProcessState startState = new()
        {
            Started = now,
            StartEvent = startEvent,
            CurrentTask = new ProcessElementInfo { Flow = 1, ElementId = startEvent },
        };

        instance.Process = startState;

        List<InstanceEvent> events =
        [
            await GenerateProcessChangeEvent(InstanceEventType.process_StartEvent.ToString(), instance, now),
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
    private async Task<ProcessStateChange?> ProcessNext(Instance instance, string? action = null)
    {
        if (instance.Process == null)
        {
            return null;
        }

        ProcessStateChange result = new()
        {
            OldProcessState = new ProcessState()
            {
                Started = instance.Process.Started,
                CurrentTask = instance.Process.CurrentTask,
                StartEvent = instance.Process.StartEvent,
            },
            Events = await MoveProcessToNext(instance, action),
            NewProcessState = instance.Process,
        };
        return result;
    }

    private async Task<List<InstanceEvent>> MoveProcessToNext(Instance instance, string? action = null)
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

            events.Add(await GenerateProcessChangeEvent(eventType, instance, now));
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

            events.Add(await GenerateProcessChangeEvent(InstanceEventType.process_EndEvent.ToString(), instance, now));

            // add submit event (to support Altinn2 SBL)
            events.Add(await GenerateProcessChangeEvent(InstanceEventType.Submited.ToString(), instance, now));
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
            };

            events.Add(await GenerateProcessChangeEvent(InstanceEventType.process_StartTask.ToString(), instance, now));
        }

        // current state points to the instance's process object. The following statement is unnecessary, but clarifies logic.
        instance.Process = currentState;

        return events;
    }

    private async Task<InstanceEvent> GenerateProcessChangeEvent(string eventType, Instance instance, DateTime now)
    {
        var currentAuth = _authenticationContext.Current;
        PlatformUser user;
        switch (currentAuth)
        {
            case Authenticated.User auth:
            {
                var details = await auth.LoadDetails(validateSelectedParty: true);
                user = new PlatformUser
                {
                    UserId = auth.UserId,
                    AuthenticationLevel = auth.AuthenticationLevel,
                    NationalIdentityNumber = details.Profile.Party.SSN,
                };
                break;
            }
            case Authenticated.Org:
            {
                user = new PlatformUser { }; // TODO: what do we do here?
                break;
            }
            case Authenticated.ServiceOwner auth:
            {
                user = new PlatformUser { OrgId = auth.Name, AuthenticationLevel = auth.AuthenticationLevel };
                break;
            }
            case Authenticated.SystemUser auth:
            {
                user = new PlatformUser
                {
                    SystemUserId = auth.SystemUserId[0],
                    SystemUserOwnerOrgNo = auth.SystemUserOrgNr.Get(Models.OrganisationNumberFormat.Local),
                    SystemUserName = null, // TODO: will get this name later when a lookup API is implemented or the name is passed in token
                    AuthenticationLevel = auth.AuthenticationLevel,
                };
                break;
            }
            default:
                throw new Exception($"Unknown authentication context: {currentAuth.GetType().Name}");
        }

        InstanceEvent instanceEvent = new()
        {
            InstanceId = instance.Id,
            InstanceOwnerPartyId = instance.InstanceOwner.PartyId,
            EventType = eventType,
            Created = now,
            User = user,
            ProcessInfo = instance.Process,
        };

        return instanceEvent;
    }

    private async Task<MoveToNextResult> HandleMoveToNext(Instance instance, string? action)
    {
        ProcessStateChange? processStateChange = await ProcessNext(instance, action);

        if (processStateChange is null)
        {
            return new MoveToNextResult(instance, null);
        }

        instance = await HandleEventsAndUpdateStorage(instance, null, processStateChange.Events);
        await _processEventDispatcher.RegisterEventWithEventsComponent(instance);

        return new MoveToNextResult(instance, processStateChange);
    }

    /// <summary>
    /// Runs IProcessEnd implementations defined in the app.
    /// </summary>
    private async Task RunAppDefinedProcessEndHandlers(Instance instance, List<InstanceEvent>? events)
    {
        var processEnds = _appImplementationFactory.GetAll<IProcessEnd>().ToList();
        if (processEnds.Count is 0)
            return;

        using var mainActivity = _telemetry?.StartProcessEndHandlersActivity(instance);

        foreach (IProcessEnd processEnd in processEnds)
        {
            using var nestedActivity = _telemetry?.StartProcessEndHandlerActivity(instance, processEnd);
            await processEnd.End(instance, events);
        }
    }

    private sealed record MoveToNextResult(Instance Instance, ProcessStateChange? ProcessStateChange)
    {
        [MemberNotNullWhen(true, nameof(ProcessStateChange))]
        public bool IsEndEvent => ProcessStateChange?.NewProcessState?.Ended is not null;
    };
}
