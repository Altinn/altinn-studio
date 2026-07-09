using System.Globalization;
using System.Net;
using System.Security.Claims;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.InstanceLocking;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Process.Elements.AltinnExtensionProperties;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Core.Models.Validation;
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
using LegacyProcessEngine = Altinn.App.Core.Internal.Process.ProcessEngine;
using ProcessEngine = Altinn.App.Core.Internal.Process.ProcessEngine;

namespace Altinn.App.Core.Tests.Internal.Process;

public sealed class ProcessEngineTest
{
    private readonly ITestOutputHelper _output;
    private static readonly int _instanceOwnerPartyId = 1337;
    private static readonly Guid _instanceGuid = new("00000000-ABCD-EF00-0000-001230000000");
    private static readonly string _instanceId = $"{_instanceOwnerPartyId}/{_instanceGuid}";
    private static readonly string _collectionKey = _instanceGuid.ToString();

    public ProcessEngineTest(ITestOutputHelper output)
    {
        _output = output;
    }

    [Fact]
    public async Task Start_returns_error_when_process_already_started()
    {
        await using var fixture = Fixture.Create();
        LegacyProcessEngine processEngine = fixture.ProcessEngine;
        Instance instance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            Process = new ProcessState() { CurrentTask = new ProcessElementInfo() { ElementId = "Task_1" } },
        };
        ProcessStartRequest processStartRequest = new ProcessStartRequest() { Instance = instance };
        ProcessChangeResult result = await processEngine.CreateInitialProcessState(processStartRequest);
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Be("Process is already started. Use next.");
        result.ErrorType.Should().Be(ProcessErrorType.Conflict);
    }

    [Fact]
    public async Task Start_returns_error_when_no_matching_startevent_found()
    {
        Mock<IProcessReader> processReaderMock = new();
        processReaderMock.Setup(r => r.GetStartEventIds()).Returns(new List<string>() { "StartEvent_1" });
        var services = new ServiceCollection();
        services.AddSingleton(processReaderMock.Object);
        await using var fixture = Fixture.Create(services);
        LegacyProcessEngine processEngine = fixture.ProcessEngine;
        Instance instance = new Instance() { Id = _instanceId, AppId = "org/app" };
        ProcessStartRequest processStartRequest = new ProcessStartRequest()
        {
            Instance = instance,
            StartEventId = "NotTheStartEventYouAreLookingFor",
        };
        ProcessChangeResult result = await processEngine.CreateInitialProcessState(processStartRequest);
        fixture.Mock<IProcessReader>().Verify(r => r.GetStartEventIds(), Times.Once);
        result.Success.Should().BeFalse();
        result
            .ErrorMessage.Should()
            .Be("There is no such start event as 'NotTheStartEventYouAreLookingFor' in the process definition.");
        result.ErrorType.Should().Be(ProcessErrorType.Conflict);
    }

    [Theory]
    [ClassData(typeof(TestAuthentication.AllTokens))]
    public async Task Start_calculates_correct_events_for_process_start(TestJwtToken token)
    {
        // Arrange
        var services = new ServiceCollection();

        await using var fixture = Fixture.Create(services, withTelemetry: false, token: token);
        var instanceOwnerPartyId = token.Auth switch
        {
            Authenticated.User auth => auth.SelectedPartyId,
            Authenticated.ServiceOwner => _instanceOwnerPartyId,
            Authenticated.SystemUser auth when await auth.LoadDetails() is { } details => details.Party.PartyId,
            _ => throw new NotImplementedException(),
        };
        var instanceOwnerPartyIdStr = instanceOwnerPartyId.ToString(CultureInfo.InvariantCulture);

        fixture
            .Mock<IAppMetadata>()
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("org/app") { DataTypes = [] });

        LegacyProcessEngine processEngine = fixture.ProcessEngine;
        Instance instance = new Instance()
        {
            Id = $"{instanceOwnerPartyIdStr}/{_instanceGuid}",
            AppId = "org/app",
            InstanceOwner = new InstanceOwner() { PartyId = instanceOwnerPartyIdStr },
            Data = [],
        };

        ProcessStartRequest processStartRequest = new ProcessStartRequest() { Instance = instance, User = null };

        // Act
        ProcessChangeResult result = await processEngine.CreateInitialProcessState(processStartRequest);

        // Assert
        result.Success.Should().BeTrue();
        result.ProcessStateChange.Should().NotBeNull();
        result.ProcessStateChange!.Events.Should().HaveCount(2);

        // Verify first event is process_StartEvent (CurrentTask points to start event at this stage)
        result.ProcessStateChange.Events[0].EventType.Should().Be(InstanceEventType.process_StartEvent.ToString());
        result.ProcessStateChange.Events[0].InstanceId.Should().Be($"{instanceOwnerPartyIdStr}/{_instanceGuid}");
        result.ProcessStateChange.Events[0].ProcessInfo.Should().NotBeNull();
        result.ProcessStateChange.Events[0].ProcessInfo!.StartEvent.Should().Be("StartEvent_1");
        result.ProcessStateChange.Events[0].ProcessInfo.CurrentTask.Should().NotBeNull();
        result.ProcessStateChange.Events[0].ProcessInfo.CurrentTask!.ElementId.Should().Be("StartEvent_1");

        // Verify second event is process_StartTask
        result.ProcessStateChange.Events[1].EventType.Should().Be(InstanceEventType.process_StartTask.ToString());
        result.ProcessStateChange.Events[1].InstanceId.Should().Be($"{instanceOwnerPartyIdStr}/{_instanceGuid}");
        result.ProcessStateChange.Events[1].ProcessInfo.Should().NotBeNull();
        result.ProcessStateChange.Events[1].ProcessInfo!.StartEvent.Should().Be("StartEvent_1");
        result.ProcessStateChange.Events[1].ProcessInfo.CurrentTask.Should().NotBeNull();
        result.ProcessStateChange.Events[1].ProcessInfo.CurrentTask!.ElementId.Should().Be("Task_1");
        result.ProcessStateChange.Events[1].ProcessInfo.CurrentTask.AltinnTaskType.Should().Be("data");

        // Note: CreateInitialProcessState only calculates events, it doesn't submit them.
        // Use SubmitInitialProcessState to actually submit events to the process engine client.
    }

    [Fact]
    public async Task Next_generates_correct_commands_for_task_to_task_transition()
    {
        // Arrange - Mock the process engine client
        var processEngineClientMock = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        WorkflowEnqueueRequest? capturedRequest = null;
        string? capturedCollectionKey = null;
        Guid workflowId = Guid.NewGuid();
        processEngineClientMock
            .Setup(c =>
                c.EnqueueWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<string, string, string?, WorkflowEnqueueRequest, CancellationToken>(
                (_, _, collectionKey, req, _) =>
                {
                    capturedCollectionKey = collectionKey;
                    capturedRequest = req;
                }
            )
            .ReturnsAsync(
                new WorkflowEnqueueResponse.Accepted
                {
                    Workflows = [new WorkflowResult { DatabaseId = workflowId, Namespace = "org/app" }],
                }
            );
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    null,
                    It.IsAny<Dictionary<string, string>>(),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([]);
        processEngineClientMock
            .Setup(c => c.GetCollection(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                (string _, string key, CancellationToken _) =>
                    CreateWorkflowCollectionDetailResponse(
                        key,
                        CreateCollectionHeadStatus(workflowId, PersistentItemStatus.Completed)
                    )
            );
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(It.IsAny<string>(), It.IsAny<string>(), null, null, It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(
                (
                    string _,
                    string? key,
                    Dictionary<string, string>? _,
                    IReadOnlyList<PersistentItemStatus>? _,
                    CancellationToken _
                ) =>
                    [
                        CreateWorkflowStatusResponse(
                            workflowId,
                            "Process next: Task_1 -> Task_2",
                            PersistentItemStatus.Completed,
                            key
                        ),
                    ]
            );

        var services = new ServiceCollection();
        services.AddSingleton(processEngineClientMock.Object);

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

        await using var fixture = Fixture.Create(services);
        fixture
            .Mock<IAppMetadata>()
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("org/app") { DataTypes = [] });

        LegacyProcessEngine processEngine = fixture.ProcessEngine;
        var instance = new Instance()
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

        var processNextRequest = new ProcessNextRequest()
        {
            Instance = instance,
            User = user,
            Action = null,
            Language = null,
        };

        // Act
        ProcessChangeResult result = await processEngine.Next(processNextRequest);

        // Assert
        result.Success.Should().BeTrue();
        capturedRequest.Should().NotBeNull();

        // Verify command sequence: EndTask commands followed by StartTask commands
        var commandKeys = capturedRequest!
            .Workflows[0]
            .Steps.Select(t =>
                t.Command.Type == "app" && t.Command.Data is { } d
                    ? System.Text.Json.JsonSerializer.Deserialize<AppCommandData>(d)?.CommandKey
                    : null
            )
            .Where(k => k != null)
            .ToList();

        commandKeys
            .Should()
            .ContainInOrder(
                // EndTask commands
                "EndTask",
                "CommonTaskFinalization",
                "OnTaskEndingHook",
                "LockTaskData",
                // StartTask commands
                "UnlockTaskData",
                "OnTaskStartingHook",
                "CommonTaskInitialization",
                "StartTask",
                "SaveProcessStateToStorage",
                "MovedToAltinnEvent"
            );

        // Verify OperationId contains transition info
        capturedRequest.Workflows[0].OperationId.Should().Be("Process next: Task_1 -> Task_2");
        capturedRequest
            .Labels.Should()
            .ContainKey(ProcessNextRequestFactory.ProcessNextSourceIdLabel)
            .WhoseValue.Should()
            .Be("Task_1:2");
        capturedRequest
            .Labels.Should()
            .ContainKey(ProcessNextRequestFactory.ProcessNextTargetIdLabel)
            .WhoseValue.Should()
            .Be("Task_2:3");
        capturedRequest
            .Labels.Should()
            .ContainKey(ProcessNextRequestFactory.ProcessNextIdLabel)
            .WhoseValue.Should()
            .Be("Task_2:3");
        capturedCollectionKey.Should().Be(_collectionKey);
    }

    [Fact]
    public async Task Next_generates_correct_commands_for_task_abandon_transition()
    {
        // Arrange
        var processEngineClientMock = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        WorkflowEnqueueRequest? capturedRequest = null;
        Guid workflowId = Guid.NewGuid();
        processEngineClientMock
            .Setup(c =>
                c.EnqueueWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<string, string, string?, WorkflowEnqueueRequest, CancellationToken>(
                (_, _, _, req, _) => capturedRequest = req
            )
            .ReturnsAsync(
                new WorkflowEnqueueResponse.Accepted
                {
                    Workflows = [new WorkflowResult { DatabaseId = workflowId, Namespace = "org/app" }],
                }
            );
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    null,
                    It.IsAny<Dictionary<string, string>>(),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([]);
        processEngineClientMock
            .Setup(c => c.GetCollection(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                (string _, string key, CancellationToken _) =>
                    CreateWorkflowCollectionDetailResponse(
                        key,
                        CreateCollectionHeadStatus(workflowId, PersistentItemStatus.Completed)
                    )
            );
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(It.IsAny<string>(), It.IsAny<string>(), null, null, It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(
                (
                    string _,
                    string? key,
                    Dictionary<string, string>? _,
                    IReadOnlyList<PersistentItemStatus>? _,
                    CancellationToken _
                ) =>
                    [
                        CreateWorkflowStatusResponse(
                            workflowId,
                            "Process next: Task_1 -> Task_2",
                            PersistentItemStatus.Completed,
                            key
                        ),
                    ]
            );

        var services = new ServiceCollection();
        services.AddSingleton(processEngineClientMock.Object);

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

        await using var fixture = Fixture.Create(services);
        fixture
            .Mock<IAppMetadata>()
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("org/app") { DataTypes = [] });

        LegacyProcessEngine processEngine = fixture.ProcessEngine;
        var instance = new Instance()
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

        ClaimsPrincipal user = new(
            new ClaimsIdentity(
                new List<Claim>()
                {
                    new(AltinnCoreClaimTypes.UserId, "1337"),
                    new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
                }
            )
        );

        var processNextRequest = new ProcessNextRequest()
        {
            Instance = instance,
            User = user,
            Action = "reject",
            Language = null,
        };

        // Act
        ProcessChangeResult result = await processEngine.Next(processNextRequest);

        // Assert
        result.Success.Should().BeTrue();
        capturedRequest.Should().NotBeNull();

        // Verify command sequence: AbandonTask commands followed by StartTask commands
        var commandKeys = capturedRequest!
            .Workflows[0]
            .Steps.Select(t =>
                t.Command.Type == "app" && t.Command.Data is { } d
                    ? System.Text.Json.JsonSerializer.Deserialize<AppCommandData>(d)?.CommandKey
                    : null
            )
            .Where(k => k != null)
            .ToList();

        commandKeys
            .Should()
            .ContainInOrder(
                // AbandonTask commands
                "AbandonTask",
                "OnTaskAbandonHook",
                // StartTask commands
                "UnlockTaskData",
                "OnTaskStartingHook",
                "CommonTaskInitialization",
                "StartTask",
                "SaveProcessStateToStorage",
                "MovedToAltinnEvent"
            );
    }

    [Fact]
    public async Task Next_generates_correct_commands_for_task_to_end_transition()
    {
        // Arrange
        var processEngineClientMock = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        WorkflowEnqueueRequest? capturedRequest = null;
        Guid workflowId = Guid.NewGuid();
        processEngineClientMock
            .Setup(c =>
                c.EnqueueWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<string, string, string?, WorkflowEnqueueRequest, CancellationToken>(
                (_, _, _, req, _) => capturedRequest = req
            )
            .ReturnsAsync(
                new WorkflowEnqueueResponse.Accepted
                {
                    Workflows = [new WorkflowResult { DatabaseId = workflowId, Namespace = "org/app" }],
                }
            );
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    null,
                    It.IsAny<Dictionary<string, string>>(),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([]);
        processEngineClientMock
            .Setup(c => c.GetCollection(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                (string _, string key, CancellationToken _) =>
                    CreateWorkflowCollectionDetailResponse(
                        key,
                        CreateCollectionHeadStatus(workflowId, PersistentItemStatus.Completed)
                    )
            );
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(It.IsAny<string>(), It.IsAny<string>(), null, null, It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(
                (
                    string _,
                    string? key,
                    Dictionary<string, string>? _,
                    IReadOnlyList<PersistentItemStatus>? _,
                    CancellationToken _
                ) =>
                    [
                        CreateWorkflowStatusResponse(
                            workflowId,
                            "Process next: Task_2 -> EndEvent_1",
                            PersistentItemStatus.Completed,
                            key
                        ),
                    ]
            );

        var services = new ServiceCollection();
        services.AddSingleton(processEngineClientMock.Object);

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

        await using var fixture = Fixture.Create(services, registerProcessEnd: false);
        fixture
            .Mock<IAppMetadata>()
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("org/app") { DataTypes = [] });

        LegacyProcessEngine processEngine = fixture.ProcessEngine;
        Instance instance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new() { PartyId = _instanceOwnerPartyId.ToString() },
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
            new ClaimsIdentity(
                new List<Claim>()
                {
                    new(AltinnCoreClaimTypes.UserId, "1337"),
                    new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
                }
            )
        );

        var processNextRequest = new ProcessNextRequest()
        {
            User = user,
            Action = null,
            Language = null,
            Instance = instance,
        };

        // Act
        ProcessChangeResult result = await processEngine.Next(processNextRequest);

        // Assert
        result.Success.Should().BeTrue();
        capturedRequest.Should().NotBeNull();

        // Verify command sequence: EndTask commands followed by ProcessEnd commands
        var commandKeys = capturedRequest!
            .Workflows[0]
            .Steps.Select(t =>
                t.Command.Type == "app" && t.Command.Data is { } d
                    ? System.Text.Json.JsonSerializer.Deserialize<AppCommandData>(d)?.CommandKey
                    : null
            )
            .Where(k => k != null)
            .ToList();

        commandKeys
            .Should()
            .ContainInOrder(
                // EndTask commands (see OLD CurrentTask)
                "EndTask",
                "CommonTaskFinalization",
                "OnTaskEndingHook",
                "LockTaskData",
                // Advance in-memory process state to NEW
                "MutateProcessState",
                // ProcessEnd commands (see NEW state)
                "OnProcessEndingHook",
                // Persist to Storage
                "SaveProcessStateToStorage",
                // Post-commit
                "EndProcessLegacyHook",
                "CompletedAltinnEvent"
            );

        // Verify OperationId contains transition info for process end
        capturedRequest.Workflows[0].OperationId.Should().Be("Process next: Task_2 -> EndEvent_1");
    }

    public static TheoryData<ProcessState?, string> InvalidProcessStatesData =>
        new()
        {
            { null, "The instance is missing process information." },
            {
                new ProcessState { Ended = new DateTime() },
                "Process is ended."
            },
            {
                new ProcessState { CurrentTask = null },
                "Process is not started. Use start!"
            },
            {
                new ProcessState
                {
                    CurrentTask = new ProcessElementInfo { ElementId = "elementId", AltinnTaskType = null },
                },
                "Instance does not have current altinn task type information!"
            },
        };

    [Theory]
    [MemberData(nameof(InvalidProcessStatesData))]
    public async Task Next_returns_unsuccessful_for_invalid_process_states(
        ProcessState? processState,
        string expectedErrorMessage
    )
    {
        await using var fixture = Fixture.Create();
        LegacyProcessEngine processEngine = fixture.ProcessEngine;

        var instance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            Process = processState,
        };

        var processNextRequest = new ProcessNextRequest()
        {
            Instance = instance,
            Action = null,
            User = null!,
            Language = null,
        };

        ProcessChangeResult result = await processEngine.Next(processNextRequest);
        result.Success.Should().BeFalse();
        result.ErrorMessage.Should().Be(expectedErrorMessage);
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

        await using var fixture = Fixture.Create(userActions: [userActionMock.Object]);
        fixture
            .Mock<IAppMetadata>()
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("org/app") { DataTypes = [] });

        LegacyProcessEngine processEngine = fixture.ProcessEngine;

        var instance = new Instance()
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

        ProcessChangeResult result = await processEngine.Next(processNextRequest, CancellationToken.None);
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

        var userActionMock = new Mock<IUserAction>(MockBehavior.Strict);
        userActionMock.Setup(u => u.Id).Returns("sign");
        userActionMock
            .Setup(u => u.HandleAction(It.IsAny<UserActionContext>()))
            .ReturnsAsync(
                UserActionResult.FailureResult(
                    error: new ActionError() { Code = "NoUserId", Message = "User id is missing in token" },
                    errorType: ProcessErrorType.Unauthorized
                )
            );

        await using var fixture = Fixture.Create(userActions: [userActionMock.Object]);
        fixture
            .Mock<IAppMetadata>()
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("org/app") { DataTypes = [] });

        LegacyProcessEngine processEngine = fixture.ProcessEngine;

        var instance = new Instance()
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
                    AltinnTaskType = AltinnTaskTypes.Confirmation,
                    Flow = 3,
                    Validated = new() { CanCompleteTask = true },
                },
            },
        };

        ClaimsPrincipal user = new(
            new ClaimsIdentity(new List<Claim>() { new(AltinnCoreClaimTypes.AuthenticationLevel, "2") })
        );

        var processNextRequest = new ProcessNextRequest()
        {
            Instance = instance,
            User = user,
            Action = "sign",
            Language = null,
        };

        ProcessChangeResult result = await processEngine.Next(processNextRequest, CancellationToken.None);
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
                    AltinnTaskType = AltinnTaskTypes.Confirmation,
                    FlowType = ProcessSequenceFlowType.CompleteCurrentMoveToNext.ToString(),
                    Name = "Bekreft",
                },
                StartEvent = "StartEvent_1",
            },
        };

        await using var fixture = Fixture.Create();
        fixture
            .Mock<IAppMetadata>()
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("org/app") { DataTypes = [] });

        LegacyProcessEngine processEngine = fixture.ProcessEngine;

        var instance = new Instance()
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
                    AltinnTaskType = AltinnTaskTypes.Data,
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

        var processNextRequest = new ProcessNextRequest()
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
                        AltinnTaskType = AltinnTaskTypes.Data,
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
                        AltinnTaskType = AltinnTaskTypes.Confirmation,
                        FlowType = ProcessSequenceFlowType.CompleteCurrentMoveToNext.ToString(),
                        Flow = 3,
                    },
                },
            },
        };

        // Note: Removed obsolete verifications for IProcessEventHandlerDelegator and IProcessEventDispatcher
        // These interfaces no longer exist in the new process engine architecture.

        result.Success.Should().BeTrue();
        result
            .ProcessStateChange.Should()
            .BeEquivalentTo(
                new ProcessStateChange()
                {
                    Events = expectedInstanceEvents,
                    NewProcessState = expectedInstance.Process,
                    OldProcessState = originalProcessState,
                },
                options =>
                    options
                        .Excluding(x => x.NewProcessState!.CurrentTask!.Started)
                        .Excluding(x => x.Events![0].Created)
                        .Excluding(x => x.Events![1].Created)
                        .Excluding(x => x.Events![1].ProcessInfo!.CurrentTask!.Started)
            );
    }

    [Fact]
    public async Task Next_DoesNotIssueSecondProcessNext_WhenWorkflowLeavesInstanceAtServiceTask()
    {
        var serviceTask = new Mock<IServiceTask>();
        serviceTask.Setup(x => x.Type).Returns("service");

        var services = new ServiceCollection();
        services.AddSingleton(serviceTask.Object);

        await using var fixture = Fixture.Create(services);
        fixture
            .Mock<IAppMetadata>()
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("org/app") { DataTypes = [] });
        fixture.Mock<IProcessReader>().Setup(r => r.IsEndEvent("Task_Service")).Returns(false);
        fixture.Mock<IProcessReader>().Setup(r => r.IsProcessTask("Task_Service")).Returns(true);
        fixture
            .Mock<IProcessNavigator>()
            .Setup(pn => pn.GetNextTask(It.IsAny<Instance>(), "Task_1", It.IsAny<string?>()))
            .ReturnsAsync(
                new ServiceTask
                {
                    Id = "Task_Service",
                    Incoming = ["Flow_2"],
                    Outgoing = ["Flow_3"],
                    Name = "Service",
                    ExtensionElements = new() { TaskExtension = new() { TaskType = "service" } },
                }
            );

        LegacyProcessEngine processEngine = fixture.ProcessEngine;
        ProcessChangeResult result = await processEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreateTask1Instance(),
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        result.Success.Should().BeTrue();
        result.MutatedInstance.Should().NotBeNull();
        result.MutatedInstance!.Process!.CurrentTask!.ElementId.Should().Be("Task_Service");
        result.MutatedInstance.Process.CurrentTask.AltinnTaskType.Should().Be("service");
        fixture
            .Mock<IProcessNavigator>()
            .Verify(pn => pn.GetNextTask(It.IsAny<Instance>(), "Task_Service", It.IsAny<string?>()), Times.Never);
        fixture
            .Mock<IWorkflowEngineClient>()
            .Verify(
                c =>
                    c.EnqueueWorkflows(
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<string?>(),
                        It.IsAny<WorkflowEnqueueRequest>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
    }

    [Fact]
    public async Task Next_ReportsFinalRefetchedProcessState_WhenWorkflowAutoAdvances()
    {
        Guid workflowId = Guid.NewGuid();
        string collectionKey = _collectionKey;
        var workflowEngineClientMock = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        workflowEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    null,
                    It.IsAny<Dictionary<string, string>>(),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([]);
        workflowEngineClientMock
            .Setup(c =>
                c.EnqueueWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.Is<string?>(key => key == collectionKey),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new WorkflowEnqueueResponse.Accepted
                {
                    Workflows = [new WorkflowResult { DatabaseId = workflowId, Namespace = "org/app" }],
                }
            );
        workflowEngineClientMock
            .Setup(c =>
                c.GetCollection(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                CreateWorkflowCollectionDetailResponse(
                    collectionKey,
                    CreateCollectionHeadStatus(workflowId, PersistentItemStatus.Completed)
                )
            );
        workflowEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    null,
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    workflowId,
                    "Process next: Task_1 -> Task_2",
                    PersistentItemStatus.Completed,
                    collectionKey
                ),
            ]);

        Instance endedInstance = CreateEndedInstance();
        var instanceClientMock = new Mock<IInstanceClient>(MockBehavior.Strict);
        instanceClientMock
            .Setup(c =>
                c.GetInstance(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(endedInstance);

        var services = new ServiceCollection();
        services.AddSingleton(workflowEngineClientMock.Object);
        services.AddSingleton(instanceClientMock.Object);

        await using var fixture = Fixture.Create(services);
        LegacyProcessEngine processEngine = fixture.ProcessEngine;

        ProcessChangeResult result = await processEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreateTask1Instance(),
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        result.Success.Should().BeTrue();
        result.MutatedInstance.Should().BeSameAs(endedInstance);
        result.ProcessStateChange.Should().NotBeNull();
        result.ProcessStateChange!.NewProcessState.Should().BeSameAs(endedInstance.Process);
        result.ProcessStateChange.NewProcessState!.Ended.Should().NotBeNull();
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
                    AltinnTaskType = AltinnTaskTypes.Confirmation,
                    FlowType = ProcessSequenceFlowType.AbandonCurrentMoveToNext.ToString(),
                    Name = "Bekreft",
                },
                StartEvent = "StartEvent_1",
            },
        };
        await using var fixture = Fixture.Create();
        fixture
            .Mock<IAppMetadata>()
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("org/app") { DataTypes = [] });
        LegacyProcessEngine processEngine = fixture.ProcessEngine;
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
                    AltinnTaskType = AltinnTaskTypes.Data,
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
                        AltinnTaskType = AltinnTaskTypes.Data,
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
                        AltinnTaskType = AltinnTaskTypes.Confirmation,
                        FlowType = ProcessSequenceFlowType.AbandonCurrentMoveToNext.ToString(),
                        Flow = 3,
                    },
                },
            },
        };

        // Note: Removed obsolete verifications for IProcessEventHandlerDelegator and IProcessEventDispatcher
        // These interfaces no longer exist in the new process engine architecture.

        result.Success.Should().BeTrue();
        result
            .ProcessStateChange.Should()
            .BeEquivalentTo(
                new ProcessStateChange()
                {
                    Events = expectedInstanceEvents,
                    NewProcessState = expectedInstance.Process,
                    OldProcessState = originalProcessState,
                },
                options =>
                    options
                        .Excluding(x => x.NewProcessState!.CurrentTask!.Started)
                        .Excluding(x => x.Events![0].Created)
                        .Excluding(x => x.Events![1].Created)
                        .Excluding(x => x.Events![1].ProcessInfo!.CurrentTask!.Started)
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
        await using var fixture = Fixture.Create(registerProcessEnd: registerProcessEnd, withTelemetry: useTelemetry);
        fixture
            .Mock<IAppMetadata>()
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(new ApplicationMetadata("org/app") { DataTypes = [] });

        if (registerProcessEnd)
        {
            fixture
                .Mock<IProcessEnd>()
                .Setup(x => x.End(It.IsAny<Instance>(), It.IsAny<List<InstanceEvent>>()))
                .Verifiable(Times.Once);
        }

        LegacyProcessEngine processEngine = fixture.ProcessEngine;
        InstanceOwner instanceOwner = new() { PartyId = _instanceOwnerPartyId.ToString() };
        Instance instance = new Instance()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = instanceOwner,
            Data = [],
            Process = new ProcessState()
            {
                StartEvent = "StartEvent_1",
                CurrentTask = new()
                {
                    ElementId = "Task_2",
                    AltinnTaskType = AltinnTaskTypes.Confirmation,
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

        var processNextRequest = new ProcessNextRequest()
        {
            User = user,
            Action = null,
            Language = null,
            Instance = instance,
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
                        AltinnTaskType = AltinnTaskTypes.Confirmation,
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

        // Note: Removed obsolete verifications for IProcessEventHandlerDelegator and IProcessEventDispatcher
        // These interfaces no longer exist in the new process engine architecture.
        // Note: IProcessEnd.End is no longer called directly by ProcessEngine in the new architecture.
        // Process end logic is now handled via HTTP process engine commands.

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
                },
                options =>
                    options
                        .Excluding(x => x.NewProcessState!.Ended)
                        .Excluding(x => x.Events![0].Created)
                        .Excluding(x => x.Events![1].Created)
                        .Excluding(x => x.Events![1].ProcessInfo!.Ended)
                        .Excluding(x => x.Events![2].Created)
                        .Excluding(x => x.Events![2].ProcessInfo!.Ended)
            );
    }

    [Fact]
    public async Task Next_blocks_when_current_task_workflow_is_retrying()
    {
        Guid workflowId = Guid.NewGuid();
        string collectionKey = _collectionKey;
        var processEngineClientMock = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    null,
                    It.Is<Dictionary<string, string>>(labels => MatchesCurrentTaskLookupLabel(labels, "Task_1:2")),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    workflowId,
                    "Process next: StartEvent_1 -> Task_1",
                    PersistentItemStatus.Requeued,
                    collectionKey
                ),
            ]);
        processEngineClientMock
            .Setup(c =>
                c.GetCollection(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                CreateWorkflowCollectionDetailResponse(
                    collectionKey,
                    CreateCollectionHeadStatus(workflowId, PersistentItemStatus.Requeued)
                )
            );

        var services = new ServiceCollection();
        services.AddSingleton(processEngineClientMock.Object);

        await using var fixture = Fixture.Create(services);
        LegacyProcessEngine processEngine = fixture.ProcessEngine;

        ProcessChangeResult result = await processEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreateTask1Instance(),
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        result.Success.Should().BeFalse();
        result.ErrorType.Should().Be(ProcessErrorType.Conflict);
        result.ProcessNextState.Should().Be(ProcessNextState.Retrying);
        result.ErrorTitle.Should().Be("Task is still being processed.");
    }

    [Fact]
    public async Task Next_blocks_when_current_task_workflow_requires_resume()
    {
        Guid workflowId = Guid.NewGuid();
        string collectionKey = _collectionKey;
        var processEngineClientMock = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    null,
                    It.Is<Dictionary<string, string>>(labels => MatchesCurrentTaskLookupLabel(labels, "Task_1:2")),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    workflowId,
                    "Process next: StartEvent_1 -> Task_1",
                    PersistentItemStatus.Failed,
                    collectionKey
                ),
            ]);
        processEngineClientMock
            .Setup(c =>
                c.GetCollection(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                CreateWorkflowCollectionDetailResponse(
                    collectionKey,
                    CreateCollectionHeadStatus(workflowId, PersistentItemStatus.Failed)
                )
            );
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    null,
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    workflowId,
                    "Process next: StartEvent_1 -> Task_1",
                    PersistentItemStatus.Failed,
                    collectionKey
                ),
            ]);

        var services = new ServiceCollection();
        services.AddSingleton(processEngineClientMock.Object);

        await using var fixture = Fixture.Create(services);
        LegacyProcessEngine processEngine = fixture.ProcessEngine;

        ProcessChangeResult result = await processEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreateTask1Instance(),
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        result.Success.Should().BeFalse();
        result.ErrorType.Should().Be(ProcessErrorType.Conflict);
        result.ProcessNextState.Should().Be(ProcessNextState.ResumeRequired);
        result.ErrorTitle.Should().Be("Task must be resumed before it can continue.");
    }

    [Fact]
    public async Task Next_blocks_when_source_task_workflow_requires_resume()
    {
        Guid workflowId = Guid.NewGuid();
        string collectionKey = _collectionKey;
        var processEngineClientMock = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    null,
                    It.Is<Dictionary<string, string>>(labels =>
                        IsProcessNextLabel(labels, ProcessNextRequestFactory.ProcessNextSourceIdLabel, "Task_1:2")
                    ),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    workflowId,
                    "Process next: Task_1 -> Task_2",
                    PersistentItemStatus.Failed,
                    collectionKey
                ),
            ]);
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    null,
                    It.Is<Dictionary<string, string>>(labels =>
                        MatchesCurrentTaskLookupLabel(labels, "Task_1:2")
                        && !labels.ContainsKey(ProcessNextRequestFactory.ProcessNextSourceIdLabel)
                    ),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([]);
        processEngineClientMock
            .Setup(c =>
                c.GetCollection(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                CreateWorkflowCollectionDetailResponse(
                    collectionKey,
                    CreateCollectionHeadStatus(workflowId, PersistentItemStatus.Failed)
                )
            );
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    null,
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    workflowId,
                    "Process next: Task_1 -> Task_2",
                    PersistentItemStatus.Failed,
                    collectionKey
                ),
            ]);

        var services = new ServiceCollection();
        services.AddSingleton(processEngineClientMock.Object);

        await using var fixture = Fixture.Create(services);
        LegacyProcessEngine processEngine = fixture.ProcessEngine;

        ProcessChangeResult result = await processEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreateTask1Instance(),
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        result.Success.Should().BeFalse();
        result.ErrorType.Should().Be(ProcessErrorType.Conflict);
        result.ProcessNextState.Should().Be(ProcessNextState.ResumeRequired);
        result.ErrorTitle.Should().Be("Task must be resumed before it can continue.");
        processEngineClientMock.Verify(
            c =>
                c.EnqueueWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Next_reject_abandons_failed_workflow_and_proceeds()
    {
        Guid failedWorkflowId = Guid.NewGuid();
        Guid rejectWorkflowId = Guid.NewGuid();
        string collectionKey = _collectionKey;
        bool failedWorkflowAbandoned = false;

        var processEngineClientMock = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    null,
                    It.Is<Dictionary<string, string>>(labels =>
                        IsProcessNextLabel(labels, ProcessNextRequestFactory.ProcessNextSourceIdLabel, "Task_1:2")
                    ),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    failedWorkflowId,
                    "Process next: Task_1 -> Task_2",
                    PersistentItemStatus.Failed,
                    collectionKey
                ),
            ]);
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    null,
                    It.Is<Dictionary<string, string>>(labels =>
                        MatchesCurrentTaskLookupLabel(labels, "Task_1:2")
                        && !labels.ContainsKey(ProcessNextRequestFactory.ProcessNextSourceIdLabel)
                    ),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([]);
        processEngineClientMock
            .Setup(c =>
                c.GetCollection(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (string _, string key, CancellationToken _) =>
                    CreateWorkflowCollectionDetailResponse(
                        key,
                        failedWorkflowAbandoned
                            ? CreateCollectionHeadStatus(rejectWorkflowId, PersistentItemStatus.Completed)
                            : CreateCollectionHeadStatus(failedWorkflowId, PersistentItemStatus.Failed)
                    )
            );
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    null,
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (
                    string _,
                    string? key,
                    Dictionary<string, string>? _,
                    IReadOnlyList<PersistentItemStatus>? _,
                    CancellationToken _
                ) =>
                    failedWorkflowAbandoned
                        ?
                        [
                            CreateWorkflowStatusResponse(
                                rejectWorkflowId,
                                "Process next: Task_1 -> Task_2",
                                PersistentItemStatus.Completed,
                                key
                            ),
                        ]
                        :
                        [
                            CreateWorkflowStatusResponse(
                                failedWorkflowId,
                                "Process next: Task_1 -> Task_2",
                                PersistentItemStatus.Failed,
                                key
                            ),
                        ]
            );
        processEngineClientMock
            .Setup(c => c.AbandonWorkflow(It.IsAny<string>(), failedWorkflowId, It.IsAny<CancellationToken>()))
            .Callback(() => failedWorkflowAbandoned = true)
            .ReturnsAsync(true);
        processEngineClientMock
            .Setup(c =>
                c.EnqueueWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new WorkflowEnqueueResponse.Accepted
                {
                    Workflows = [new WorkflowResult { DatabaseId = rejectWorkflowId, Namespace = "org/app" }],
                }
            );

        var services = new ServiceCollection();
        services.AddSingleton(processEngineClientMock.Object);

        await using var fixture = Fixture.Create(services);
        fixture
            .Mock<IProcessReader>()
            .Setup(r => r.GetAltinnTaskExtension("Task_1"))
            .Returns(new AltinnTaskExtension { AltinnActions = [new AltinnAction("reject")] });
        LegacyProcessEngine processEngine = fixture.ProcessEngine;

        ProcessChangeResult result = await processEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreateTask1Instance(),
                User = CreateUserClaimsPrincipal(),
                Action = "reject",
                Language = null,
            }
        );

        // The failed workflow was written off (-> Abandoned) before the reject was enqueued,
        // so the reject's ordinary dependency on it lets the reject run.
        result.Success.Should().BeTrue();
        processEngineClientMock.Verify(
            c => c.AbandonWorkflow(It.IsAny<string>(), failedWorkflowId, It.IsAny<CancellationToken>()),
            Times.Once
        );
        processEngineClientMock.Verify(
            c =>
                c.EnqueueWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Next_reject_blocks_as_retrying_when_abandon_loses_race_with_concurrent_resume()
    {
        Guid failedWorkflowId = Guid.NewGuid();
        string collectionKey = _collectionKey;
        var processEngineClientMock = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    null,
                    It.Is<Dictionary<string, string>>(labels =>
                        IsProcessNextLabel(labels, ProcessNextRequestFactory.ProcessNextSourceIdLabel, "Task_1:2")
                    ),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    failedWorkflowId,
                    "Process next: Task_1 -> Task_2",
                    PersistentItemStatus.Failed,
                    collectionKey
                ),
            ]);
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    null,
                    It.Is<Dictionary<string, string>>(labels =>
                        MatchesCurrentTaskLookupLabel(labels, "Task_1:2")
                        && !labels.ContainsKey(ProcessNextRequestFactory.ProcessNextSourceIdLabel)
                    ),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([]);
        processEngineClientMock
            .Setup(c =>
                c.GetCollection(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                CreateWorkflowCollectionDetailResponse(
                    collectionKey,
                    CreateCollectionHeadStatus(failedWorkflowId, PersistentItemStatus.Failed)
                )
            );
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    null,
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    failedWorkflowId,
                    "Process next: Task_1 -> Task_2",
                    PersistentItemStatus.Failed,
                    collectionKey
                ),
            ]);
        // A concurrent resume revived the workflow between the state read and the write-off:
        // the engine's compare-and-set rejects the abandon.
        processEngineClientMock
            .Setup(c => c.AbandonWorkflow(It.IsAny<string>(), failedWorkflowId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var services = new ServiceCollection();
        services.AddSingleton(processEngineClientMock.Object);

        await using var fixture = Fixture.Create(services);
        fixture
            .Mock<IProcessReader>()
            .Setup(r => r.GetAltinnTaskExtension("Task_1"))
            .Returns(new AltinnTaskExtension { AltinnActions = [new AltinnAction("reject")] });
        LegacyProcessEngine processEngine = fixture.ProcessEngine;

        ProcessChangeResult result = await processEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreateTask1Instance(),
                User = CreateUserClaimsPrincipal(),
                Action = "reject",
                Language = null,
            }
        );

        result.Success.Should().BeFalse();
        result.ErrorType.Should().Be(ProcessErrorType.Conflict);
        result.ProcessNextState.Should().Be(ProcessNextState.Retrying);
        result.ErrorTitle.Should().Be("Task is still being processed.");
        processEngineClientMock.Verify(
            c =>
                c.EnqueueWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    [Fact]
    public async Task Next_reject_returns_retryable_failure_when_enqueue_fails_after_abandon()
    {
        Guid failedWorkflowId = Guid.NewGuid();
        string collectionKey = _collectionKey;
        var processEngineClientMock = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    null,
                    It.Is<Dictionary<string, string>>(labels =>
                        IsProcessNextLabel(labels, ProcessNextRequestFactory.ProcessNextSourceIdLabel, "Task_1:2")
                    ),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    failedWorkflowId,
                    "Process next: Task_1 -> Task_2",
                    PersistentItemStatus.Failed,
                    collectionKey
                ),
            ]);
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    null,
                    It.Is<Dictionary<string, string>>(labels =>
                        MatchesCurrentTaskLookupLabel(labels, "Task_1:2")
                        && !labels.ContainsKey(ProcessNextRequestFactory.ProcessNextSourceIdLabel)
                    ),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([]);
        processEngineClientMock
            .Setup(c =>
                c.GetCollection(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                CreateWorkflowCollectionDetailResponse(
                    collectionKey,
                    CreateCollectionHeadStatus(failedWorkflowId, PersistentItemStatus.Failed)
                )
            );
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    null,
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    failedWorkflowId,
                    "Process next: Task_1 -> Task_2",
                    PersistentItemStatus.Failed,
                    collectionKey
                ),
            ]);
        processEngineClientMock
            .Setup(c => c.AbandonWorkflow(It.IsAny<string>(), failedWorkflowId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        // The engine definitively rejects the superseding reject after the abandon succeeded.
        processEngineClientMock
            .Setup(c =>
                c.EnqueueWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(
                new HttpRequestException(
                    "Engine rejected the workflow.",
                    inner: null,
                    statusCode: HttpStatusCode.UnprocessableEntity
                )
            );

        var services = new ServiceCollection();
        services.AddSingleton(processEngineClientMock.Object);

        await using var fixture = Fixture.Create(services);
        fixture
            .Mock<IProcessReader>()
            .Setup(r => r.GetAltinnTaskExtension("Task_1"))
            .Returns(new AltinnTaskExtension { AltinnActions = [new AltinnAction("reject")] });
        LegacyProcessEngine processEngine = fixture.ProcessEngine;

        ProcessChangeResult result = await processEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreateTask1Instance(),
                User = CreateUserClaimsPrincipal(),
                Action = "reject",
                Language = null,
            }
        );

        // The write-off stands (the engine released the abandoned workflow's idempotency key),
        // so the caller must be told the reject failed to submit but is safe to retry.
        result.Success.Should().BeFalse();
        result.ErrorType.Should().Be(ProcessErrorType.Internal);
        result.ErrorTitle.Should().Be("The reject was not submitted.");
        result.ErrorMessage.Should().Contain("Try the reject again");
        processEngineClientMock.Verify(
            c => c.AbandonWorkflow(It.IsAny<string>(), failedWorkflowId, It.IsAny<CancellationToken>()),
            Times.Once
        );
        processEngineClientMock.Verify(
            c =>
                c.EnqueueWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Next_repeated_reject_reuses_fingerprint_after_engine_releases_abandoned_key()
    {
        // Scenario: a workflow fails, a reject supersedes it, and that reject workflow ALSO fails
        // terminally. The user rejects again from the failure screen. The second reject re-enqueues
        // with the same idempotency fingerprint (instance|flow|task|action is unchanged, since the
        // failed transitions never committed). The engine releases a workflow's idempotency key
        // when it is abandoned, so the re-enqueue must be accepted as a fresh workflow instead of
        // deduplicating onto (or conflicting with) the abandoned one.
        DateTimeOffset baseTime = DateTimeOffset.UtcNow.AddMinutes(-10);
        Guid originalFailedWorkflowId = Guid.NewGuid();
        Guid firstRejectWorkflowId = Guid.NewGuid();
        Guid secondRejectWorkflowId = Guid.NewGuid();
        string collectionKey = _collectionKey;

        var workflowStatuses = new Dictionary<Guid, PersistentItemStatus>
        {
            [originalFailedWorkflowId] = PersistentItemStatus.Failed,
        };
        var workflowCreatedAt = new Dictionary<Guid, DateTimeOffset> { [originalFailedWorkflowId] = baseTime };
        var enqueuedIdempotencyKeys = new List<string>();
        var abandonedWorkflowIds = new List<Guid>();

        WorkflowStatusResponse Snapshot(Guid workflowId) =>
            new()
            {
                DatabaseId = workflowId,
                OperationId = "Process next: Task_1 -> Task_2",
                IdempotencyKey = "test-idempotency-key",
                Namespace = "org/app",
                CollectionKey = collectionKey,
                CreatedAt = workflowCreatedAt[workflowId],
                UpdatedAt = workflowCreatedAt[workflowId],
                OverallStatus = workflowStatuses[workflowId],
                Steps = [],
            };
        IReadOnlyList<WorkflowStatusResponse> SnapshotAll() => workflowStatuses.Keys.Select(Snapshot).ToList();

        var processEngineClientMock = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    null,
                    It.IsAny<Dictionary<string, string>>(),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(SnapshotAll);
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    null,
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(SnapshotAll);
        processEngineClientMock
            .Setup(c =>
                c.GetCollection(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (string _, string _, CancellationToken _) =>
                    CreateWorkflowCollectionDetailResponse(
                        collectionKey,
                        workflowStatuses.Select(entry => CreateCollectionHeadStatus(entry.Key, entry.Value)).ToArray()
                    )
            );
        processEngineClientMock
            .Setup(c => c.AbandonWorkflow(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>()))
            .Callback(
                (string _, Guid workflowId, CancellationToken _) =>
                {
                    abandonedWorkflowIds.Add(workflowId);
                    workflowStatuses[workflowId] = PersistentItemStatus.Abandoned;
                }
            )
            .ReturnsAsync(true);
        processEngineClientMock
            .Setup(c =>
                c.EnqueueWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<string?>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Returns(
                (string _, string idempotencyKey, string? _, WorkflowEnqueueRequest _, CancellationToken _) =>
                {
                    enqueuedIdempotencyKeys.Add(idempotencyKey);

                    // First reject: accepted, but the workflow fails terminally.
                    // Second reject: same fingerprint, accepted again as a fresh workflow that
                    // completes - the abandoned workflow's key was released.
                    bool isFirstReject = enqueuedIdempotencyKeys.Count == 1;
                    Guid newWorkflowId = isFirstReject ? firstRejectWorkflowId : secondRejectWorkflowId;
                    workflowStatuses[newWorkflowId] = isFirstReject
                        ? PersistentItemStatus.Failed
                        : PersistentItemStatus.Completed;
                    workflowCreatedAt[newWorkflowId] = baseTime.AddMinutes(enqueuedIdempotencyKeys.Count);
                    return Task.FromResult<WorkflowEnqueueResponse.Accepted>(
                        new WorkflowEnqueueResponse.Accepted
                        {
                            Workflows = [new WorkflowResult { DatabaseId = newWorkflowId, Namespace = "org/app" }],
                        }
                    );
                }
            );

        var services = new ServiceCollection();
        services.AddSingleton(processEngineClientMock.Object);

        await using var fixture = Fixture.Create(services);
        fixture
            .Mock<IProcessReader>()
            .Setup(r => r.GetAltinnTaskExtension("Task_1"))
            .Returns(new AltinnTaskExtension { AltinnActions = [new AltinnAction("reject")] });
        LegacyProcessEngine processEngine = fixture.ProcessEngine;

        ProcessNextRequest CreateRejectRequest() =>
            new()
            {
                Instance = CreateTask1Instance(),
                User = CreateUserClaimsPrincipal(),
                Action = "reject",
                Language = null,
            };

        // First reject: supersedes the original failure, but the reject workflow itself fails.
        ProcessChangeResult firstResult = await processEngine.Next(CreateRejectRequest());
        firstResult.Success.Should().BeFalse();
        firstResult.WorkflowFailure.Should().NotBeNull();

        // Second reject: supersedes the failed reject workflow and succeeds.
        ProcessChangeResult secondResult = await processEngine.Next(CreateRejectRequest());
        secondResult.Success.Should().BeTrue();

        abandonedWorkflowIds.Should().Equal(originalFailedWorkflowId, firstRejectWorkflowId);
        enqueuedIdempotencyKeys.Should().HaveCount(2);
        enqueuedIdempotencyKeys[1]
            .Should()
            .Be(enqueuedIdempotencyKeys[0], "the retried reject reuses the fingerprint the abandoned workflow held");
    }

    [Fact]
    public async Task GetCurrentTaskWorkflowState_returns_unblocked_when_newest_workflow_completed()
    {
        Guid workflowId = Guid.NewGuid();
        string collectionKey = _collectionKey;
        var processEngineClientMock = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    null,
                    It.Is<Dictionary<string, string>>(labels => MatchesCurrentTaskLookupLabel(labels, "Task_1:2")),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    workflowId,
                    "Process next: StartEvent_1 -> Task_1",
                    PersistentItemStatus.Completed,
                    collectionKey
                ),
            ]);
        processEngineClientMock
            .Setup(c =>
                c.GetCollection(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                CreateWorkflowCollectionDetailResponse(
                    collectionKey,
                    CreateCollectionHeadStatus(workflowId, PersistentItemStatus.Completed)
                )
            );
        var services = new ServiceCollection();
        services.AddSingleton(processEngineClientMock.Object);

        await using var fixture = Fixture.Create(services);
        IWorkflowEngineService workflowEngineService =
            fixture.ServiceProvider.GetRequiredService<IWorkflowEngineService>();

        CurrentTaskWorkflowState result = await workflowEngineService.GetCurrentTaskWorkflowState(
            CreateTask1Instance()
        );

        result.Should().BeOfType<CurrentTaskWorkflowState.Unblocked>();
    }

    [Fact]
    public async Task GetCurrentTaskWorkflowState_fetches_a_shared_collection_key_once()
    {
        // Every matching workflow shares the instance's collection key, so the state lookup
        // must not repeat the identical GetCollection call per workflow.
        string collectionKey = _collectionKey;
        var processEngineClientMock = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    null,
                    It.Is<Dictionary<string, string>>(labels => MatchesCurrentTaskLookupLabel(labels, "Task_1:2")),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    Guid.NewGuid(),
                    "Process next: StartEvent_1 -> Task_1",
                    PersistentItemStatus.Completed,
                    collectionKey
                ),
                CreateWorkflowStatusResponse(
                    Guid.NewGuid(),
                    "Process next: Task_1 -> Task_2",
                    PersistentItemStatus.Completed,
                    collectionKey
                ),
            ]);
        processEngineClientMock
            .Setup(c =>
                c.GetCollection(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                CreateWorkflowCollectionDetailResponse(
                    collectionKey,
                    CreateCollectionHeadStatus(Guid.NewGuid(), PersistentItemStatus.Completed)
                )
            );
        var services = new ServiceCollection();
        services.AddSingleton(processEngineClientMock.Object);

        await using var fixture = Fixture.Create(services);
        IWorkflowEngineService workflowEngineService =
            fixture.ServiceProvider.GetRequiredService<IWorkflowEngineService>();

        CurrentTaskWorkflowState result = await workflowEngineService.GetCurrentTaskWorkflowState(
            CreateTask1Instance()
        );

        result.Should().BeOfType<CurrentTaskWorkflowState.Unblocked>();
        processEngineClientMock.Verify(
            c => c.GetCollection(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task EnqueueAndWaitForProcessNext_completes_when_collection_heads_complete()
    {
        Guid workflowId = Guid.NewGuid();
        string collectionKey = _collectionKey;
        var processEngineClientMock = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        processEngineClientMock
            .Setup(c =>
                c.EnqueueWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.Is<string?>(key => key == collectionKey),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new WorkflowEnqueueResponse.Accepted
                {
                    Workflows = [new WorkflowResult { DatabaseId = workflowId, Namespace = "org/app" }],
                }
            );
        processEngineClientMock
            .Setup(c =>
                c.GetCollection(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                CreateWorkflowCollectionDetailResponse(
                    collectionKey,
                    CreateCollectionHeadStatus(workflowId, PersistentItemStatus.Completed)
                )
            );
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    null,
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    workflowId,
                    "Process next: Task_1 -> Task_2",
                    PersistentItemStatus.Completed,
                    collectionKey
                ),
            ]);

        Mock<IInstanceClient> instanceClientMock = new(MockBehavior.Strict);
        Instance instance = CreateTask1Instance();
        Instance updatedInstance = CreateTask2Instance();
        instanceClientMock
            .Setup(c =>
                c.GetInstance(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(updatedInstance);

        var services = new ServiceCollection();
        services.AddSingleton(processEngineClientMock.Object);
        services.AddSingleton(instanceClientMock.Object);

        await using var fixture = Fixture.Create(services);
        IWorkflowEngineService workflowEngineService =
            fixture.ServiceProvider.GetRequiredService<IWorkflowEngineService>();

        ProcessNextWorkflowResult result = await workflowEngineService.EnqueueAndWaitForProcessNext(
            instance,
            new ProcessStateChange
            {
                OldProcessState = instance.Process,
                NewProcessState = updatedInstance.Process,
                Events = [],
            },
            resolvedAction: "complete",
            lockToken: "lock-token"
        );

        result.WorkflowFailure.Should().BeNull();
        result.ProcessStateChanged.Should().BeFalse();
        result.Instance.Should().BeSameAs(updatedInstance);
    }

    [Fact]
    public async Task EnqueueAndWaitForProcessNext_waits_when_enqueue_response_is_lost_but_collection_exists()
    {
        Guid workflowId = Guid.NewGuid();
        string collectionKey = _collectionKey;
        var processEngineClientMock = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        processEngineClientMock
            .Setup(c =>
                c.EnqueueWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.Is<string?>(key => key == collectionKey),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ThrowsAsync(new HttpRequestException("Response was lost."));
        processEngineClientMock
            .Setup(c =>
                c.GetCollection(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                CreateWorkflowCollectionDetailResponse(
                    collectionKey,
                    CreateCollectionHeadStatus(workflowId, PersistentItemStatus.Completed)
                )
            );
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    null,
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    workflowId,
                    "Process next: Task_1 -> Task_2",
                    PersistentItemStatus.Completed,
                    collectionKey
                ),
            ]);

        Mock<IInstanceClient> instanceClientMock = new(MockBehavior.Strict);
        Instance instance = CreateTask1Instance();
        Instance updatedInstance = CreateTask2Instance();
        instanceClientMock
            .Setup(c =>
                c.GetInstance(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(updatedInstance);

        var services = new ServiceCollection();
        services.AddSingleton(processEngineClientMock.Object);
        services.AddSingleton(instanceClientMock.Object);

        await using var fixture = Fixture.Create(services);
        IWorkflowEngineService workflowEngineService =
            fixture.ServiceProvider.GetRequiredService<IWorkflowEngineService>();

        ProcessNextWorkflowResult result = await workflowEngineService.EnqueueAndWaitForProcessNext(
            instance,
            new ProcessStateChange
            {
                OldProcessState = instance.Process,
                NewProcessState = updatedInstance.Process,
                Events = [],
            },
            resolvedAction: "complete",
            lockToken: "lock-token"
        );

        result.WorkflowFailure.Should().BeNull();
        result.Instance.Should().BeSameAs(updatedInstance);
    }

    [Fact]
    public async Task SubmitInitialProcessState_throws_workflow_execution_failure_when_accepted_workflow_fails()
    {
        Instance instance = CreateTask1Instance();
        WorkflowFailure workflowFailure = new()
        {
            Kind = WorkflowFailureKind.StepFailed,
            WorkflowId = Guid.NewGuid(),
            StepOperationId = "NotifyInstanceOwnerOnInstantiation",
            RetryAction = "resumeWorkflow",
            LastError = new WorkflowFailureError { Message = "Notification failed" },
        };

        Mock<IWorkflowEngineService> workflowEngineServiceMock = new(MockBehavior.Strict);
        workflowEngineServiceMock
            .Setup(service =>
                service.EnqueueAndWaitForProcessNext(
                    It.IsAny<Instance>(),
                    It.IsAny<ProcessStateChange>(),
                    "start",
                    "lock-token",
                    It.IsAny<string>(),
                    true,
                    null,
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new ProcessNextWorkflowResult(instance, workflowFailure, ProcessStateChanged: true));

        var services = new ServiceCollection();
        services.AddSingleton(workflowEngineServiceMock.Object);

        await using var fixture = Fixture.Create(services);

        ProcessStateChange processStateChange = new()
        {
            OldProcessState = null,
            NewProcessState = instance.Process,
            Events = [],
        };

        WorkflowExecutionFailedException exception = await Assert.ThrowsAsync<WorkflowExecutionFailedException>(() =>
            fixture.ProcessEngine.SubmitInitialProcessState(
                instance,
                processStateChange,
                "lock-token",
                isInstantiation: true
            )
        );

        exception.Instance.Should().BeSameAs(instance);
        exception.WorkflowFailure.Should().BeSameAs(workflowFailure);
        exception.ProcessStateChanged.Should().BeTrue();
        exception.Message.Should().Be("Notification failed");
    }

    [Fact]
    public async Task ResumeCurrentTask_resumes_failed_workflow_and_returns_updated_instance()
    {
        Guid workflowId = Guid.NewGuid();
        string collectionKey = _collectionKey;
        var processEngineClientMock = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    null,
                    It.Is<Dictionary<string, string>>(labels => MatchesCurrentTaskLookupLabel(labels, "Task_1:2")),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    workflowId,
                    "Process next: StartEvent_1 -> Task_1",
                    PersistentItemStatus.Failed,
                    collectionKey
                ),
            ]);
        processEngineClientMock
            .SetupSequence(c =>
                c.GetCollection(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                CreateWorkflowCollectionDetailResponse(
                    collectionKey,
                    CreateCollectionHeadStatus(workflowId, PersistentItemStatus.Failed)
                )
            )
            .ReturnsAsync(
                CreateWorkflowCollectionDetailResponse(
                    collectionKey,
                    CreateCollectionHeadStatus(workflowId, PersistentItemStatus.Completed)
                )
            );
        processEngineClientMock
            .SetupSequence(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    It.Is<string>(key => key == collectionKey),
                    null,
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    workflowId,
                    "Process next: StartEvent_1 -> Task_1",
                    PersistentItemStatus.Failed,
                    collectionKey
                ),
            ])
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    workflowId,
                    "Process next: StartEvent_1 -> Task_1",
                    PersistentItemStatus.Completed,
                    collectionKey
                ),
            ]);
        processEngineClientMock
            .Setup(c => c.ResumeWorkflow(It.IsAny<string>(), workflowId, true, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResumeWorkflowResponse(workflowId, DateTimeOffset.UtcNow, []));

        Mock<IInstanceClient> instanceClientMock = new(MockBehavior.Strict);
        Instance originalInstance = CreateTask1Instance();
        Instance resumedInstance = CreateTask2Instance();
        instanceClientMock
            .Setup(c =>
                c.GetInstance(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(resumedInstance);

        var services = new ServiceCollection();
        services.AddSingleton(processEngineClientMock.Object);
        services.AddSingleton(instanceClientMock.Object);

        await using var fixture = Fixture.Create(services);
        LegacyProcessEngine processEngine = fixture.ProcessEngine;

        ProcessChangeResult result = await processEngine.ResumeCurrentTask(
            new ProcessNextRequest
            {
                Instance = originalInstance,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        result.Success.Should().BeTrue();
        result.MutatedInstance.Should().BeSameAs(resumedInstance);
        result.ProcessStateChange.Should().NotBeNull();
        result.ProcessStateChange!.OldProcessState.Should().BeEquivalentTo(originalInstance.Process);
        result.ProcessStateChange.NewProcessState.Should().BeEquivalentTo(resumedInstance.Process);
        processEngineClientMock.Verify(
            c => c.ResumeWorkflow(It.IsAny<string>(), workflowId, true, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task EnqueueProcessNext_ServiceOwnerActor_PreservesPlatformUser()
    {
        // Arrange
        var workflowEngineServiceMock = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        ProcessStateChange? capturedStateChange = null;
        workflowEngineServiceMock
            .Setup(x =>
                x.EnqueueDependentProcessNext(
                    It.IsAny<Instance>(),
                    It.IsAny<ProcessStateChange>(),
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<Actor>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<Instance, ProcessStateChange, string, Guid, string, string, Actor, CancellationToken>(
                (_, processStateChange, _, _, _, _, _, _) => capturedStateChange = processStateChange
            )
            .ReturnsAsync(Guid.NewGuid());

        var services = new ServiceCollection();
        services.AddSingleton(workflowEngineServiceMock.Object);

        await using var fixture = Fixture.Create(services);
        LegacyProcessEngine processEngine = fixture.ProcessEngine;

        var actor = new Actor { OrgId = TestAuthentication.DefaultOrg, AuthenticationLevel = 3 };

        // Act
        await processEngine.EnqueueProcessNext(
            CreateTask1Instance(),
            actor,
            "test-lock-token",
            Guid.NewGuid(),
            _collectionKey,
            "state"
        );

        // Assert
        capturedStateChange.Should().NotBeNull();
        capturedStateChange!.Events.Should().HaveCount(2);
        capturedStateChange
            .Events[0]
            .User.Should()
            .BeEquivalentTo(new PlatformUser { OrgId = TestAuthentication.DefaultOrg, AuthenticationLevel = 3 });
        capturedStateChange
            .Events[1]
            .User.Should()
            .BeEquivalentTo(new PlatformUser { OrgId = TestAuthentication.DefaultOrg, AuthenticationLevel = 3 });
    }

    [Fact]
    public async Task EnqueueProcessNext_SystemUserActor_PreservesPlatformUser()
    {
        // Arrange
        var workflowEngineServiceMock = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        ProcessStateChange? capturedStateChange = null;
        workflowEngineServiceMock
            .Setup(x =>
                x.EnqueueDependentProcessNext(
                    It.IsAny<Instance>(),
                    It.IsAny<ProcessStateChange>(),
                    It.IsAny<string>(),
                    It.IsAny<Guid>(),
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<Actor>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<Instance, ProcessStateChange, string, Guid, string, string, Actor, CancellationToken>(
                (_, processStateChange, _, _, _, _, _, _) => capturedStateChange = processStateChange
            )
            .ReturnsAsync(Guid.NewGuid());

        var services = new ServiceCollection();
        services.AddSingleton(workflowEngineServiceMock.Object);

        await using var fixture = Fixture.Create(services);
        LegacyProcessEngine processEngine = fixture.ProcessEngine;

        var actor = new Actor
        {
            AuthenticationLevel = 3,
            SystemUserId = Guid.Parse(TestAuthentication.DefaultSystemUserId),
            SystemUserOwnerOrgNo = TestAuthentication.DefaultSystemUserOrgNumber,
        };

        // Act
        await processEngine.EnqueueProcessNext(
            CreateTask1Instance(),
            actor,
            "test-lock-token",
            Guid.NewGuid(),
            _collectionKey,
            "state"
        );

        // Assert
        capturedStateChange.Should().NotBeNull();
        capturedStateChange!.Events.Should().HaveCount(2);
        capturedStateChange
            .Events[0]
            .User.Should()
            .BeEquivalentTo(
                new PlatformUser
                {
                    SystemUserId = Guid.Parse(TestAuthentication.DefaultSystemUserId),
                    SystemUserOwnerOrgNo = TestAuthentication.DefaultSystemUserOrgNumber,
                    SystemUserName = null,
                    AuthenticationLevel = 3,
                }
            );
        capturedStateChange
            .Events[1]
            .User.Should()
            .BeEquivalentTo(
                new PlatformUser
                {
                    SystemUserId = Guid.Parse(TestAuthentication.DefaultSystemUserId),
                    SystemUserOwnerOrgNo = TestAuthentication.DefaultSystemUserOrgNumber,
                    SystemUserName = null,
                    AuthenticationLevel = 3,
                }
            );
    }

    private static WorkflowStatusResponse CreateCompletedWorkflowStatusResponse(Guid workflowId, string operationId) =>
        CreateWorkflowStatusResponse(workflowId, operationId, PersistentItemStatus.Completed);

    private static bool MatchesCurrentTaskLookupLabel(Dictionary<string, string> labels, string processNextId) =>
        HasInstanceGuidLabel(labels)
        && labels.Any(label =>
            label.Value == processNextId
            && (
                label.Key == ProcessNextRequestFactory.ProcessNextSourceIdLabel
                || label.Key == ProcessNextRequestFactory.ProcessNextTargetIdLabel
                || label.Key == ProcessNextRequestFactory.ProcessNextIdLabel
            )
        );

    private static bool IsProcessNextLabel(Dictionary<string, string> labels, string labelKey, string processNextId) =>
        HasInstanceGuidLabel(labels) && labels.TryGetValue(labelKey, out string? value) && value == processNextId;

    private static bool HasInstanceGuidLabel(Dictionary<string, string> labels) =>
        labels.Count == 2
        && labels.TryGetValue(ProcessNextRequestFactory.ProcessNextInstanceGuidLabel, out string? value)
        && value == _instanceGuid.ToString("N");

    private static WorkflowCollectionDetailResponse CreateWorkflowCollectionDetailResponse(
        string key,
        params CollectionHeadStatus[] heads
    ) =>
        new()
        {
            Key = key,
            Namespace = "org/app",
            Heads = heads,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
        };

    private static CollectionHeadStatus CreateCollectionHeadStatus(Guid workflowId, PersistentItemStatus status) =>
        new() { DatabaseId = workflowId, Status = status };

    private static WorkflowStatusResponse CreateWorkflowStatusResponse(
        Guid workflowId,
        string operationId,
        PersistentItemStatus overallStatus,
        string? collectionKey = null
    ) =>
        new()
        {
            DatabaseId = workflowId,
            OperationId = operationId,
            IdempotencyKey = "test-idempotency-key",
            Namespace = "org/app",
            CollectionKey = collectionKey,
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            OverallStatus = overallStatus,
            Steps = [],
        };

    private static ClaimsPrincipal CreateUserClaimsPrincipal() =>
        new(
            new ClaimsIdentity(
                new List<Claim>()
                {
                    new(AltinnCoreClaimTypes.UserId, "1337"),
                    new(AltinnCoreClaimTypes.AuthenticationLevel, "2"),
                }
            )
        );

    private static Instance CreateTask1Instance() =>
        new()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            Data = [],
            Process = new ProcessState()
            {
                StartEvent = "StartEvent_1",
                CurrentTask = new()
                {
                    ElementId = "Task_1",
                    AltinnTaskType = AltinnTaskTypes.Data,
                    Flow = 2,
                    Validated = new() { CanCompleteTask = true },
                },
            },
        };

    private static Instance CreateTask2Instance() =>
        new()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            Data = [],
            Process = new ProcessState()
            {
                StartEvent = "StartEvent_1",
                CurrentTask = new()
                {
                    ElementId = "Task_2",
                    AltinnTaskType = AltinnTaskTypes.Confirmation,
                    Flow = 3,
                    FlowType = ProcessSequenceFlowType.CompleteCurrentMoveToNext.ToString(),
                    Name = "Bekreft",
                },
            },
        };

    private static Instance CreateEndedInstance() =>
        new()
        {
            Id = _instanceId,
            AppId = "org/app",
            InstanceOwner = new InstanceOwner() { PartyId = "1337" },
            Data = [],
            Process = new ProcessState()
            {
                StartEvent = "StartEvent_1",
                CurrentTask = null,
                Ended = DateTime.UtcNow,
                EndEvent = "EndEvent_1",
            },
        };

    private sealed record Fixture(IServiceProvider ServiceProvider) : IAsyncDisposable
    {
        public LegacyProcessEngine ProcessEngine =>
            (LegacyProcessEngine)ServiceProvider.GetRequiredService<IProcessEngine>();

        public TelemetrySink TelemetrySink => ServiceProvider.GetRequiredService<TelemetrySink>();

        public Mock<T> Mock<T>()
            where T : class => Moq.Mock.Get(ServiceProvider.GetRequiredService<T>());

        public static Fixture Create(
            ServiceCollection? services = null,
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

            services.TryAddTransient<IProcessEngine, LegacyProcessEngine>();
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
            Mock<IDataClient> dataClientMock = new(MockBehavior.Strict);
            Mock<IInstanceClient> instanceClientMock = new(MockBehavior.Strict);
            instanceClientMock
                .Setup(c =>
                    c.GetInstance(
                        It.IsAny<Instance>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync((Instance i, StorageAuthenticationMethod? _, CancellationToken _) => i);
            Mock<IAppModel> appModelMock = new(MockBehavior.Strict);
            Mock<IAppMetadata> appMetadataMock = new(MockBehavior.Strict);
            Mock<IAppResources> appResourcesMock = new(MockBehavior.Strict);
            Mock<ITranslationService> translationServiceMock = new(MockBehavior.Strict);
            Mock<IInstanceLocker> instanceLockerMock = new(MockBehavior.Strict);
            instanceLockerMock.Setup(x => x.InitLock()).Returns(Moq.Mock.Of<IInstanceLock>());
            instanceLockerMock.Setup(x => x.CurrentLockToken).Returns("test-lock-token");
            var appMetadata = new ApplicationMetadata("org/app") { DataTypes = [] };
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
                        ExtensionElements = new() { TaskExtension = new() { TaskType = AltinnTaskTypes.Data } },
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
                        ExtensionElements = new() { TaskExtension = new() { TaskType = AltinnTaskTypes.Confirmation } },
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

            var processEngineAuthorizerMock = new Mock<IProcessEngineAuthorizer>(MockBehavior.Strict);
            processEngineAuthorizerMock
                .Setup(x => x.AuthorizeProcessNext(It.IsAny<Instance>(), It.IsAny<string>()))
                .ReturnsAsync(true);
            ;

            var validationServiceMock = new Mock<IValidationService>(MockBehavior.Strict);
            validationServiceMock
                .Setup(v =>
                    v.ValidateInstanceAtTask(
                        It.IsAny<IInstanceDataAccessor>(),
                        It.IsAny<string>(),
                        It.IsAny<List<string>>(),
                        null,
                        null
                    )
                )
                .ReturnsAsync(new List<ValidationIssueWithSource>());

            services.TryAddTransient<IAuthenticationContext>(_ => authenticationContextMock.Object);
            services.TryAddTransient<IProcessNavigator>(_ => processNavigatorMock.Object);
            services.TryAddTransient<IProcessEngineAuthorizer>(_ => processEngineAuthorizerMock.Object);
            services.TryAddTransient<IDataClient>(_ => dataClientMock.Object);
            services.TryAddTransient<IInstanceClient>(_ => instanceClientMock.Object);
            services.TryAddTransient<IAppModel>(_ => appModelMock.Object);
            services.TryAddTransient<IAppMetadata>(_ => appMetadataMock.Object);
            services.TryAddTransient<IAppResources>(_ => appResourcesMock.Object);
            services.TryAddTransient<ITranslationService>(_ => translationServiceMock.Object);
            services.TryAddTransient<InstanceDataUnitOfWorkInitializer>();
            services.TryAddTransient<IValidationService>(_ => validationServiceMock.Object);
            services.TryAddTransient<IInstanceLocker>(_ => instanceLockerMock.Object);

            var processEngineClientMock = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
            Guid workflowId = Guid.NewGuid();
            processEngineClientMock
                .Setup(c =>
                    c.EnqueueWorkflows(
                        It.IsAny<string>(),
                        It.IsAny<string>(),
                        It.IsAny<string?>(),
                        It.IsAny<WorkflowEnqueueRequest>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(
                    new WorkflowEnqueueResponse.Accepted
                    {
                        Workflows = [new WorkflowResult { DatabaseId = workflowId, Namespace = "org/app" }],
                    }
                );
            processEngineClientMock
                .Setup(c =>
                    c.ListWorkflows(
                        It.IsAny<string>(),
                        null,
                        It.IsAny<Dictionary<string, string>>(),
                        null,
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync([]);
            processEngineClientMock
                .Setup(c =>
                    c.ListWorkflows(It.IsAny<string>(), It.IsAny<string>(), null, null, It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(
                    (
                        string _,
                        string? collectionKey,
                        Dictionary<string, string>? _,
                        IReadOnlyList<PersistentItemStatus>? _,
                        CancellationToken _
                    ) =>
                        [
                            CreateWorkflowStatusResponse(
                                workflowId,
                                "Process next",
                                PersistentItemStatus.Completed,
                                collectionKey
                            ),
                        ]
                );
            processEngineClientMock
                .Setup(c => c.GetCollection(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(
                    (string _, string key, CancellationToken _) =>
                        CreateWorkflowCollectionDetailResponse(
                            key,
                            CreateCollectionHeadStatus(workflowId, PersistentItemStatus.Completed)
                        )
                );
            services.TryAddTransient<IWorkflowEngineClient>(_ => processEngineClientMock.Object);
            services.TryAddTransient<IWorkflowEngineService, WorkflowEngineService>();

            services.TryAddSingleton(new AppIdentifier("org", "app"));
            services.AddSingleton(
                Microsoft.Extensions.Options.Options.Create(
                    new Altinn.App.Core.Configuration.AppSettings { RegisterEventsWithEventsComponent = true }
                )
            );
            var callbackTokenGeneratorMock = new Mock<IWorkflowCallbackTokenGenerator>(MockBehavior.Strict);
            callbackTokenGeneratorMock.Setup(g => g.GenerateToken(It.IsAny<Guid>())).Returns("test-callback-token");
            services.TryAddTransient<IWorkflowCallbackTokenGenerator>(_ => callbackTokenGeneratorMock.Object);

            // WorkflowCallbackStateService now signs the captured state with WorkflowStateSigner, which needs
            // a callback secret. Provide a deterministic non-expired code so capture produces a real envelope.
            var secretProviderMock = new Mock<IWorkflowCallbackSecretProvider>(MockBehavior.Strict);
            var stateSigningCode = new Altinn.App.Core.Infrastructure.Clients.Secrets.AppCode
            {
                Id = "test-secret-id",
                Code = "test-state-signing-secret-long-enough",
                IssuedAt = DateTimeOffset.UtcNow.AddDays(-1),
                ExpiresAt = DateTimeOffset.UtcNow.AddDays(186),
            };
            secretProviderMock.Setup(p => p.GetSigningSecret()).Returns(stateSigningCode);
            secretProviderMock.Setup(p => p.GetValidationSecrets()).Returns([stateSigningCode]);
            services.TryAddSingleton<IWorkflowCallbackSecretProvider>(_ => secretProviderMock.Object);

            services.TryAddTransient<ProcessNextRequestFactory>();
            services.TryAddTransient<WorkflowStateSigner>();
            services.TryAddTransient<WorkflowCallbackStateService>();

            if (registerProcessEnd)
                services.AddSingleton<IProcessEnd>(_ => new Mock<IProcessEnd>().Object);

            services.TryAddTransient<ModelSerializationService>();

            foreach (var userAction in userActions ?? [])
                services.TryAddTransient(_ => userAction);

            return new Fixture(services.BuildStrictServiceProvider());
        }

        public ValueTask DisposeAsync()
        {
            if (ServiceProvider is IAsyncDisposable asyncDisposable)
            {
                return asyncDisposable.DisposeAsync();
            }

            if (ServiceProvider is IDisposable disposable)
            {
                disposable.Dispose();
            }

            return ValueTask.CompletedTask;
        }
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
