using System.Globalization;
using System.Security.Claims;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Constants;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Newtonsoft.Json;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.Internal.Process;

public sealed class ProcessEngineTest
{
    private readonly ITestOutputHelper _output;
    private static readonly int _instanceOwnerPartyId = 1337;
    private static readonly Guid _instanceGuid = new("00000000-DEAD-BABE-0000-001230000000");
    private static readonly string _instanceId = $"{_instanceOwnerPartyId}/{_instanceGuid}";

    public ProcessEngineTest(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public async Task StartProcess_returns_unsuccessful_when_process_already_started()
    {
        using var fixture = Fixture.Create();
        ProcessEngine processEngine = fixture.ProcessEngine;
        Instance instance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            Process = new ProcessState() { CurrentTask = new ProcessElementInfo() { ElementId = "Task_1" } },
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
        Mock<IProcessReader> processReaderMock = new();
        processReaderMock.Setup(r => r.GetStartEventIds()).Returns(new List<string>() { "StartEvent_1" });
        var services = new ServiceCollection();
        services.AddSingleton(processReaderMock.Object);
        using var fixture = Fixture.Create(services);
        ProcessEngine processEngine = fixture.ProcessEngine;
        Instance instance = new Instance() { Id = _instanceId, AppId = "org/app" };
        ProcessStartRequest processStartRequest = new ProcessStartRequest()
        {
            Instance = instance,
            StartEventId = "NotTheStartEventYouAreLookingFor",
        };
        ProcessChangeResult result = await processEngine.GenerateProcessStartEvents(processStartRequest);
        fixture.Mock<IProcessReader>().Verify(r => r.GetStartEventIds(), Times.Once);
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Be("No matching startevent");
        result.ErrorType.Should().Be(ProcessErrorType.Conflict);
    }

    [Fact]
    public async Task StartProcess_starts_process_and_moves_to_first_task_without_event_dispatch_when_dryrun()
    {
        using var fixture = Fixture.Create();
        ProcessEngine processEngine = fixture.ProcessEngine;
        Instance instance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
        };
        ClaimsPrincipal user = new(
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
        fixture.Mock<IProcessReader>().Verify(r => r.GetStartEventIds(), Times.Once);
        fixture.Mock<IProcessReader>().Verify(r => r.IsProcessTask("StartEvent_1"), Times.Once);
        fixture.Mock<IProcessReader>().Verify(r => r.IsEndEvent("Task_1"), Times.Once);
        fixture.Mock<IProcessReader>().Verify(r => r.IsProcessTask("Task_1"), Times.Once);
        fixture
            .Mock<IProcessNavigator>()
            .Verify(n => n.GetNextTask(It.IsAny<Instance>(), "StartEvent_1", null), Times.Once);
        result.Success.Should().BeTrue();
    }

    [Theory]
    [ClassData(typeof(TestAuthentication.AllTokens))]
    public async Task StartProcess_starts_process_and_moves_to_first_task(TestJwtToken token)
    {
        using var fixture = Fixture.Create(withTelemetry: true, token: token);
        var instanceOwnerPartyId = token.Auth switch
        {
            Authenticated.User auth => auth.SelectedPartyId,
            Authenticated.ServiceOwner => _instanceOwnerPartyId,
            Authenticated.SystemUser auth when await auth.LoadDetails() is { } details => details.Party.PartyId,
            _ => throw new NotImplementedException(),
        };
        var instanceOwnerPartyIdStr = instanceOwnerPartyId.ToString(CultureInfo.InvariantCulture);
        ProcessEngine processEngine = fixture.ProcessEngine;
        Instance instance = new Instance()
        {
            Id = $"{instanceOwnerPartyIdStr}/{_instanceGuid}",
            AppId = "org/app",
            InstanceOwner = new InstanceOwner() { PartyId = instanceOwnerPartyIdStr },
            Data = [],
        };
        ProcessStartRequest processStartRequest = new ProcessStartRequest() { Instance = instance, User = null };
        ProcessChangeResult result = await processEngine.GenerateProcessStartEvents(processStartRequest);
        await processEngine.HandleEventsAndUpdateStorage(instance, null, result.ProcessStateChange?.Events);
        fixture.Mock<IProcessReader>().Verify(r => r.GetStartEventIds(), Times.Once);
        fixture.Mock<IProcessReader>().Verify(r => r.IsProcessTask("StartEvent_1"), Times.Once);
        fixture.Mock<IProcessReader>().Verify(r => r.IsEndEvent("Task_1"), Times.Once);
        fixture.Mock<IProcessReader>().Verify(r => r.IsProcessTask("Task_1"), Times.Once);
        fixture
            .Mock<IProcessNavigator>()
            .Verify(n => n.GetNextTask(It.IsAny<Instance>(), "StartEvent_1", null), Times.Once);
        var expectedInstance = new Instance()
        {
            Id = $"{instanceOwnerPartyIdStr}/{_instanceGuid}",
            AppId = "org/app",
            InstanceOwner = new InstanceOwner() { PartyId = instanceOwnerPartyIdStr },
            Data = [],
            Process = new ProcessState()
            {
                CurrentTask = new ProcessElementInfo()
                {
                    ElementId = "Task_1",
                    Flow = 2,
                    AltinnTaskType = "data",
                    FlowType = ProcessSequenceFlowType.CompleteCurrentMoveToNext.ToString(),
                    Name = "Utfylling",
                },
                StartEvent = "StartEvent_1",
            },
        };
        PlatformUser platformUser = token.Auth switch
        {
            Authenticated.User auth when await auth.LoadDetails() is { } details => new()
            {
                UserId = auth.UserId,
                NationalIdentityNumber = details.SelectedParty.SSN,
                AuthenticationLevel = auth.AuthenticationLevel,
            },
            Authenticated.ServiceOwner auth => new()
            {
                OrgId = auth.Name,
                AuthenticationLevel = auth.AuthenticationLevel,
            },
            Authenticated.SystemUser auth => new()
            {
                SystemUserId = auth.SystemUserId[0],
                SystemUserOwnerOrgNo = auth.SystemUserOrgNr.Get(OrganisationNumberFormat.Local),
                AuthenticationLevel = auth.AuthenticationLevel,
            },
            _ => throw new NotImplementedException(),
        };
        var expectedInstanceEvents = new List<InstanceEvent>()
        {
            new()
            {
                InstanceId = $"{instanceOwnerPartyIdStr}/{_instanceGuid}",
                EventType = InstanceEventType.process_StartEvent.ToString(),
                InstanceOwnerPartyId = instanceOwnerPartyIdStr,
                User = platformUser,
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "StartEvent_1",
                        Flow = 1,
                        Validated = new() { CanCompleteTask = false },
                    },
                },
            },
            new()
            {
                InstanceId = $"{instanceOwnerPartyIdStr}/{_instanceGuid}",
                EventType = InstanceEventType.process_StartTask.ToString(),
                InstanceOwnerPartyId = instanceOwnerPartyIdStr,
                User = platformUser,
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_1",
                        Name = "Utfylling",
                        AltinnTaskType = "data",
                        Flow = 2,
                        Validated = new() { CanCompleteTask = false },
                    },
                },
            },
        };

        fixture
            .Mock<IProcessEventHandlerDelegator>()
            .Verify(d =>
                d.HandleEvents(
                    It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
                    It.IsAny<Dictionary<string, string>>(),
                    It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))
                )
            );

        fixture
            .Mock<IProcessEventDispatcher>()
            .Verify(d =>
                d.DispatchToStorage(
                    It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
                    It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))
                )
            );

        result.Success.Should().BeTrue();

        await Verify(fixture.TelemetrySink.GetSnapshot()).UseTextForParameters(token.Type.ToString());
    }

    [Fact]
    public async Task StartProcess_starts_process_and_moves_to_first_task_with_prefill()
    {
        using var fixture = Fixture.Create();
        ProcessEngine processEngine = fixture.ProcessEngine;
        Instance instance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            Data = [],
        };
        ClaimsPrincipal user = new(
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
            Prefill = prefill,
        };
        ProcessChangeResult result = await processEngine.GenerateProcessStartEvents(processStartRequest);
        await processEngine.HandleEventsAndUpdateStorage(instance, prefill, result.ProcessStateChange?.Events);
        fixture.Mock<IProcessReader>().Verify(r => r.GetStartEventIds(), Times.Once);
        fixture.Mock<IProcessReader>().Verify(r => r.IsProcessTask("StartEvent_1"), Times.Once);
        fixture.Mock<IProcessReader>().Verify(r => r.IsEndEvent("Task_1"), Times.Once);
        fixture.Mock<IProcessReader>().Verify(r => r.IsProcessTask("Task_1"), Times.Once);
        fixture
            .Mock<IProcessNavigator>()
            .Verify(n => n.GetNextTask(It.IsAny<Instance>(), "StartEvent_1", null), Times.Once);
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
                    Name = "Utfylling",
                },
                StartEvent = "StartEvent_1",
            },
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
                    AuthenticationLevel = 2,
                    NationalIdentityNumber = "22927774937",
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "StartEvent_1",
                        Flow = 1,
                        Validated = new() { CanCompleteTask = false },
                    },
                },
            },
            new()
            {
                InstanceId = $"{_instanceOwnerPartyId}/{_instanceGuid}",
                EventType = InstanceEventType.process_StartTask.ToString(),
                InstanceOwnerPartyId = "1337",
                User = new()
                {
                    UserId = 1337,
                    AuthenticationLevel = 2,
                    NationalIdentityNumber = "22927774937",
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
                        Validated = new() { CanCompleteTask = false },
                    },
                },
            },
        };

        fixture
            .Mock<IProcessEventHandlerDelegator>()
            .Verify(d =>
                d.HandleEvents(
                    It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
                    It.IsAny<Dictionary<string, string>>(),
                    It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))
                )
            );

        fixture
            .Mock<IProcessEventDispatcher>()
            .Verify(d =>
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
        using var fixture = Fixture.Create();
        ProcessEngine processEngine = fixture.ProcessEngine;
        Instance instance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            Process = null,
        };
        ProcessNextRequest processNextRequest = new ProcessNextRequest()
        {
            Instance = instance,
            Action = null,
            User = null!,
            Language = null,
        };
        ProcessChangeResult result = await processEngine.Next(processNextRequest);
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Be("Instance does not have current task information!");
        result.ErrorType.Should().Be(ProcessErrorType.Conflict);
    }

    [Fact]
    public async Task Next_returns_unsuccessful_when_process_currenttask_null()
    {
        using var fixture = Fixture.Create();
        ProcessEngine processEngine = fixture.ProcessEngine;
        Instance instance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            Process = new ProcessState() { CurrentTask = null },
        };
        ProcessNextRequest processNextRequest = new ProcessNextRequest()
        {
            Instance = instance,
            User = null!,
            Action = null,
            Language = null,
        };
        ProcessChangeResult result = await processEngine.Next(processNextRequest);
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Be("Instance does not have current task information!");
        result.ErrorType.Should().Be(ProcessErrorType.Conflict);
    }

    [Fact]
    public async Task HandleUserAction_returns_successful_when_handler_succeeds()
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
                EndEvent = "EndEvent_1",
            },
        };
        Mock<IUserAction> userActionMock = new Mock<IUserAction>(MockBehavior.Strict);
        userActionMock.Setup(u => u.Id).Returns("sign");
        userActionMock
            .Setup(u => u.HandleAction(It.IsAny<UserActionContext>()))
            .ReturnsAsync(UserActionResult.SuccessResult());
        using var fixture = Fixture.Create(updatedInstance: expectedInstance, userActions: [userActionMock.Object]);
        fixture
            .Mock<IAppMetadata>()
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("org/app"));
        ProcessEngine processEngine = fixture.ProcessEngine;
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
                    AltinnTaskType = "signing",
                    Flow = 3,
                    Validated = new() { CanCompleteTask = true },
                },
            },
        };
        ClaimsPrincipal user = new(
            new ClaimsIdentity(new List<Claim>() { new(AltinnCoreClaimTypes.AuthenticationLevel, "2") })
        );
        ProcessNextRequest processNextRequest = new ProcessNextRequest()
        {
            Instance = instance,
            User = user,
            Action = "sign",
            Language = null,
        };
        UserActionResult result = await processEngine.HandleUserAction(processNextRequest, CancellationToken.None);
        result.Success.Should().BeTrue();
        result.ErrorType.Should().Be(null);
    }

    [Fact]
    public async Task HandleUserAction_returns_unsuccessful_unauthorized_when_action_handler_returns_errortype_Unauthorized()
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
                EndEvent = "EndEvent_1",
            },
        };
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
        using var fixture = Fixture.Create(updatedInstance: expectedInstance, userActions: [userActionMock.Object]);
        fixture
            .Mock<IAppMetadata>()
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("org/app"));
        ProcessEngine processEngine = fixture.ProcessEngine;
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
                    Validated = new() { CanCompleteTask = true },
                },
            },
        };
        ClaimsPrincipal user = new(
            new ClaimsIdentity(new List<Claim>() { new(AltinnCoreClaimTypes.AuthenticationLevel, "2") })
        );
        ProcessNextRequest processNextRequest = new ProcessNextRequest()
        {
            Instance = instance,
            User = user,
            Action = "sign",
            Language = null,
        };
        UserActionResult result = await processEngine.HandleUserAction(processNextRequest, CancellationToken.None);
        result.Success.Should().BeFalse();
        result.ErrorType.Should().Be(ProcessErrorType.Unauthorized);
    }

    [Fact]
    public async Task Next_moves_instance_to_next_task_and_produces_instanceevents()
    {
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
                    Name = "Bekreft",
                },
                StartEvent = "StartEvent_1",
            },
        };
        using var fixture = Fixture.Create(updatedInstance: expectedInstance);
        fixture
            .Mock<IAppMetadata>()
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("org/app"));
        ProcessEngine processEngine = fixture.ProcessEngine;
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
                    Validated = new() { CanCompleteTask = true },
                },
            },
        };
        ProcessState originalProcessState = instance.Process.Copy();
        ClaimsPrincipal user = new(
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
            Action = null,
            Language = null,
        };
        ProcessChangeResult result = await processEngine.Next(processNextRequest);
        fixture.Mock<IProcessReader>().Verify(r => r.IsProcessTask("Task_1"), Times.Once);
        fixture.Mock<IProcessReader>().Verify(r => r.IsEndEvent("Task_2"), Times.Once);
        fixture.Mock<IProcessReader>().Verify(r => r.IsProcessTask("Task_2"), Times.Once);
        fixture.Mock<IProcessNavigator>().Verify(n => n.GetNextTask(It.IsAny<Instance>(), "Task_1", null), Times.Once);

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
                    NationalIdentityNumber = "22927774937",
                    AuthenticationLevel = 2,
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_1",
                        Flow = 2,
                        AltinnTaskType = "data",
                        Validated = new() { CanCompleteTask = true },
                    },
                },
            },
            new()
            {
                InstanceId = $"{_instanceOwnerPartyId}/{_instanceGuid}",
                EventType = InstanceEventType.process_StartTask.ToString(),
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
                    CurrentTask = new()
                    {
                        ElementId = "Task_2",
                        Name = "Bekreft",
                        AltinnTaskType = "confirmation",
                        FlowType = ProcessSequenceFlowType.CompleteCurrentMoveToNext.ToString(),
                        Flow = 3,
                    },
                },
            },
        };

        fixture
            .Mock<IProcessEventHandlerDelegator>()
            .Verify(d =>
                d.HandleEvents(
                    It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
                    It.IsAny<Dictionary<string, string>>(),
                    It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))
                )
            );

        fixture
            .Mock<IProcessEventDispatcher>()
            .Verify(d =>
                d.DispatchToStorage(
                    It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
                    It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))
                )
            );

        fixture
            .Mock<IProcessEventDispatcher>()
            .Verify(d =>
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
                    OldProcessState = originalProcessState,
                }
            );
    }

    [Fact]
    public async Task Next_moves_instance_to_next_task_and_produces_abandon_instanceevent_when_action_reject()
    {
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
                    Name = "Bekreft",
                },
                StartEvent = "StartEvent_1",
            },
        };
        using var fixture = Fixture.Create(updatedInstance: expectedInstance);
        fixture
            .Mock<IAppMetadata>()
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("org/app"));
        ProcessEngine processEngine = fixture.ProcessEngine;
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
                    Validated = new() { CanCompleteTask = true },
                },
            },
        };
        ProcessState originalProcessState = instance.Process.Copy();
        ClaimsPrincipal user = new(
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
            Action = "reject",
            Language = null,
        };
        ProcessChangeResult result = await processEngine.Next(processNextRequest);
        fixture.Mock<IProcessReader>().Verify(r => r.IsProcessTask("Task_1"), Times.Once);
        fixture.Mock<IProcessReader>().Verify(r => r.IsEndEvent("Task_2"), Times.Once);
        fixture.Mock<IProcessReader>().Verify(r => r.IsProcessTask("Task_2"), Times.Once);
        fixture
            .Mock<IProcessNavigator>()
            .Verify(n => n.GetNextTask(It.IsAny<Instance>(), "Task_1", "reject"), Times.Once);

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
                    NationalIdentityNumber = "22927774937",
                    AuthenticationLevel = 2,
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_1",
                        Flow = 2,
                        AltinnTaskType = "data",
                        Validated = new() { CanCompleteTask = true },
                    },
                },
            },
            new()
            {
                InstanceId = $"{_instanceOwnerPartyId}/{_instanceGuid}",
                EventType = InstanceEventType.process_StartTask.ToString(),
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
                    CurrentTask = new()
                    {
                        ElementId = "Task_2",
                        Name = "Bekreft",
                        AltinnTaskType = "confirmation",
                        FlowType = ProcessSequenceFlowType.AbandonCurrentMoveToNext.ToString(),
                        Flow = 3,
                    },
                },
            },
        };

        fixture
            .Mock<IProcessEventHandlerDelegator>()
            .Verify(d =>
                d.HandleEvents(
                    It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
                    It.IsAny<Dictionary<string, string>>(),
                    It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))
                )
            );

        fixture
            .Mock<IProcessEventDispatcher>()
            .Verify(d =>
                d.DispatchToStorage(
                    It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
                    It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))
                )
            );

        fixture
            .Mock<IProcessEventDispatcher>()
            .Verify(d =>
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
                    OldProcessState = originalProcessState,
                }
            );
    }

    [Theory]
    [InlineData(true, true)]
    [InlineData(false, false)]
    [InlineData(false, true)]
    public async Task Next_moves_instance_to_end_event_and_ends_process(bool registerProcessEnd, bool useTelemetry)
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
                EndEvent = "EndEvent_1",
            },
        };
        using var fixture = Fixture.Create(
            updatedInstance: expectedInstance,
            registerProcessEnd: registerProcessEnd,
            withTelemetry: useTelemetry
        );
        fixture
            .Mock<IAppMetadata>()
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("org/app"));

        if (registerProcessEnd)
        {
            fixture
                .Mock<IProcessEnd>()
                .Setup(x => x.End(It.IsAny<Instance>(), It.IsAny<List<InstanceEvent>>()))
                .Verifiable(Times.Once);
        }

        ProcessEngine processEngine = fixture.ProcessEngine;
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
                    Validated = new() { CanCompleteTask = true },
                },
            },
        };
        ProcessState originalProcessState = instance.Process.Copy();
        ClaimsPrincipal user = new(
            new ClaimsIdentity(
                new List<Claim>()
                {
                    new(AltinnCoreClaimTypes.UserId, "1337"),
                    new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
                }
            )
        );
        ProcessNextRequest processNextRequest = new ProcessNextRequest()
        {
            Instance = instance,
            User = user,
            Action = null,
            Language = null,
        };
        ProcessChangeResult result = await processEngine.Next(processNextRequest);
        fixture.Mock<IProcessReader>().Verify(r => r.IsProcessTask("Task_2"), Times.Once);
        fixture.Mock<IProcessReader>().Verify(r => r.IsEndEvent("EndEvent_1"), Times.Once);
        fixture.Mock<IProcessNavigator>().Verify(n => n.GetNextTask(It.IsAny<Instance>(), "Task_2", null), Times.Once);

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
                    NationalIdentityNumber = "22927774937",
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_2",
                        Flow = 3,
                        AltinnTaskType = "confirmation",
                        Validated = new() { CanCompleteTask = true },
                    },
                },
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
                    EndEvent = "EndEvent_1",
                },
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
                    EndEvent = "EndEvent_1",
                },
            },
        };

        fixture
            .Mock<IProcessEventHandlerDelegator>()
            .Verify(d =>
                d.HandleEvents(
                    It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
                    It.IsAny<Dictionary<string, string>>(),
                    It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))
                )
            );

        fixture
            .Mock<IProcessEventDispatcher>()
            .Verify(d =>
                d.DispatchToStorage(
                    It.Is<Instance>(i => CompareInstance(expectedInstance, i)),
                    It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(expectedInstanceEvents, l))
                )
            );

        fixture
            .Mock<IProcessEventDispatcher>()
            .Verify(d =>
                d.RegisterEventWithEventsComponent(It.Is<Instance>(i => CompareInstance(expectedInstance, i)))
            );

        if (registerProcessEnd)
        {
            fixture.Mock<IProcessEnd>().Verify();
        }

        if (useTelemetry)
        {
            var snapshotFilename =
                $"ProcessEngineTest.Telemetry.IProcessEnd_{(registerProcessEnd ? "registered" : "not_registered")}.json";
            await Verify(fixture.TelemetrySink.GetSnapshot()).UseFileName(snapshotFilename);
        }

        result.Success.Should().BeTrue();
        result
            .ProcessStateChange.Should()
            .BeEquivalentTo(
                new ProcessStateChange()
                {
                    Events = expectedInstanceEvents,
                    NewProcessState = expectedInstance.Process,
                    OldProcessState = originalProcessState,
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
                    Validated = new() { CanCompleteTask = true },
                },
            },
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
                    Validated = new() { CanCompleteTask = true },
                },
            },
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
                    NationalIdentityNumber = "22927774937",
                    AuthenticationLevel = 2,
                },
                ProcessInfo = new()
                {
                    StartEvent = "StartEvent_1",
                    CurrentTask = new()
                    {
                        ElementId = "Task_1",
                        Flow = 2,
                        AltinnTaskType = "data",
                        Validated = new() { CanCompleteTask = true },
                    },
                },
            },
        };
        using var fixture = Fixture.Create(updatedInstance: updatedInstance);
        ProcessEngine processEngine = fixture.ProcessEngine;
        ProcessStartRequest processStartRequest = new ProcessStartRequest() { Instance = instance, Prefill = prefill };
        Instance result = await processEngine.HandleEventsAndUpdateStorage(
            processStartRequest.Instance,
            processStartRequest.Prefill,
            events
        );

        fixture
            .Mock<IProcessEventHandlerDelegator>()
            .Verify(d =>
                d.HandleEvents(
                    It.Is<Instance>(i => CompareInstance(instance, i)),
                    It.IsAny<Dictionary<string, string>>(),
                    It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(events, l))
                )
            );

        fixture
            .Mock<IProcessEventDispatcher>()
            .Verify(d =>
                d.DispatchToStorage(
                    It.Is<Instance>(i => CompareInstance(instance, i)),
                    It.Is<List<InstanceEvent>>(l => CompareInstanceEvents(events, l))
                )
            );

        result.Should().Be(updatedInstance);
    }

    private sealed record Fixture(IServiceProvider ServiceProvider) : IDisposable
    {
        public ProcessEngine ProcessEngine => (ProcessEngine)ServiceProvider.GetRequiredService<IProcessEngine>();

        public TelemetrySink TelemetrySink => ServiceProvider.GetRequiredService<TelemetrySink>();

        public Mock<T> Mock<T>()
            where T : class => Moq.Mock.Get(ServiceProvider.GetRequiredService<T>());

        public static Fixture Create(
            ServiceCollection? services = null,
            Instance? updatedInstance = null,
            IEnumerable<IUserAction>? userActions = null,
            bool withTelemetry = false,
            TestJwtToken? token = null,
            bool registerProcessEnd = false
        )
        {
            services ??= new ServiceCollection();

            services.AddLogging(builder => builder.AddProvider(NullLoggerProvider.Instance));
            services.AddAppImplementationFactory();
            if (withTelemetry)
                services.AddTelemetrySink();

            services.TryAddTransient<IProcessEngine, ProcessEngine>();
            services.TryAddTransient<UserActionService>();

            Mock<IProcessReader> processReaderMock = new();
            processReaderMock.Setup(r => r.GetStartEventIds()).Returns(new List<string>() { "StartEvent_1" });
            processReaderMock.Setup(r => r.IsProcessTask("StartEvent_1")).Returns(false);
            processReaderMock.Setup(r => r.IsEndEvent("Task_1")).Returns(false);
            processReaderMock.Setup(r => r.IsProcessTask("Task_1")).Returns(true);
            processReaderMock.Setup(r => r.IsProcessTask("Task_2")).Returns(true);
            processReaderMock.Setup(r => r.IsProcessTask("EndEvent_1")).Returns(false);
            processReaderMock.Setup(r => r.IsEndEvent("EndEvent_1")).Returns(true);
            processReaderMock.Setup(r => r.IsProcessTask("EndEvent_1")).Returns(false);
            services.TryAddSingleton<IProcessReader>(_ => processReaderMock.Object);

            Mock<IAuthenticationContext> authenticationContextMock = new(MockBehavior.Strict);
            Mock<IProcessNavigator> processNavigatorMock = new(MockBehavior.Strict);
            Mock<IProcessEventHandlerDelegator> processEventHandlingDelegatorMock = new();
            Mock<IProcessEventDispatcher> processEventDispatcherMock = new();
            Mock<IDataClient> dataClientMock = new(MockBehavior.Strict);
            Mock<IInstanceClient> instanceClientMock = new(MockBehavior.Strict);
            Mock<IAppModel> appModelMock = new(MockBehavior.Strict);
            Mock<IAppMetadata> appMetadataMock = new(MockBehavior.Strict);
            Mock<IAppResources> appResourcesMock = new(MockBehavior.Strict);
            Mock<ITranslationService> translationServiceMock = new(MockBehavior.Strict);
            var appMetadata = new ApplicationMetadata("org/app");
            appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(appMetadata);

            authenticationContextMock
                .Setup(a => a.Current)
                .Returns(
                    token?.Auth
                        ?? TestAuthentication.GetUserAuthentication(
                            userId: 1337,
                            email: "test@example.com",
                            ssn: "22927774937",
                            applicationMetadata: appMetadata
                        )
                );
            processNavigatorMock
                .Setup(pn => pn.GetNextTask(It.IsAny<Instance>(), "StartEvent_1", It.IsAny<string?>()))
                .ReturnsAsync(() =>
                    new ProcessTask()
                    {
                        Id = "Task_1",
                        Incoming = new List<string> { "Flow_1" },
                        Outgoing = new List<string> { "Flow_2" },
                        Name = "Utfylling",
                        ExtensionElements = new() { TaskExtension = new() { TaskType = "data" } },
                    }
                );
            processNavigatorMock
                .Setup(pn => pn.GetNextTask(It.IsAny<Instance>(), "Task_1", It.IsAny<string?>()))
                .ReturnsAsync(() =>
                    new ProcessTask()
                    {
                        Id = "Task_2",
                        Incoming = new List<string> { "Flow_2" },
                        Outgoing = new List<string> { "Flow_3" },
                        Name = "Bekreft",
                        ExtensionElements = new() { TaskExtension = new() { TaskType = "confirmation" } },
                    }
                );
            processNavigatorMock
                .Setup(pn => pn.GetNextTask(It.IsAny<Instance>(), "Task_2", It.IsAny<string?>()))
                .ReturnsAsync(() =>
                    new EndEvent()
                    {
                        Id = "EndEvent_1",
                        Incoming = new List<string> { "Flow_3" },
                    }
                );
            if (updatedInstance is not null)
            {
                processEventDispatcherMock
                    .Setup(d => d.DispatchToStorage(It.IsAny<Instance>(), It.IsAny<List<InstanceEvent>>()))
                    .ReturnsAsync(() => updatedInstance);
            }

            services.TryAddTransient<IAuthenticationContext>(_ => authenticationContextMock.Object);
            services.TryAddTransient<IProcessNavigator>(_ => processNavigatorMock.Object);
            services.TryAddTransient<IProcessEventHandlerDelegator>(_ => processEventHandlingDelegatorMock.Object);
            services.TryAddTransient<IProcessEventDispatcher>(_ => processEventDispatcherMock.Object);
            services.TryAddTransient<IDataClient>(_ => dataClientMock.Object);
            services.TryAddTransient<IInstanceClient>(_ => instanceClientMock.Object);
            services.TryAddTransient<IAppModel>(_ => appModelMock.Object);
            services.TryAddTransient<IAppMetadata>(_ => appMetadataMock.Object);
            services.TryAddTransient<IAppResources>(_ => appResourcesMock.Object);
            services.TryAddTransient<ITranslationService>(_ => translationServiceMock.Object);
            services.TryAddTransient<InstanceDataUnitOfWorkInitializer>();

            if (registerProcessEnd)
                services.AddSingleton<IProcessEnd>(_ => new Mock<IProcessEnd>().Object);

            services.TryAddTransient<ModelSerializationService>();

            foreach (var userAction in userActions ?? [])
                services.TryAddTransient(_ => userAction);

            return new Fixture(services.BuildStrictServiceProvider());
        }

        public void Dispose() => (ServiceProvider as IDisposable)?.Dispose();
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
