using System.Security.Claims;
using System.Security.Cryptography.X509Certificates;
using Altinn.App.Common.Tests;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Profile;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Register.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Constants;
using FluentAssertions;
using Moq;
using Newtonsoft.Json;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.Internal.Process;

public sealed class ProcessEngineTest : IDisposable
{
    private readonly ITestOutputHelper _output;
    private static readonly int _instanceOwnerPartyId = 1337;
    private static readonly Guid _instanceGuid = new("00000000-DEAD-BABE-0000-001230000000");
    private static readonly string _instanceId = $"{_instanceOwnerPartyId}/{_instanceGuid}";
    private readonly Mock<IProcessReader> _processReaderMock = new();
    private readonly Mock<IProfileClient> _profileMock = new(MockBehavior.Strict);
    private readonly Mock<IProcessNavigator> _processNavigatorMock = new(MockBehavior.Strict);
    private readonly Mock<IProcessEventHandlerDelegator> _processEventHandlingDelegatorMock = new();
    private readonly Mock<IProcessEventDispatcher> _processEventDispatcherMock = new();
    private readonly Mock<IProcessTaskCleaner> _processTaskCleanerMock = new();
    private readonly Mock<IDataClient> _dataClientMock = new(MockBehavior.Strict);
    private readonly Mock<IInstanceClient> _instanceClientMock = new(MockBehavior.Strict);
    private readonly Mock<IAppModel> _appModelMock = new(MockBehavior.Strict);
    private readonly Mock<IAppMetadata> _appMetadataMock = new(MockBehavior.Strict);

    public ProcessEngineTest(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public async Task StartProcess_returns_unsuccessful_when_process_already_started()
    {
        ProcessEngine processEngine = GetProcessEngine();
        Instance instance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            Process = new ProcessState() { CurrentTask = new ProcessElementInfo() { ElementId = "Task_1" } }
        };
        ProcessStartRequest processStartRequest = new ProcessStartRequest() { Instance = instance };
        ProcessChangeResult result = await processEngine.GenerateProcessStartEvents(processStartRequest);
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Be("Process is already started. Use next.");
        result.ErrorType.Should().Be(ProcessErrorType.Conflict);
    }

    [Fact]
    public async Task StartProcess_returns_unsuccessful_when_no_matching_startevent_found()
    {
        _processReaderMock.Setup(r => r.GetStartEventIds()).Returns(new List<string>() { "StartEvent_1" });
        ProcessEngine processEngine = GetProcessEngine(setupProcessReaderMock: false);
        Instance instance = new Instance() { Id = _instanceId, AppId = "org/app", };
        ProcessStartRequest processStartRequest = new ProcessStartRequest()
        {
            Instance = instance,
            StartEventId = "NotTheStartEventYouAreLookingFor"
        };
        ProcessChangeResult result = await processEngine.GenerateProcessStartEvents(processStartRequest);
        _processReaderMock.Verify(r => r.GetStartEventIds(), Times.Once);
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Be("No matching startevent");
        result.ErrorType.Should().Be(ProcessErrorType.Conflict);
    }

    [Fact]
    public async Task StartProcess_starts_process_and_moves_to_first_task_without_event_dispatch_when_dryrun()
    {
        ProcessEngine processEngine = GetProcessEngine();
        Instance instance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" }
        };
        ClaimsPrincipal user =
            new(
                new ClaimsIdentity(
                    new List<Claim>()
                    {
                        new(AltinnCoreClaimTypes.UserId, "1337"),
                        new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
                        new(AltinnCoreClaimTypes.Org, "tdd"),
                    }
                )
            );
        ProcessStartRequest processStartRequest = new ProcessStartRequest() { Instance = instance, User = user };
        ProcessChangeResult result = await processEngine.GenerateProcessStartEvents(processStartRequest);
        _processReaderMock.Verify(r => r.GetStartEventIds(), Times.Once);
        _processReaderMock.Verify(r => r.IsProcessTask("StartEvent_1"), Times.Once);
        _processReaderMock.Verify(r => r.IsEndEvent("Task_1"), Times.Once);
        _processReaderMock.Verify(r => r.IsProcessTask("Task_1"), Times.Once);
        _processNavigatorMock.Verify(n => n.GetNextTask(It.IsAny<Instance>(), "StartEvent_1", null), Times.Once);
        result.Success.Should().BeTrue();
    }

    [Fact]
    public async Task StartProcess_starts_process_and_moves_to_first_task()
    {
        TelemetrySink telemetrySink = new();
        ProcessEngine processEngine = GetProcessEngine(telemetrySink: telemetrySink);
        Instance instance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            Data = [],
        };
        ClaimsPrincipal user =
            new(
                new ClaimsIdentity(
                    new List<Claim>()
                    {
                        new(AltinnCoreClaimTypes.UserId, "1337"),
                        new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
                        new(AltinnCoreClaimTypes.Org, "tdd"),
                    }
                )
            );
        ProcessStartRequest processStartRequest = new ProcessStartRequest() { Instance = instance, User = user };
        ProcessChangeResult result = await processEngine.GenerateProcessStartEvents(processStartRequest);
        await processEngine.HandleEventsAndUpdateStorage(instance, null, result.ProcessStateChange?.Events);
        _processReaderMock.Verify(r => r.GetStartEventIds(), Times.Once);
        _processReaderMock.Verify(r => r.IsProcessTask("StartEvent_1"), Times.Once);
        _processReaderMock.Verify(r => r.IsEndEvent("Task_1"), Times.Once);
        _processReaderMock.Verify(r => r.IsProcessTask("Task_1"), Times.Once);
        _processNavigatorMock.Verify(n => n.GetNextTask(It.IsAny<Instance>(), "StartEvent_1", null), Times.Once);
        var expectedInstance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            Data = [],
            Process = new ProcessState()
            {
                CurrentTask = new ProcessElementInfo()
                {
                    ElementId = "Task_1",
                    Flow = 2,
                    AltinnTaskType = "data",
                    FlowType = ProcessSequenceFlowType.CompleteCurrentMoveToNext.ToString(),
                    Name = "Utfylling"
                },
                StartEvent = "StartEvent_1"
            }
        };
        var expectedInstanceEvents = new List<InstanceEvent>()
        {
            new()
            {
                InstanceId = $"{_instanceOwnerPartyId}/{_instanceGuid}",
                EventType = InstanceEventType.process_StartEvent.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    OrgId = "tdd",
                    AuthenticationLevel = 2
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "StartEvent_1",
                        Flow = 1,
                        Validated = new() { CanCompleteTask = false }
                    }
                }
            },
            new()
            {
                InstanceId = $"{_instanceOwnerPartyId}/{_instanceGuid}",
                EventType = InstanceEventType.process_StartTask.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    OrgId = "tdd",
                    AuthenticationLevel = 2,
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_1",
                        Name = "Utfylling",
                        AltinnTaskType = "data",
                        Flow = 2,
                        Validated = new() { CanCompleteTask = false }
                    }
                }
            }
        };

        _processEventHandlingDelegatorMock.Verify(d =>
            d.HandleEvents(
                It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
                It.IsAny<Dictionary<string, string>>(),
                It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))
            )
        );

        _processEventDispatcherMock.Verify(d =>
            d.DispatchToStorage(
                It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
                It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))
            )
        );

        result.Success.Should().BeTrue();

        await Verify(telemetrySink.GetSnapshot());
    }

    [Fact]
    public async Task StartProcess_starts_process_and_moves_to_first_task_with_prefill()
    {
        ProcessEngine processEngine = GetProcessEngine();
        Instance instance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            Data = [],
        };
        ClaimsPrincipal user =
            new(
                new ClaimsIdentity(
                    new List<Claim>()
                    {
                        new(AltinnCoreClaimTypes.UserId, "1337"),
                        new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
                        new(AltinnCoreClaimTypes.Org, "tdd"),
                    }
                )
            );
        var prefill = new Dictionary<string, string>() { { "test", "test" } };
        ProcessStartRequest processStartRequest = new ProcessStartRequest()
        {
            Instance = instance,
            User = user,
            Prefill = prefill
        };
        ProcessChangeResult result = await processEngine.GenerateProcessStartEvents(processStartRequest);
        await processEngine.HandleEventsAndUpdateStorage(instance, prefill, result.ProcessStateChange?.Events);
        _processReaderMock.Verify(r => r.GetStartEventIds(), Times.Once);
        _processReaderMock.Verify(r => r.IsProcessTask("StartEvent_1"), Times.Once);
        _processReaderMock.Verify(r => r.IsEndEvent("Task_1"), Times.Once);
        _processReaderMock.Verify(r => r.IsProcessTask("Task_1"), Times.Once);
        _processNavigatorMock.Verify(n => n.GetNextTask(It.IsAny<Instance>(), "StartEvent_1", null), Times.Once);
        var expectedInstance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            Data = [],
            Process = new ProcessState()
            {
                CurrentTask = new ProcessElementInfo()
                {
                    ElementId = "Task_1",
                    Flow = 2,
                    AltinnTaskType = "data",
                    FlowType = ProcessSequenceFlowType.CompleteCurrentMoveToNext.ToString(),
                    Name = "Utfylling"
                },
                StartEvent = "StartEvent_1"
            }
        };
        var expectedInstanceEvents = new List<InstanceEvent>()
        {
            new()
            {
                InstanceId = $"{_instanceOwnerPartyId}/{_instanceGuid}",
                EventType = InstanceEventType.process_StartEvent.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    OrgId = "tdd",
                    AuthenticationLevel = 2
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "StartEvent_1",
                        Flow = 1,
                        Validated = new() { CanCompleteTask = false }
                    }
                }
            },
            new()
            {
                InstanceId = $"{_instanceOwnerPartyId}/{_instanceGuid}",
                EventType = InstanceEventType.process_StartTask.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    OrgId = "tdd",
                    AuthenticationLevel = 2,
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_1",
                        Name = "Utfylling",
                        AltinnTaskType = "data",
                        Flow = 2,
                        Validated = new() { CanCompleteTask = false }
                    }
                }
            }
        };

        _processEventHandlingDelegatorMock.Verify(d =>
            d.HandleEvents(
                It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
                It.IsAny<Dictionary<string, string>>(),
                It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))
            )
        );

        _processEventDispatcherMock.Verify(d =>
            d.DispatchToStorage(
                It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
                It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(l, expectedInstanceEvents))
            )
        );

        result.Success.Should().BeTrue();
    }

    [Fact]
    public async Task Next_returns_unsuccessful_when_process_null()
    {
        ProcessEngine processEngine = GetProcessEngine();
        Instance instance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            Process = null
        };
        ProcessNextRequest processNextRequest = new ProcessNextRequest() { Instance = instance };
        ProcessChangeResult result = await processEngine.Next(processNextRequest);
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Be("Instance does not have current task information!");
        result.ErrorType.Should().Be(ProcessErrorType.Conflict);
    }

    [Fact]
    public async Task Next_returns_unsuccessful_when_process_currenttask_null()
    {
        ProcessEngine processEngine = GetProcessEngine();
        Instance instance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            Process = new ProcessState() { CurrentTask = null }
        };
        ProcessNextRequest processNextRequest = new ProcessNextRequest() { Instance = instance };
        ProcessChangeResult result = await processEngine.Next(processNextRequest);
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Be("Instance does not have current task information!");
        result.ErrorType.Should().Be(ProcessErrorType.Conflict);
    }

    [Fact]
    public async Task Next_returns_unsuccessful_unauthorized_when_action_handler_returns_errortype_Unauthorized()
    {
        var expectedInstance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            Data = [],
            Process = new ProcessState()
            {
                CurrentTask = null,
                StartEvent = "StartEvent_1",
                EndEvent = "EndEvent_1"
            }
        };
        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata("org/app"));
        Mock<IUserAction> userActionMock = new Mock<IUserAction>(MockBehavior.Strict);
        userActionMock.Setup(u => u.Id).Returns("sign");
        userActionMock
            .Setup(u => u.HandleAction(It.IsAny<UserActionContext>()))
            .ReturnsAsync(
                UserActionResult.FailureResult(
                    error: new ActionError() { Code = "NoUserId", Message = "User id is missing in token" },
                    errorType: ProcessErrorType.Unauthorized
                )
            );
        ProcessEngine processEngine = GetProcessEngine(
            updatedInstance: expectedInstance,
            userActions: [userActionMock.Object]
        );
        Instance instance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new() { PartyId = "1337" },
            Data = [],
            Process = new ProcessState()
            {
                StartEvent = "StartEvent_1",
                CurrentTask = new()
                {
                    ElementId = "Task_2",
                    AltinnTaskType = "confirmation",
                    Flow = 3,
                    Validated = new() { CanCompleteTask = true }
                }
            }
        };
        ClaimsPrincipal user =
            new(new ClaimsIdentity(new List<Claim>() { new(AltinnCoreClaimTypes.AuthenticationLevel, "2"), }));
        ProcessNextRequest processNextRequest = new ProcessNextRequest()
        {
            Instance = instance,
            User = user,
            Action = "sign"
        };
        ProcessChangeResult result = await processEngine.Next(processNextRequest);
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Be($"Action handler for action sign failed!");
        result.ErrorType.Should().Be(ProcessErrorType.Unauthorized);
    }

    [Fact]
    public async Task Next_moves_instance_to_next_task_and_produces_instanceevents()
    {
        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata("org/app"));
        var expectedInstance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            Data = [],
            Process = new ProcessState()
            {
                CurrentTask = new ProcessElementInfo()
                {
                    ElementId = "Task_2",
                    Flow = 3,
                    AltinnTaskType = "confirmation",
                    FlowType = ProcessSequenceFlowType.CompleteCurrentMoveToNext.ToString(),
                    Name = "Bekreft"
                },
                StartEvent = "StartEvent_1"
            }
        };
        ProcessEngine processEngine = GetProcessEngine(updatedInstance: expectedInstance);
        Instance instance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new() { PartyId = "1337" },
            Data = [],
            Process = new ProcessState()
            {
                StartEvent = "StartEvent_1",
                CurrentTask = new()
                {
                    ElementId = "Task_1",
                    AltinnTaskType = "data",
                    Flow = 2,
                    Validated = new() { CanCompleteTask = true }
                }
            }
        };
        ProcessState originalProcessState = instance.Process.Copy();
        ClaimsPrincipal user =
            new(
                new ClaimsIdentity(
                    new List<Claim>()
                    {
                        new(AltinnCoreClaimTypes.UserId, "1337"),
                        new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
                        new(AltinnCoreClaimTypes.Org, "tdd"),
                    }
                )
            );
        ProcessNextRequest processNextRequest = new ProcessNextRequest() { Instance = instance, User = user };
        ProcessChangeResult result = await processEngine.Next(processNextRequest);
        _processReaderMock.Verify(r => r.IsProcessTask("Task_1"), Times.Once);
        _processReaderMock.Verify(r => r.IsEndEvent("Task_2"), Times.Once);
        _processReaderMock.Verify(r => r.IsProcessTask("Task_2"), Times.Once);
        _processNavigatorMock.Verify(n => n.GetNextTask(It.IsAny<Instance>(), "Task_1", null), Times.Once);
        _processTaskCleanerMock.Verify(
            x => x.RemoveAllDataElementsGeneratedFromTask(It.IsAny<Instance>(), It.IsAny<string>()),
            Times.Once
        );

        var expectedInstanceEvents = new List<InstanceEvent>()
        {
            new()
            {
                InstanceId = $"{_instanceOwnerPartyId}/{_instanceGuid}",
                EventType = InstanceEventType.process_EndTask.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    OrgId = "tdd",
                    AuthenticationLevel = 2
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_1",
                        Flow = 2,
                        AltinnTaskType = "data",
                        Validated = new() { CanCompleteTask = true }
                    }
                }
            },
            new()
            {
                InstanceId = $"{_instanceOwnerPartyId}/{_instanceGuid}",
                EventType = InstanceEventType.process_StartTask.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    OrgId = "tdd",
                    AuthenticationLevel = 2,
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_2",
                        Name = "Bekreft",
                        AltinnTaskType = "confirmation",
                        FlowType = ProcessSequenceFlowType.CompleteCurrentMoveToNext.ToString(),
                        Flow = 3
                    }
                }
            }
        };

        _processEventHandlingDelegatorMock.Verify(d =>
            d.HandleEvents(
                It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
                It.IsAny<Dictionary<string, string>>(),
                It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))
            )
        );

        _processEventDispatcherMock.Verify(d =>
            d.DispatchToStorage(
                It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
                It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))
            )
        );

        _processEventDispatcherMock.Verify(d =>
            d.RegisterEventWithEventsComponent(It.Is<Instance>(i => CompareInstance(expectedInstance, i)))
        );

        result.Success.Should().BeTrue();
        result
            .ProcessStateChange.Should()
            .BeEquivalentTo(
                new ProcessStateChange()
                {
                    Events = expectedInstanceEvents,
                    NewProcessState = expectedInstance.Process,
                    OldProcessState = originalProcessState
                }
            );
    }

    [Fact]
    public async Task Next_moves_instance_to_next_task_and_produces_abandon_instanceevent_when_action_reject()
    {
        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata("org/app"));
        var expectedInstance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            Data = [],
            Process = new ProcessState()
            {
                CurrentTask = new ProcessElementInfo()
                {
                    ElementId = "Task_2",
                    Flow = 3,
                    AltinnTaskType = "confirmation",
                    FlowType = ProcessSequenceFlowType.AbandonCurrentMoveToNext.ToString(),
                    Name = "Bekreft"
                },
                StartEvent = "StartEvent_1"
            }
        };
        ProcessEngine processEngine = GetProcessEngine(updatedInstance: expectedInstance);
        Instance instance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new() { PartyId = "1337" },
            Data = [],
            Process = new ProcessState()
            {
                StartEvent = "StartEvent_1",
                CurrentTask = new()
                {
                    ElementId = "Task_1",
                    AltinnTaskType = "data",
                    Flow = 2,
                    Validated = new() { CanCompleteTask = true }
                }
            }
        };
        ProcessState originalProcessState = instance.Process.Copy();
        ClaimsPrincipal user =
            new(
                new ClaimsIdentity(
                    new List<Claim>()
                    {
                        new(AltinnCoreClaimTypes.UserId, "1337"),
                        new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
                        new(AltinnCoreClaimTypes.Org, "tdd"),
                    }
                )
            );
        ProcessNextRequest processNextRequest = new ProcessNextRequest()
        {
            Instance = instance,
            User = user,
            Action = "reject"
        };
        ProcessChangeResult result = await processEngine.Next(processNextRequest);
        _processReaderMock.Verify(r => r.IsProcessTask("Task_1"), Times.Once);
        _processReaderMock.Verify(r => r.IsEndEvent("Task_2"), Times.Once);
        _processReaderMock.Verify(r => r.IsProcessTask("Task_2"), Times.Once);
        _processNavigatorMock.Verify(n => n.GetNextTask(It.IsAny<Instance>(), "Task_1", "reject"), Times.Once);

        var expectedInstanceEvents = new List<InstanceEvent>()
        {
            new()
            {
                InstanceId = $"{_instanceOwnerPartyId}/{_instanceGuid}",
                EventType = InstanceEventType.process_AbandonTask.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    OrgId = "tdd",
                    AuthenticationLevel = 2
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_1",
                        Flow = 2,
                        AltinnTaskType = "data",
                        Validated = new() { CanCompleteTask = true }
                    }
                }
            },
            new()
            {
                InstanceId = $"{_instanceOwnerPartyId}/{_instanceGuid}",
                EventType = InstanceEventType.process_StartTask.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    OrgId = "tdd",
                    AuthenticationLevel = 2,
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_2",
                        Name = "Bekreft",
                        AltinnTaskType = "confirmation",
                        FlowType = ProcessSequenceFlowType.AbandonCurrentMoveToNext.ToString(),
                        Flow = 3
                    }
                }
            }
        };

        _processEventHandlingDelegatorMock.Verify(d =>
            d.HandleEvents(
                It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
                It.IsAny<Dictionary<string, string>>(),
                It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))
            )
        );

        _processEventDispatcherMock.Verify(d =>
            d.DispatchToStorage(
                It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
                It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))
            )
        );

        _processEventDispatcherMock.Verify(d =>
            d.RegisterEventWithEventsComponent(It.Is<Instance>(i => CompareInstance(expectedInstance, i)))
        );

        result.Success.Should().BeTrue();
        result
            .ProcessStateChange.Should()
            .BeEquivalentTo(
                new ProcessStateChange()
                {
                    Events = expectedInstanceEvents,
                    NewProcessState = expectedInstance.Process,
                    OldProcessState = originalProcessState
                }
            );
    }

    [Fact]
    public async Task Next_moves_instance_to_end_event_and_ends_proces()
    {
        _appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(new ApplicationMetadata("org/app"));
        var expectedInstance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            Data = [],
            Process = new ProcessState()
            {
                CurrentTask = null,
                StartEvent = "StartEvent_1",
                EndEvent = "EndEvent_1"
            }
        };
        ProcessEngine processEngine = GetProcessEngine(updatedInstance: expectedInstance);
        Instance instance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new() { PartyId = "1337" },
            Data = [],
            Process = new ProcessState()
            {
                StartEvent = "StartEvent_1",
                CurrentTask = new()
                {
                    ElementId = "Task_2",
                    AltinnTaskType = "confirmation",
                    Flow = 3,
                    Validated = new() { CanCompleteTask = true }
                }
            }
        };
        ProcessState originalProcessState = instance.Process.Copy();
        ClaimsPrincipal user =
            new(
                new ClaimsIdentity(
                    new List<Claim>()
                    {
                        new(AltinnCoreClaimTypes.UserId, "1337"),
                        new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
                    }
                )
            );
        ProcessNextRequest processNextRequest = new ProcessNextRequest() { Instance = instance, User = user };
        ProcessChangeResult result = await processEngine.Next(processNextRequest);
        _processReaderMock.Verify(r => r.IsProcessTask("Task_2"), Times.Once);
        _processReaderMock.Verify(r => r.IsEndEvent("EndEvent_1"), Times.Once);
        _profileMock.Verify(p => p.GetUserProfile(1337), Times.Exactly(3));
        _processNavigatorMock.Verify(n => n.GetNextTask(It.IsAny<Instance>(), "Task_2", null), Times.Once);

        var expectedInstanceEvents = new List<InstanceEvent>()
        {
            new()
            {
                InstanceId = $"{_instanceOwnerPartyId}/{_instanceGuid}",
                EventType = InstanceEventType.process_EndTask.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    AuthenticationLevel = 2,
                    NationalIdentityNumber = "22927774937"
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_2",
                        Flow = 3,
                        AltinnTaskType = "confirmation",
                        Validated = new() { CanCompleteTask = true }
                    }
                }
            },
            new()
            {
                InstanceId = $"{_instanceOwnerPartyId}/{_instanceGuid}",
                EventType = InstanceEventType.process_EndEvent.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    NationalIdentityNumber = "22927774937",
                    AuthenticationLevel = 2,
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = null,
                    EndEvent = "EndEvent_1"
                }
            },
            new()
            {
                InstanceId = $"{_instanceOwnerPartyId}/{_instanceGuid}",
                EventType = InstanceEventType.Submited.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    NationalIdentityNumber = "22927774937",
                    AuthenticationLevel = 2,
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = null,
                    EndEvent = "EndEvent_1"
                }
            }
        };

        _processEventHandlingDelegatorMock.Verify(d =>
            d.HandleEvents(
                It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
                It.IsAny<Dictionary<string, string>>(),
                It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))
            )
        );

        _processEventDispatcherMock.Verify(d =>
            d.DispatchToStorage(
                It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
                It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))
            )
        );

        _processEventDispatcherMock.Verify(d =>
            d.RegisterEventWithEventsComponent(It.Is<Instance>(i => CompareInstance(expectedInstance, i)))
        );

        result.Success.Should().BeTrue();
        result
            .ProcessStateChange.Should()
            .BeEquivalentTo(
                new ProcessStateChange()
                {
                    Events = expectedInstanceEvents,
                    NewProcessState = expectedInstance.Process,
                    OldProcessState = originalProcessState
                }
            );
    }

    [Fact]
    public async Task UpdateInstanceAndRerunEvents_sends_instance_and_events_to_eventdispatcher()
    {
        Instance instance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            Data = [],
            Process = new ProcessState()
            {
                StartEvent = "StartEvent_1",
                CurrentTask = new ProcessElementInfo()
                {
                    ElementId = "Task_1",
                    Flow = 3,
                    AltinnTaskType = "confirmation",
                    Validated = new() { CanCompleteTask = true }
                }
            }
        };
        Instance updatedInstance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            Org = "ttd",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            Data = [],
            Process = new ProcessState()
            {
                StartEvent = "StartEvent_1",
                CurrentTask = new ProcessElementInfo()
                {
                    ElementId = "Task_1",
                    Flow = 3,
                    AltinnTaskType = "confirmation",
                    Validated = new() { CanCompleteTask = true }
                }
            }
        };
        Dictionary<string, string> prefill = new Dictionary<string, string>() { { "test", "test" } };
        List<InstanceEvent> events = new List<InstanceEvent>()
        {
            new()
            {
                InstanceId = $"{_instanceOwnerPartyId}/{_instanceGuid}",
                EventType = InstanceEventType.process_AbandonTask.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    OrgId = "tdd",
                    AuthenticationLevel = 2
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_1",
                        Flow = 2,
                        AltinnTaskType = "data",
                        Validated = new() { CanCompleteTask = true }
                    }
                }
            }
        };
        ProcessEngine processEngine = GetProcessEngine(updatedInstance: updatedInstance);
        ProcessStartRequest processStartRequest = new ProcessStartRequest() { Instance = instance, Prefill = prefill, };
        Instance result = await processEngine.HandleEventsAndUpdateStorage(
            processStartRequest.Instance,
            processStartRequest.Prefill,
            events
        );

        _processEventHandlingDelegatorMock.Verify(d =>
            d.HandleEvents(
                It.Is<Instance>(i => CompareInstance(instance, i)),
                It.IsAny<Dictionary<string, string>>(),
                It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(events, l))
            )
        );

        _processEventDispatcherMock.Verify(d =>
            d.DispatchToStorage(
                It.Is<Instance>(i => CompareInstance(instance, i)),
                It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(events, l))
            )
        );

        result.Should().Be(updatedInstance);
    }

    private ProcessEngine GetProcessEngine(
        bool setupProcessReaderMock = true,
        Instance? updatedInstance = null,
        List<IUserAction>? userActions = null,
        TelemetrySink? telemetrySink = null
    )
    {
        if (setupProcessReaderMock)
        {
            _processReaderMock.Setup(r => r.GetStartEventIds()).Returns(new List<string>() { "StartEvent_1" });
            _processReaderMock.Setup(r => r.IsProcessTask("StartEvent_1")).Returns(false);
            _processReaderMock.Setup(r => r.IsEndEvent("Task_1")).Returns(false);
            _processReaderMock.Setup(r => r.IsProcessTask("Task_1")).Returns(true);
            _processReaderMock.Setup(r => r.IsProcessTask("Task_2")).Returns(true);
            _processReaderMock.Setup(r => r.IsProcessTask("EndEvent_1")).Returns(false);
            _processReaderMock.Setup(r => r.IsEndEvent("EndEvent_1")).Returns(true);
            _processReaderMock.Setup(r => r.IsProcessTask("EndEvent_1")).Returns(false);
        }

        _profileMock
            .Setup(p => p.GetUserProfile(1337))
            .ReturnsAsync(
                () =>
                    new UserProfile()
                    {
                        UserId = 1337,
                        Email = "test@example.com",
                        Party = new Party() { SSN = "22927774937" }
                    }
            );
        _processNavigatorMock
            .Setup(pn => pn.GetNextTask(It.IsAny<Instance>(), "StartEvent_1", It.IsAny<string?>()))
            .ReturnsAsync(
                () =>
                    new ProcessTask()
                    {
                        Id = "Task_1",
                        Incoming = new List<string> { "Flow_1" },
                        Outgoing = new List<string> { "Flow_2" },
                        Name = "Utfylling",
                        ExtensionElements = new() { TaskExtension = new() { TaskType = "data" } }
                    }
            );
        _processNavigatorMock
            .Setup(pn => pn.GetNextTask(It.IsAny<Instance>(), "Task_1", It.IsAny<string?>()))
            .ReturnsAsync(
                () =>
                    new ProcessTask()
                    {
                        Id = "Task_2",
                        Incoming = new List<string> { "Flow_2" },
                        Outgoing = new List<string> { "Flow_3" },
                        Name = "Bekreft",
                        ExtensionElements = new() { TaskExtension = new() { TaskType = "confirmation" } }
                    }
            );
        _processNavigatorMock
            .Setup(pn => pn.GetNextTask(It.IsAny<Instance>(), "Task_2", It.IsAny<string?>()))
            .ReturnsAsync(
                () =>
                    new EndEvent()
                    {
                        Id = "EndEvent_1",
                        Incoming = new List<string> { "Flow_3" }
                    }
            );
        if (updatedInstance is not null)
        {
            _processEventDispatcherMock
                .Setup(d => d.DispatchToStorage(It.IsAny<Instance>(), It.IsAny<List<InstanceEvent>>()))
                .ReturnsAsync(() => updatedInstance);
        }

        return new ProcessEngine(
            _processReaderMock.Object,
            _profileMock.Object,
            _processNavigatorMock.Object,
            _processEventHandlingDelegatorMock.Object,
            _processEventDispatcherMock.Object,
            _processTaskCleanerMock.Object,
            new UserActionService(userActions ?? []),
            _dataClientMock.Object,
            _instanceClientMock.Object,
            new ModelSerializationService(_appModelMock.Object, telemetrySink?.Object),
            _appMetadataMock.Object,
            telemetrySink?.Object
        );
    }

    public void Dispose()
    {
        _processReaderMock.VerifyNoOtherCalls();
        _profileMock.VerifyNoOtherCalls();
        _processNavigatorMock.VerifyNoOtherCalls();
        _processEventHandlingDelegatorMock.VerifyNoOtherCalls();
        _processEventDispatcherMock.VerifyNoOtherCalls();
    }

    private bool CompareInstance(Instance expected, Instance actual)
    {
        expected.Process.Started = actual.Process.Started;
        expected.Process.Ended = actual.Process.Ended;
        if (actual.Process.CurrentTask != null)
        {
            expected.Process.CurrentTask.Started = actual.Process.CurrentTask.Started;
        }

        return JsonCompare(expected, actual);
    }

    private bool CompareInstanceEvents(List<InstanceEvent> expected, List<InstanceEvent> actual)
    {
        for (int i = 0; i < expected.Count; i++)
        {
            expected[i].Created = actual[i].Created;
            expected[i].ProcessInfo.Started = actual[i].ProcessInfo.Started;
            expected[i].ProcessInfo.Ended = actual[i].ProcessInfo.Ended;
            if (actual[i].ProcessInfo.CurrentTask != null)
            {
                expected[i].ProcessInfo.CurrentTask.Started = actual[i].ProcessInfo.CurrentTask.Started;
            }
        }

        return JsonCompare(expected, actual);
    }

    private bool JsonCompare(object? expected, object? actual)
    {
        if (ReferenceEquals(expected, actual))
        {
            return true;
        }

        if ((expected == null) || (actual == null))
        {
            return false;
        }

        if (expected.GetType() != actual.GetType())
        {
            return false;
        }

        var expectedJson = JsonConvert.SerializeObject(expected);
        var actualJson = JsonConvert.SerializeObject(actual);
        _output.WriteLine("Expected:");
        _output.WriteLine(expectedJson);
        _output.WriteLine("Actual:");
        _output.WriteLine(actualJson);
        _output.WriteLine("");

        var jsonCompare = expectedJson == actualJson;
        if (jsonCompare == false)
        {
            Console.WriteLine("Not equal");
        }

        return jsonCompare;
    }
}
