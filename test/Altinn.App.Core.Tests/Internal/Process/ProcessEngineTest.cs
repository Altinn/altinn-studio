using System.Globalization;
using System.Security.Claims;
using Altinn.App.Core.Constants;
using Altinn.App.Core.Extensions;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Action;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.AppModel;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.InstanceLocking;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Internal.WorkflowEngine;
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
    private static readonly Guid _instanceGuid = new("00000000-DEAD-BABE-0000-001230000000");
    private static readonly string _instanceId = $"{_instanceOwnerPartyId}/{_instanceGuid}";

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
        Guid workflowId = Guid.NewGuid();
        processEngineClientMock
            .Setup(c =>
                c.EnqueueWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<string, string, Guid?, WorkflowEnqueueRequest, CancellationToken>(
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
                c.GetWorkflowDependencyGraph(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(CreateWorkflowDependencyGraphResponse(workflowId, "Process next: Task_1 -> Task_2"));
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<Dictionary<string, string>>(),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([]);

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
                "EndTaskLegacyHook",
                "OnTaskEndingHook",
                "LockTaskData",
                // StartTask commands
                "UnlockTaskData",
                "StartTaskLegacyHook",
                "OnTaskStartingHook",
                "CommonTaskInitialization",
                "StartTask",
                "SaveProcessStateToStorage",
                "MovedToAltinnEvent"
            );

        // Verify OperationId contains transition info
        capturedRequest.Workflows[0].OperationId.Should().Be("Process next: Task_1 -> Task_2");
        capturedRequest.Labels.Should().ContainKey("processNextId").WhoseValue.Should().Be("Task_2:3");
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
                    It.IsAny<Guid?>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<string, string, Guid?, WorkflowEnqueueRequest, CancellationToken>(
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
                c.GetWorkflowDependencyGraph(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(CreateWorkflowDependencyGraphResponse(workflowId, "Process next: Task_1 -> Task_2"));
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<Dictionary<string, string>>(),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([]);

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
                "AbandonTaskLegacyHook",
                // StartTask commands
                "UnlockTaskData",
                "StartTaskLegacyHook",
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
                    It.IsAny<Guid?>(),
                    It.IsAny<WorkflowEnqueueRequest>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<string, string, Guid?, WorkflowEnqueueRequest, CancellationToken>(
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
                c.GetWorkflowDependencyGraph(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(CreateWorkflowDependencyGraphResponse(workflowId, "Process next: Task_2 -> EndEvent_1"));
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<Guid?>(),
                    It.IsAny<Dictionary<string, string>>(),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([]);

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
                "EndTaskLegacyHook",
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
        var processEngineClientMock = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<Guid?>(),
                    It.Is<Dictionary<string, string>>(labels => labels["processNextId"] == "Task_1:2"),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    workflowId,
                    "Process next: StartEvent_1 -> Task_1",
                    PersistentItemStatus.Requeued
                ),
            ]);
        processEngineClientMock
            .Setup(c => c.GetWorkflowDependencyGraph(It.IsAny<string>(), workflowId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                CreateWorkflowDependencyGraphResponse(
                    workflowId,
                    CreateWorkflowStatusResponse(
                        workflowId,
                        "Process next: StartEvent_1 -> Task_1",
                        PersistentItemStatus.Requeued
                    )
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
    public async Task Next_blocks_when_current_task_workflow_requires_recovery()
    {
        Guid workflowId = Guid.NewGuid();
        var processEngineClientMock = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<Guid?>(),
                    It.Is<Dictionary<string, string>>(labels => labels["processNextId"] == "Task_1:2"),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    workflowId,
                    "Process next: StartEvent_1 -> Task_1",
                    PersistentItemStatus.Failed
                ),
            ]);
        processEngineClientMock
            .Setup(c => c.GetWorkflowDependencyGraph(It.IsAny<string>(), workflowId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                CreateWorkflowDependencyGraphResponse(
                    workflowId,
                    CreateWorkflowStatusResponse(
                        workflowId,
                        "Process next: StartEvent_1 -> Task_1",
                        PersistentItemStatus.Failed
                    )
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
        result.ProcessNextState.Should().Be(ProcessNextState.RecoveryRequired);
        result.ErrorTitle.Should().Be("Task must be recovered before it can continue.");
    }

    [Fact]
    public async Task RecoverCurrentTask_resumes_failed_workflow_and_returns_updated_instance()
    {
        Guid workflowId = Guid.NewGuid();
        var processEngineClientMock = new Mock<IWorkflowEngineClient>(MockBehavior.Strict);
        processEngineClientMock
            .Setup(c =>
                c.ListWorkflows(
                    It.IsAny<string>(),
                    It.IsAny<Guid?>(),
                    It.Is<Dictionary<string, string>>(labels => labels["processNextId"] == "Task_1:2"),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync([
                CreateWorkflowStatusResponse(
                    workflowId,
                    "Process next: StartEvent_1 -> Task_1",
                    PersistentItemStatus.Failed
                ),
            ]);
        processEngineClientMock
            .SetupSequence(c =>
                c.GetWorkflowDependencyGraph(It.IsAny<string>(), workflowId, It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(
                CreateWorkflowDependencyGraphResponse(
                    workflowId,
                    CreateWorkflowStatusResponse(
                        workflowId,
                        "Process next: StartEvent_1 -> Task_1",
                        PersistentItemStatus.Failed
                    )
                )
            )
            .ReturnsAsync(
                CreateWorkflowDependencyGraphResponse(
                    workflowId,
                    CreateWorkflowStatusResponse(
                        workflowId,
                        "Process next: StartEvent_1 -> Task_1",
                        PersistentItemStatus.Completed
                    )
                )
            );
        processEngineClientMock
            .Setup(c => c.ResumeWorkflow(It.IsAny<string>(), workflowId, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResumeWorkflowResponse(workflowId, DateTimeOffset.UtcNow, []));

        Mock<IInstanceClient> instanceClientMock = new(MockBehavior.Strict);
        Instance originalInstance = CreateTask1Instance();
        Instance recoveredInstance = CreateTask2Instance();
        instanceClientMock
            .Setup(c =>
                c.GetInstance(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(recoveredInstance);

        var services = new ServiceCollection();
        services.AddSingleton(processEngineClientMock.Object);
        services.AddSingleton(instanceClientMock.Object);

        await using var fixture = Fixture.Create(services);
        LegacyProcessEngine processEngine = fixture.ProcessEngine;

        ProcessChangeResult result = await processEngine.RecoverCurrentTask(
            new ProcessNextRequest
            {
                Instance = originalInstance,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        result.Success.Should().BeTrue();
        result.MutatedInstance.Should().BeSameAs(recoveredInstance);
        result.ProcessStateChange.Should().NotBeNull();
        result.ProcessStateChange!.OldProcessState.Should().BeEquivalentTo(originalInstance.Process);
        result.ProcessStateChange.NewProcessState.Should().BeEquivalentTo(recoveredInstance.Process);
        processEngineClientMock.Verify(
            c => c.ResumeWorkflow(It.IsAny<string>(), workflowId, false, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    private static WorkflowStatusResponse CreateCompletedWorkflowStatusResponse(Guid workflowId, string operationId) =>
        CreateWorkflowStatusResponse(workflowId, operationId, PersistentItemStatus.Completed);

    private static WorkflowStatusResponse CreateWorkflowStatusResponse(
        Guid workflowId,
        string operationId,
        PersistentItemStatus overallStatus
    ) =>
        new()
        {
            DatabaseId = workflowId,
            OperationId = operationId,
            IdempotencyKey = "test-idempotency-key",
            Namespace = "org/app",
            CreatedAt = DateTimeOffset.UtcNow,
            UpdatedAt = DateTimeOffset.UtcNow,
            OverallStatus = overallStatus,
            Steps = [],
        };

    private static WorkflowDependencyGraphResponse CreateWorkflowDependencyGraphResponse(
        Guid workflowId,
        string operationId
    ) =>
        CreateWorkflowDependencyGraphResponse(
            workflowId,
            CreateCompletedWorkflowStatusResponse(workflowId, operationId)
        );

    private static WorkflowDependencyGraphResponse CreateWorkflowDependencyGraphResponse(
        Guid workflowId,
        params WorkflowStatusResponse[] workflows
    ) => new() { WorkflowId = workflowId, Workflows = workflows };

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
                        It.IsAny<Guid?>(),
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
                    c.GetWorkflowDependencyGraph(It.IsAny<string>(), It.IsAny<Guid>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(CreateWorkflowDependencyGraphResponse(workflowId, "Process next"));
            processEngineClientMock
                .Setup(c =>
                    c.ListWorkflows(
                        It.IsAny<string>(),
                        It.IsAny<Guid?>(),
                        It.IsAny<Dictionary<string, string>>(),
                        null,
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync([]);
            services.TryAddTransient<IWorkflowEngineClient>(_ => processEngineClientMock.Object);
            services.TryAddTransient<IWorkflowEngineService, WorkflowEngineService>();

            services.TryAddSingleton(new AppIdentifier("org", "app"));
            services.AddSingleton(
                Microsoft.Extensions.Options.Options.Create(
                    new Altinn.App.Core.Configuration.AppSettings { RegisterEventsWithEventsComponent = true }
                )
            );
            services.TryAddTransient<ProcessNextRequestFactory>();
            services.TryAddTransient<InstanceStateService>();

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
