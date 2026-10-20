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
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process;
using Altinn.App.Core.Internal.Process.Elements;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.Validation;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Core.Models.UserAction;
using Altinn.App.Core.Models.Validation;
using Altinn.Platform.Profile.Models;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using AltinnCore.Authentication.Constants;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using LegacyProcessEngine = Altinn.App.Core.Internal.Process.ProcessEngine;

namespace Altinn.App.Core.Tests.Internal.Process;

public sealed partial class ProcessEngineTest
{
    private static readonly int _instanceOwnerPartyId = 1337;
    private static readonly Guid _instanceGuid = new("00000000-ABCD-EF00-0000-001230000000");
    private static readonly string _instanceId = $"{_instanceOwnerPartyId}/{_instanceGuid}";
    private static readonly StorageVersionMetadata _storageVersions = new(InstanceVersion: 1, ProcessStateVersion: 1);

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
            .Setup(x => x.ApplicationMetadata)
            .Returns(new ApplicationMetadata("org/app") { DataTypes = [] });

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
        Assert.Null(result.ProcessStateChange.Events[0].ProcessInfo.CurrentTask.Started);
        Assert.NotNull(result.ProcessStateChange.Events[0].Created);

        // Verify second event is process_StartTask
        result.ProcessStateChange.Events[1].EventType.Should().Be(InstanceEventType.process_StartTask.ToString());
        result.ProcessStateChange.Events[1].InstanceId.Should().Be($"{instanceOwnerPartyIdStr}/{_instanceGuid}");
        result.ProcessStateChange.Events[1].ProcessInfo.Should().NotBeNull();
        result.ProcessStateChange.Events[1].ProcessInfo!.StartEvent.Should().Be("StartEvent_1");
        result.ProcessStateChange.Events[1].ProcessInfo.CurrentTask.Should().NotBeNull();
        result.ProcessStateChange.Events[1].ProcessInfo.CurrentTask!.ElementId.Should().Be("Task_1");
        result.ProcessStateChange.Events[1].ProcessInfo.CurrentTask.AltinnTaskType.Should().Be("data");
        Assert.NotNull(result.ProcessStateChange.Events[1].Created);
        Assert.Equal(
            result.ProcessStateChange.Events[1].Created,
            result.ProcessStateChange.Events[1].ProcessInfo.CurrentTask.Started
        );

        // Note: CreateInitialProcessState only calculates events, it doesn't submit them.
        // Use SubmitInitialProcessState to actually submit events to the process engine client.
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
        SetupWorkflowResult(fixture, expectedInstance);
        fixture
            .Mock<IAppMetadata>()
            .Setup(x => x.ApplicationMetadata)
            .Returns(new ApplicationMetadata("org/app") { DataTypes = [] });

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
            InstanceVersions = _storageVersions,
            User = user,
            Action = "sign",
            Language = null,
        };

        ProcessChangeResult result = await processEngine.Next(processNextRequest, CancellationToken.None);
        result.Success.Should().BeTrue();
        result.ErrorType.Should().Be(null);
    }

    [Fact]
    public async Task Next_WithUserActionDataWrite_CapturesPostActionStorageVersionsInWorkflowState()
    {
        Guid dataElementGuid = Guid.NewGuid();
        DataElement dataElement = new()
        {
            Id = dataElementGuid.ToString(),
            InstanceGuid = _instanceGuid.ToString(),
            DataType = "payment",
            ContentType = "application/json",
            Filename = "payment.json",
        };
        byte[] initialBytes = System.Text.Encoding.UTF8.GetBytes("""{"status":"created"}""");
        byte[] updatedBytes = System.Text.Encoding.UTF8.GetBytes("""{"status":"paid"}""");

        Mock<IUserAction> userActionMock = new(MockBehavior.Strict);
        userActionMock.Setup(u => u.Id).Returns("sign");
        userActionMock
            .Setup(u => u.HandleAction(It.IsAny<UserActionContext>()))
            .ReturnsAsync(
                (UserActionContext context) =>
                {
                    context.DataMutator.UpdateBinaryDataElement(dataElement, dataElement.ContentType!, updatedBytes);
                    return UserActionResult.SuccessResult();
                }
            );

        Mock<IDataClient> dataClientMock = new(MockBehavior.Strict);
        Mock<IDataClientWithStorageMetadata> dataClientWithStorageMetadataMock =
            dataClientMock.As<IDataClientWithStorageMetadata>();
        Mock<IInstanceMutationClient> mutationClientMock = dataClientMock.As<IInstanceMutationClient>();
        dataClientWithStorageMetadataMock
            .Setup(c =>
                c.GetDataBytesWithExpectedBlobVersionId(
                    _instanceOwnerPartyId,
                    _instanceGuid,
                    dataElementGuid,
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(initialBytes);
        dataClientWithStorageMetadataMock
            .Setup(c =>
                c.UpdateBinaryDataWithStorageMetadata(
                    It.Is<InstanceIdentifier>(id =>
                        id.InstanceOwnerPartyId == _instanceOwnerPartyId && id.InstanceGuid == _instanceGuid
                    ),
                    dataElement.ContentType,
                    dataElement.Filename,
                    dataElementGuid,
                    It.IsAny<Stream>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.Is<StorageWritePreconditions?>(preconditions =>
                        preconditions != null
                        && preconditions.ProcessStateVersion == 1
                        && preconditions.InstanceVersion == null
                    ),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new DataElementWithStorageMetadata(
                    dataElement,
                    new StorageVersionMetadata(InstanceVersion: 6, ProcessStateVersion: 1)
                )
            );

        string? capturedState = null;
        StorageVersionMetadata? capturedVersions = null;
        var workflowService = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        workflowService
            .Setup(service =>
                service.EnqueueAndWaitForProcessNext(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageVersionMetadata>(),
                    It.IsAny<string>(),
                    It.IsAny<ProcessStateChange>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<Instance, StorageVersionMetadata, string, ProcessStateChange, string?, CancellationToken>(
                (_, versions, state, _, _, _) =>
                {
                    capturedVersions = versions;
                    capturedState = state;
                }
            )
            .ReturnsAsync(new ProcessNextWorkflowResult(CreateEndedInstance(), _storageVersions, null, true));

        Instance instance = CreateTask2Instance();
        instance.Data = [dataElement];
        Instance postActionInstance = CreateTask2Instance();
        postActionInstance.Data = [dataElement];
        postActionInstance.DataValues = new Dictionary<string, string> { ["snapshot"] = "post-action-authoritative" };
        var versions = new StorageVersionMetadata(InstanceVersion: 5, ProcessStateVersion: 1);
        var instanceClientMock = new Mock<IInstanceClientWithStorageMetadata>(MockBehavior.Strict);
        instanceClientMock
            .Setup(c =>
                c.GetInstanceWithStorageMetadata(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new InstanceWithStorageMetadata(
                    postActionInstance,
                    new StorageVersionMetadata(InstanceVersion: 7, ProcessStateVersion: 2)
                )
            );
        var services = new ServiceCollection();
        services.AddSingleton<IDataClient>(dataClientMock.Object);
        services.AddSingleton<IDataClientWithStorageMetadata>(dataClientWithStorageMetadataMock.Object);
        services.AddSingleton<IInstanceMutationClient>(mutationClientMock.Object);
        services.AddSingleton(workflowService.Object);
        services.AddSingleton(instanceClientMock.Object);

        await using var fixture = Fixture.Create(services, userActions: [userActionMock.Object]);
        fixture
            .Mock<IAppMetadata>()
            .Setup(x => x.ApplicationMetadata)
            .Returns(
                new ApplicationMetadata("org/app")
                {
                    DataTypes =
                    [
                        new DataType
                        {
                            Id = "payment",
                            AllowedContentTypes = ["application/json"],
                            TaskId = "Task_2",
                        },
                    ],
                }
            );
        fixture
            .Mock<IValidationService>()
            .Setup(v =>
                v.ValidateInstanceAtTask(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<string>(),
                    It.IsAny<List<string>>(),
                    null,
                    null
                )
            )
            .Callback<IInstanceDataAccessor, string, List<string>?, bool?, string?>(
                (dataAccessor, _, _, _, _) => dataAccessor.Instance.Should().BeSameAs(postActionInstance)
            )
            .ReturnsAsync([]);
        LegacyProcessEngine processEngine = fixture.ProcessEngine;
        mutationClientMock
            .Setup(c =>
                c.CommitInstanceMutationWithStorageMetadata(
                    _instanceOwnerPartyId,
                    _instanceGuid,
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.Is<StorageWritePreconditions?>(preconditions =>
                        preconditions != null
                        && preconditions.ProcessStateVersion == 1
                        && preconditions.InstanceVersion == null
                    ),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new InstanceMutationWithStorageMetadata(
                    instance,
                    new StorageVersionMetadata(InstanceVersion: 6, ProcessStateVersion: 1)
                )
            );
        ProcessChangeResult result = await processEngine.Next(
            new ProcessNextRequest
            {
                Instance = instance,
                User = CreateUserClaimsPrincipal(),
                Action = "sign",
                Language = null,
                InstanceVersions = versions,
            },
            CancellationToken.None
        );

        result.Success.Should().BeTrue();
        Assert.Equal(new StorageVersionMetadata(InstanceVersion: 7, ProcessStateVersion: 2), capturedVersions);
        string state = Assert.IsType<string>(capturedState);
        using System.Text.Json.JsonDocument envelope = System.Text.Json.JsonDocument.Parse(state);
        string payload = envelope.RootElement.GetProperty("payload").GetString()!;
        using System.Text.Json.JsonDocument document = System.Text.Json.JsonDocument.Parse(payload);
        document.RootElement.GetProperty("instanceVersion").GetInt32().Should().Be(7);
        document.RootElement.GetProperty("processStateVersion").GetInt32().Should().Be(2);
        WorkflowCallbackState callbackState =
            System.Text.Json.JsonSerializer.Deserialize<WorkflowCallbackState>(payload)
            ?? throw new InvalidOperationException("Failed to deserialize captured workflow state.");
        callbackState.Instance.DataValues["snapshot"].Should().Be("post-action-authoritative");
    }

    [Fact]
    public async Task Next_WithDirectWritingSigningAction_ResyncsWholeAuthoritativeSnapshotBeforeValidationAndEnqueue()
    {
        // The handler deliberately stages nothing on the unit of work. This models SigningUserAction's
        // direct Storage sign call: the only way ProcessEngine can observe the persisted signature and
        // Storage-assigned versions is the authoritative post-handler instance refresh.
        bool handlerRan = false;
        Mock<IUserAction> userActionMock = new(MockBehavior.Strict);
        userActionMock.Setup(action => action.Id).Returns("sign");
        userActionMock
            .Setup(action => action.HandleAction(It.IsAny<UserActionContext>()))
            .Callback(() => handlerRan = true)
            .ReturnsAsync(UserActionResult.SuccessResult());

        Instance requestInstance = CreateTask2Instance();
        Instance authoritativePostSignInstance = CreateTask2Instance();
        authoritativePostSignInstance.DataValues = new Dictionary<string, string> { ["signature"] = "persisted" };
        var authoritativeVersions = new StorageVersionMetadata(InstanceVersion: 21, ProcessStateVersion: 13);
        var instanceClient = new Mock<IInstanceClientWithStorageMetadata>(MockBehavior.Strict);
        instanceClient
            .Setup(client =>
                client.GetInstanceWithStorageMetadata(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(authoritativePostSignInstance, authoritativeVersions));

        Instance? enqueuedInstance = null;
        StorageVersionMetadata? enqueuedVersions = null;
        string? enqueuedState = null;
        var workflowService = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        workflowService
            .Setup(service =>
                service.EnqueueAndWaitForProcessNext(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageVersionMetadata>(),
                    It.IsAny<string>(),
                    It.IsAny<ProcessStateChange>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<Instance, StorageVersionMetadata, string, ProcessStateChange, string?, CancellationToken>(
                (instance, versions, state, _, _, _) =>
                {
                    enqueuedInstance = instance;
                    enqueuedVersions = versions;
                    enqueuedState = state;
                }
            )
            .ReturnsAsync(
                new ProcessNextWorkflowResult(
                    CreateEndedInstance(),
                    new StorageVersionMetadata(InstanceVersion: 22, ProcessStateVersion: 14),
                    WorkflowFailure: null,
                    ProcessStateCommitted: true
                )
            );

        var services = new ServiceCollection();
        services.AddSingleton(instanceClient.Object);
        services.AddSingleton(workflowService.Object);
        await using var fixture = Fixture.Create(services, userActions: [userActionMock.Object]);
        fixture
            .Mock<IValidationService>()
            .Setup(validation =>
                validation.ValidateInstanceAtTask(
                    It.IsAny<IInstanceDataAccessor>(),
                    It.IsAny<string>(),
                    It.IsAny<List<string>>(),
                    null,
                    It.IsAny<string?>()
                )
            )
            .Callback<IInstanceDataAccessor, string, List<string>?, bool?, string?>(
                (dataAccessor, _, _, _, _) =>
                {
                    handlerRan.Should().BeTrue();
                    dataAccessor.Instance.Should().BeSameAs(authoritativePostSignInstance);
                    dataAccessor
                        .Should()
                        .BeOfType<InstanceDataUnitOfWork>()
                        .Which.StorageVersions.Should()
                        .Be(authoritativeVersions);
                }
            )
            .ReturnsAsync([]);

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = requestInstance,
                InstanceVersions = new StorageVersionMetadata(InstanceVersion: 20, ProcessStateVersion: 12),
                User = CreateUserClaimsPrincipal(),
                Action = "sign",
                Language = "nb",
            },
            CancellationToken.None
        );

        result.Success.Should().BeTrue();
        enqueuedInstance.Should().BeSameAs(authoritativePostSignInstance);
        enqueuedVersions.Should().Be(authoritativeVersions);
        enqueuedState.Should().NotBeNull();
        string payload = fixture
            .ServiceProvider.GetRequiredService<WorkflowStateSigner>()
            .Verify(enqueuedState!, SigningDomain.CallbackState);
        WorkflowCallbackState callbackState =
            System.Text.Json.JsonSerializer.Deserialize<WorkflowCallbackState>(payload)
            ?? throw new InvalidOperationException("Failed to deserialize captured workflow state.");
        callbackState.Instance.DataValues["signature"].Should().Be("persisted");
        callbackState.InstanceVersion.Should().Be(21);
        callbackState.ProcessStateVersion.Should().Be(13);
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
            .Setup(x => x.ApplicationMetadata)
            .Returns(new ApplicationMetadata("org/app") { DataTypes = [] });

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
    public async Task Next_returns_committed_state_after_task_transition()
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
            .Setup(x => x.ApplicationMetadata)
            .Returns(new ApplicationMetadata("org/app") { DataTypes = [] });

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
            InstanceVersions = _storageVersions,
            User = user,
            Action = null,
            Language = null,
        };

        SetupWorkflowResult(fixture, expectedInstance);
        ProcessChangeResult result = await processEngine.Next(processNextRequest);

        result.Success.Should().BeTrue();
        result
            .ProcessStateChange.Should()
            .BeEquivalentTo(
                new ProcessStateChange()
                {
                    NewProcessState = expectedInstance.Process,
                    OldProcessState = originalProcessState,
                },
                options => options.Excluding(x => x.NewProcessState!.CurrentTask!.Started)
            );
    }

    [Fact]
    public async Task Next_DoesNotIssueSecondProcessNext_WhenWorkflowLeavesInstanceAtServiceTask()
    {
        await using var fixture = Fixture.Create();
        var committed = CreateTask2Instance();
        committed.Process.CurrentTask.ElementId = "Task_Service";
        committed.Process.CurrentTask.AltinnTaskType = "service";
        SetupWorkflowResult(fixture, committed);

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreateTask1Instance(),
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        Assert.True(result.Success);
        Assert.Same(committed, result.MutatedInstance);
        fixture
            .Mock<IProcessNavigator>()
            .Verify(
                navigator =>
                    navigator.GetNextTask(It.IsAny<IInstanceDataAccessor>(), "Task_Service", It.IsAny<string?>()),
                Times.Never
            );
        fixture
            .Mock<IWorkflowEngineService>()
            .Verify(
                service =>
                    service.EnqueueAndWaitForProcessNext(
                        It.IsAny<Instance>(),
                        It.IsAny<StorageVersionMetadata>(),
                        It.IsAny<string>(),
                        It.IsAny<ProcessStateChange>(),
                        It.IsAny<string?>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
    }

    [Fact]
    public async Task Next_ReportsFinalWorkflowResult_WhenServiceTaskAdvancesTheProcess()
    {
        await using var fixture = Fixture.Create();
        Instance ended = CreateEndedInstance();
        var versions = new StorageVersionMetadata(InstanceVersion: 21, ProcessStateVersion: 11);
        SetupWorkflowResult(fixture, ended, versions);

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreateTask1Instance(),
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        Assert.True(result.Success);
        Assert.Same(ended, result.MutatedInstance);
        Assert.Equal(versions, result.MutatedInstanceVersions);
        Assert.Same(ended.Process, result.ProcessStateChange.NewProcessState);
        Assert.NotNull(result.ProcessStateChange.NewProcessState);
        Assert.NotNull(result.ProcessStateChange.NewProcessState.Ended);
    }

    [Fact]
    public async Task Next_CapturesTheSubmittedSnapshotBeforeEnqueue()
    {
        await using var fixture = Fixture.Create();
        Instance submitted = CreateTask1Instance();
        submitted.Process.Status = ProcessStatus.Idle;
        string? capturedState = null;
        fixture
            .Mock<IWorkflowEngineService>()
            .Setup(service =>
                service.EnqueueAndWaitForProcessNext(
                    submitted,
                    _storageVersions,
                    It.IsAny<string>(),
                    It.IsAny<ProcessStateChange>(),
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<Instance, StorageVersionMetadata, string, ProcessStateChange, string?, CancellationToken>(
                (_, _, state, _, _, _) => capturedState = state
            )
            .ReturnsAsync(new ProcessNextWorkflowResult(CreateTask2Instance(), _storageVersions, null, true));

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = submitted,
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        Assert.True(result.Success);
        string payload = fixture
            .ServiceProvider.GetRequiredService<WorkflowStateSigner>()
            .Verify(Assert.IsType<string>(capturedState), SigningDomain.CallbackState);
        var callbackState = Assert.IsType<WorkflowCallbackState>(
            System.Text.Json.JsonSerializer.Deserialize<WorkflowCallbackState>(payload)
        );
        Assert.Equal(submitted.Id, callbackState.Instance.Id);
        Assert.Equal("Task_1", callbackState.Instance.Process.CurrentTask.ElementId);
        Assert.Equal(2, callbackState.Instance.Process.CurrentTask.Flow);
        Assert.Equal(ProcessStatus.Idle, callbackState.Instance.Process.Status);
        Assert.Equal(_storageVersions.InstanceVersion, callbackState.InstanceVersion);
        Assert.Equal(_storageVersions.ProcessStateVersion, callbackState.ProcessStateVersion);
    }

    [Fact]
    public async Task Next_returns_committed_state_after_reject_transition()
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
            .Setup(x => x.ApplicationMetadata)
            .Returns(new ApplicationMetadata("org/app") { DataTypes = [] });
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
            InstanceVersions = _storageVersions,
            User = user,
            Action = "reject",
            Language = null,
        };
        SetupWorkflowResult(fixture, expectedInstance);
        ProcessChangeResult result = await processEngine.Next(processNextRequest);

        result.Success.Should().BeTrue();
        result
            .ProcessStateChange.Should()
            .BeEquivalentTo(
                new ProcessStateChange()
                {
                    NewProcessState = expectedInstance.Process,
                    OldProcessState = originalProcessState,
                },
                options => options.Excluding(x => x.NewProcessState!.CurrentTask!.Started)
            );
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Next_moves_instance_to_end_event_and_ends_process(bool useTelemetry)
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
        await using var fixture = Fixture.Create(withTelemetry: useTelemetry);
        fixture
            .Mock<IAppMetadata>()
            .Setup(x => x.ApplicationMetadata)
            .Returns(new ApplicationMetadata("org/app") { DataTypes = [] });

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
            InstanceVersions = _storageVersions,
        };

        expectedInstance.Process.Ended = DateTime.UtcNow;
        SetupWorkflowResult(fixture, expectedInstance);
        ProcessChangeResult result = await processEngine.Next(processNextRequest);

        if (useTelemetry)
        {
            var snapshotFilename = "ProcessEngineTest.Telemetry.ProcessEnd.json";
            await Verify(fixture.TelemetrySink.GetSnapshot()).UseFileName(snapshotFilename);
        }

        result.Success.Should().BeTrue();
        result
            .ProcessStateChange.Should()
            .BeEquivalentTo(
                new ProcessStateChange()
                {
                    NewProcessState = expectedInstance.Process,
                    OldProcessState = originalProcessState,
                },
                options => options.Excluding(x => x.NewProcessState!.Ended)
            );
    }

    [Fact]
    public async Task Next_behind_a_failed_workflow_is_answered_with_resume_required()
    {
        await using var fixture = Fixture.Create();
        SetupWorkflowResult(
            fixture,
            CreateTask1Instance(),
            processStateCommitted: false,
            failure: new WorkflowFailure { Kind = WorkflowFailureKind.DependencyFailed, WorkflowId = Guid.NewGuid() }
        );

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreateTask1Instance(),
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        Assert.False(result.Success);
        Assert.Equal(ProcessErrorType.Conflict, result.ErrorType);
        Assert.Equal(ProcessNextState.ResumeRequired, result.ProcessNextState);
        Assert.Equal("Task must be resumed before it can continue.", result.ErrorTitle);
        Assert.Null(result.WorkflowFailure);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Next_WorkflowFailure_IncludesProcessStateOnlyAfterCommit(bool processStateCommitted)
    {
        await using var fixture = Fixture.Create();
        Instance instance = CreateTask2Instance();
        var failure = new WorkflowFailure
        {
            Kind = WorkflowFailureKind.StepFailed,
            WorkflowId = Guid.NewGuid(),
            LastError = new WorkflowFailureError { Message = "The task failed." },
        };
        SetupWorkflowResult(fixture, instance, processStateCommitted: processStateCommitted, failure: failure);

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreateTask1Instance(),
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        Assert.False(result.Success);
        Assert.Equal(ProcessErrorType.Internal, result.ErrorType);
        Assert.Same(failure, result.WorkflowFailure);
        Assert.Same(processStateCommitted ? instance.Process : null, result.ProcessStateOnFailure);
    }

    [Theory]
    [InlineData(ProcessStatus.Processing)]
    public async Task Next_blocks_non_idle_process_status_before_enqueueing(ProcessStatus processStatus)
    {
        await using var fixture = Fixture.Create();
        Instance instance = CreateTask1Instance();
        instance.Process.Status = processStatus;

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = instance,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        result.Success.Should().BeFalse();
        result.ErrorType.Should().Be(ProcessErrorType.Conflict);
        result.BlockingProcessStatus.Should().Be(processStatus);
        fixture
            .Mock<IWorkflowEngineService>()
            .Verify(
                service =>
                    service.EnqueueAndWaitForProcessNext(
                        It.IsAny<Instance>(),
                        It.IsAny<StorageVersionMetadata>(),
                        It.IsAny<string>(),
                        It.IsAny<ProcessStateChange>(),
                        It.IsAny<string?>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
    }

    [Theory]
    [InlineData(false, ProcessNextState.Retrying)]
    [InlineData(true, ProcessNextState.ResumeRequired)]
    public async Task Next_on_processing_instance_answers_with_the_current_task_workflow_state(
        bool workflowFailed,
        ProcessNextState expectedState
    )
    {
        await using var fixture = Fixture.Create();
        fixture
            .Mock<IWorkflowEngineService>()
            .Setup(service => service.ResolveWorkflowTaskStatus(It.IsAny<Instance>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowTaskStatus(
                    workflowFailed ? WorkflowActivityStatus.Failed : WorkflowActivityStatus.Processing,
                    null,
                    null
                )
            );
        Instance instance = CreateTask1Instance();
        instance.Process.Status = ProcessStatus.Processing;

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = instance,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        Assert.False(result.Success);
        Assert.Equal(ProcessErrorType.Conflict, result.ErrorType);
        Assert.Equal(expectedState, result.ProcessNextState);
        Assert.Null(result.BlockingProcessStatus);
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
                service.EnqueueAndWaitForInitialProcessState(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageVersionMetadata>(),
                    It.IsAny<ProcessStateChange>(),
                    It.IsAny<string>(),
                    true,
                    null,
                    null,
                    null,
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new ProcessNextWorkflowResult(
                    instance,
                    StorageVersionMetadata.Empty,
                    workflowFailure,
                    ProcessStateCommitted: true
                )
            );

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
                new StorageVersionMetadata(InstanceVersion: 1, ProcessStateVersion: 1),
                processStateChange,
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
        Instance original = CreateTask1Instance();
        original.Process.Status = ProcessStatus.Processing;
        Instance resumed = CreateTask2Instance();
        var versions = new StorageVersionMetadata(InstanceVersion: 23, ProcessStateVersion: 12);
        await using var fixture = Fixture.Create();
        var workflowService = fixture.Mock<IWorkflowEngineService>();
        workflowService
            .Setup(service => service.ResolveWorkflowTaskStatus(original, It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowTaskStatus(
                    WorkflowActivityStatus.Failed,
                    null,
                    new WorkflowFailure { Kind = WorkflowFailureKind.StepFailed, WorkflowId = workflowId }
                )
            );
        workflowService
            .Setup(service => service.ResumeAndWaitForWorkflow(original, workflowId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ProcessNextWorkflowResult(resumed, versions, null, true));

        ProcessChangeResult result = await fixture.ProcessEngine.ResumeCurrentTask(
            new ProcessNextRequest
            {
                Instance = original,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        Assert.True(result.Success);
        Assert.Same(resumed, result.MutatedInstance);
        Assert.Equal(versions, result.MutatedInstanceVersions);
        Assert.Same(original.Process, result.ProcessStateChange.OldProcessState);
        Assert.Same(resumed.Process, result.ProcessStateChange.NewProcessState);
        workflowService.Verify(
            service => service.ResumeAndWaitForWorkflow(original, workflowId, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task Next_WhenTheProcessDidNotMoveOn_ReportsThatTheInstanceChanged()
    {
        // The acquire lost to a change made after this request read the instance, so its workflow completed without
        // a transition and the refetched instance is still on the task the request acted on.
        await using var fixture = Fixture.Create();

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreateTask1Instance(),
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        Assert.False(result.Success);
        Assert.Equal(ProcessErrorType.Conflict, result.ErrorType);
        Assert.Equal(ProcessNextState.InstanceChanged, result.ProcessNextState);
        Assert.Null(result.WorkflowFailure);
        Assert.Equal("Task_1", result.MutatedInstance?.Process?.CurrentTask?.ElementId);
        fixture
            .Mock<IWorkflowEngineService>()
            .Verify(
                service =>
                    service.EnqueueAndWaitForProcessNext(
                        It.IsAny<Instance>(),
                        It.IsAny<StorageVersionMetadata>(),
                        It.IsAny<string>(),
                        It.IsAny<ProcessStateChange>(),
                        It.IsAny<string?>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Once
            );
    }

    [Fact]
    public async Task Next_WhenAGatewayLeadsBackToTheSameTask_CountsTheNewVisitAsMovingOn()
    {
        await using var fixture = Fixture.Create();
        Instance revisited = CreateTask1Instance();
        revisited.Process!.CurrentTask!.Flow += 1;
        SetupWorkflowResult(fixture, revisited);

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreateTask1Instance(),
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        Assert.True(result.Success);
        Assert.Equal("Task_1", result.ProcessStateChange.NewProcessState?.CurrentTask?.ElementId);
    }

    [Theory]
    [InlineData("en", "en")]
    [InlineData(null, "nn")]
    public async Task Next_GatewayAndWorkflowGetTheRequestedLanguage_OrTheirProfileLanguage(
        string? language,
        string expected
    )
    {
        Authenticated authentication = TestAuthentication.GetUserAuthentication(
            profileSettingPreference: new ProfileSettingPreference { Language = "nn" }
        );
        var services = new ServiceCollection();
        services.AddSingleton(Mock.Of<IAuthenticationContext>(a => a.Current == authentication));
        await using var fixture = Fixture.Create(services);
        Instance transitioned = CreateTask1Instance();
        transitioned.Process!.CurrentTask = new ProcessElementInfo { ElementId = "Task_2", Flow = 3 };
        SetupWorkflowResult(fixture, transitioned);
        fixture
            .Mock<IValidationService>()
            .Setup(v =>
                v.ValidateInstanceAtTask(
                    It.IsAny<IInstanceDataAccessor>(),
                    "Task_1",
                    It.IsAny<List<string>>(),
                    null,
                    language
                )
            )
            .ReturnsAsync([]);

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreateTask1Instance(),
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = language,
            }
        );
        Assert.True(result.Success);
        IInvocation enqueue = Assert.Single(
            fixture.Mock<IWorkflowEngineService>().Invocations,
            invocation => invocation.Method.Name == nameof(IWorkflowEngineService.EnqueueAndWaitForProcessNext)
        );
        Assert.Equal(language, enqueue.Arguments[4]);
        IInvocation navigation = Assert.Single(
            fixture.Mock<IProcessNavigator>().Invocations,
            invocation => invocation.Method.Name == nameof(IProcessNavigator.GetNextTask)
        );
        Assert.Equal(expected, ((IInstanceDataAccessor)navigation.Arguments[0]).Language);
    }

    [Theory]
    [InlineData("en", "en")]
    [InlineData(null, "nn")]
    public async Task CreateInitialProcessState_StartGatewayGetsTheLanguageTheUserChose_OrTheirProfileLanguage(
        string? language,
        string expected
    )
    {
        Authenticated authentication = TestAuthentication.GetUserAuthentication(
            profileSettingPreference: new ProfileSettingPreference { Language = "nn" }
        );
        var services = new ServiceCollection();
        services.AddSingleton(Mock.Of<IAuthenticationContext>(a => a.Current == authentication));
        await using var fixture = Fixture.Create(services);
        Instance instance = CreateTask1Instance();
        instance.Process = null;

        ProcessChangeResult result = await fixture.ProcessEngine.CreateInitialProcessState(
            new ProcessStartRequest
            {
                Instance = instance,
                User = CreateUserClaimsPrincipal(),
                Language = language,
            }
        );

        Assert.True(result.Success);
        // The navigator evaluates the gateways after the start event with this accessor.
        IInvocation navigation = Assert.Single(
            fixture.Mock<IProcessNavigator>().Invocations,
            invocation => invocation.Method.Name == nameof(IProcessNavigator.GetNextTask)
        );
        Assert.Equal(expected, ((IInstanceDataAccessor)navigation.Arguments[0]).Language);
    }

    private static void SetupWorkflowResult(
        Fixture fixture,
        Instance instance,
        StorageVersionMetadata? versions = null,
        bool processStateCommitted = true,
        WorkflowFailure? failure = null
    ) =>
        fixture
            .Mock<IWorkflowEngineService>()
            .Setup(service =>
                service.EnqueueAndWaitForProcessNext(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageVersionMetadata>(),
                    It.IsAny<string>(),
                    It.IsAny<ProcessStateChange>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new ProcessNextWorkflowResult(instance, versions ?? _storageVersions, failure, processStateCommitted)
            );

    [Fact]
    public async Task Next_DoesNotMutateTheInstanceBeforeEnqueue()
    {
        var instance = CreateTask1Instance();
        instance.Process!.Status = ProcessStatus.Idle;
        var process = instance.Process;
        var workflowService = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        workflowService
            .Setup(s =>
                s.EnqueueAndWaitForProcessNext(
                    instance,
                    _storageVersions,
                    It.IsAny<string>(),
                    It.IsAny<ProcessStateChange>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .Callback<Instance, StorageVersionMetadata, string, ProcessStateChange, string?, CancellationToken>(
                (_, _, _, transition, _, _) =>
                {
                    Assert.Same(process, instance.Process);
                    Assert.Equal("Task_1", instance.Process!.CurrentTask.ElementId);
                    Assert.Equal(ProcessStatus.Idle, instance.Process.Status);
                    Assert.Equal("Task_2", transition.NewProcessState?.CurrentTask?.ElementId);
                }
            )
            .ReturnsAsync(new ProcessNextWorkflowResult(CreateTask2Instance(), _storageVersions, null, true));
        var services = new ServiceCollection();
        services.AddSingleton(workflowService.Object);
        await using var fixture = Fixture.Create(services);
        var result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = instance,
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );
        Assert.True(result.Success);
        Assert.Same(process, instance.Process);
        workflowService.VerifyAll();
        // Deciding where the process goes is the request's last step before the enqueue, and leaves the instance as
        // it was.
        fixture
            .Mock<IProcessNavigator>()
            .Verify(n => n.GetNextTask(It.IsAny<IInstanceDataAccessor>(), "Task_1", null), Times.Once);
        fixture.Mock<IProcessNavigator>().VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Next_WhenWhereTheProcessGoesCannotBeDecided_AnswersWithAGenericErrorAndEnqueuesNothing()
    {
        // As when an app's gateway reads a form field that is null. The call answers before anything is enqueued, so
        // the instance is left as it was and the call can be made again.
        var instance = CreateTask1Instance();
        instance.Process!.Status = ProcessStatus.Idle;
        var workflowService = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        var services = new ServiceCollection();
        services.AddSingleton(workflowService.Object);
        await using var fixture = Fixture.Create(services);
        fixture
            .Mock<IProcessNavigator>()
            .Setup(n => n.GetNextTask(It.IsAny<IInstanceDataAccessor>(), "Task_1", null))
            .ThrowsAsync(new NullReferenceException("Object reference not set to an instance of an object."));

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = instance,
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        Assert.False(result.Success);
        Assert.Equal(ProcessErrorType.Internal, result.ErrorType);
        // The exception's own text can carry app internals, so it is logged and never answered with.
        Assert.DoesNotContain("Object reference", result.ErrorMessage, StringComparison.Ordinal);
        Assert.Equal(ProcessStatus.Idle, instance.Process.Status);
        workflowService.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Next_DecidesWhereTheProcessGoesWithDataReadAsTheApp()
    {
        // The user was authorized and the task validated as them. Carrying out the transition is the app's, and the
        // gateways that decide where it goes are its first part.
        var dataType = new DataType { Id = "model", TaskId = "Task_1" };
        var workflowService = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
        workflowService
            .Setup(s =>
                s.EnqueueAndWaitForProcessNext(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageVersionMetadata>(),
                    It.IsAny<string>(),
                    It.IsAny<ProcessStateChange>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new ProcessNextWorkflowResult(CreateTask2Instance(), _storageVersions, null, true));
        var services = new ServiceCollection();
        services.AddSingleton(workflowService.Object);
        var appMetadata = new ApplicationMetadata("org/app") { DataTypes = [dataType] };
        services.AddSingleton(Mock.Of<IAppMetadata>(m => m.ApplicationMetadata == appMetadata));
        await using var fixture = Fixture.Create(services);
        IInstanceDataAccessor? decidedWith = null;
        fixture
            .Mock<IProcessNavigator>()
            .Setup(n => n.GetNextTask(It.IsAny<IInstanceDataAccessor>(), "Task_1", null))
            .Callback<IInstanceDataAccessor, string, string?>((accessor, _, _) => decidedWith = accessor)
            .ReturnsAsync(new ProcessTask { Id = "Task_2" });

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreateTask1Instance(),
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        Assert.True(result.Success);
        var unitOfWork = Assert.IsType<InstanceDataUnitOfWork>(decidedWith);
        StorageAuthenticationMethod authentication = Assert.Single(unitOfWork.AuthenticationMethodOverrides).Value;
        Assert.IsType<AuthenticationMethod.AltinnToken>(authentication.Request);
    }

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
            TestJwtToken? token = null
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
            processReaderMock
                .Setup(r => r.GetFlowElement("Task_2"))
                .Returns(
                    new ProcessTask()
                    {
                        Id = "Task_2",
                        Incoming = new List<string> { "Flow_2" },
                        Outgoing = new List<string> { "Flow_3" },
                        Name = "Bekreft",
                        ExtensionElements = new() { TaskExtension = new() { TaskType = AltinnTaskTypes.Confirmation } },
                    }
                );
            processReaderMock
                .Setup(r => r.GetFlowElement("EndEvent_1"))
                .Returns(
                    new EndEvent()
                    {
                        Id = "EndEvent_1",
                        Incoming = new List<string> { "Flow_3" },
                    }
                );
            services.TryAddSingleton<IProcessReader>(_ => processReaderMock.Object);

            Mock<IAuthenticationContext> authenticationContextMock = new(MockBehavior.Strict);
            Mock<IProcessNavigator> processNavigatorMock = new(MockBehavior.Strict);
            Mock<IDataClient> dataClientMock = new(MockBehavior.Strict);
            Mock<IDataClientWithStorageMetadata> dataClientWithStorageMetadataMock =
                dataClientMock.As<IDataClientWithStorageMetadata>();
            Mock<IInstanceMutationClient> mutationClientMock = dataClientMock.As<IInstanceMutationClient>();
            Mock<IInstanceClient> instanceClientMock = new(MockBehavior.Strict);
            Mock<IInstanceClientWithStorageMetadata> instanceClientWithStorageMetadataMock =
                instanceClientMock.As<IInstanceClientWithStorageMetadata>();
            instanceClientMock
                .Setup(c =>
                    c.GetInstance(
                        It.IsAny<Instance>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync((Instance i, StorageAuthenticationMethod? _, CancellationToken _) => i);
            instanceClientWithStorageMetadataMock
                .Setup(c =>
                    c.GetInstanceWithStorageMetadata(
                        It.IsAny<Instance>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(
                    (Instance i, StorageAuthenticationMethod? _, CancellationToken _) =>
                        new InstanceWithStorageMetadata(i, _storageVersions)
                );
            Mock<IAppModel> appModelMock = new(MockBehavior.Strict);
            Mock<IAppMetadata> appMetadataMock = new(MockBehavior.Strict);
            Mock<IAppResources> appResourcesMock = new(MockBehavior.Strict);
            Mock<ITranslationService> translationServiceMock = new(MockBehavior.Strict);
            var appMetadata = new ApplicationMetadata("org/app") { DataTypes = [] };
            appMetadataMock.Setup(x => x.ApplicationMetadata).Returns(appMetadata);

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
                .Setup(pn => pn.GetNextTask(It.IsAny<IInstanceDataAccessor>(), "StartEvent_1", It.IsAny<string?>()))
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
                .Setup(pn => pn.GetNextTask(It.IsAny<IInstanceDataAccessor>(), "Task_1", It.IsAny<string?>()))
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
                .Setup(pn => pn.GetNextTask(It.IsAny<IInstanceDataAccessor>(), "Task_2", It.IsAny<string?>()))
                .ReturnsAsync(() =>
                    new EndEvent()
                    {
                        Id = "EndEvent_1",
                        Incoming = new List<string> { "Flow_3" },
                    }
                );

            var processEngineAuthorizerMock = new Mock<IProcessEngineAuthorizer>(MockBehavior.Strict);
            processEngineAuthorizerMock
                .Setup(x =>
                    x.AuthorizeProcessNext(It.IsAny<Instance>(), It.IsAny<string>(), It.IsAny<CancellationToken>())
                )
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
            services.TryAddTransient<IDataClientWithStorageMetadata>(sp =>
                (IDataClientWithStorageMetadata)sp.GetRequiredService<IDataClient>()
            );
            services.TryAddTransient<IInstanceMutationClient>(sp =>
                (IInstanceMutationClient)sp.GetRequiredService<IDataClient>()
            );
            services.TryAddTransient<IInstanceClient>(_ => instanceClientMock.Object);
            services.TryAddTransient<IInstanceClientWithStorageMetadata>(sp =>
                (IInstanceClientWithStorageMetadata)sp.GetRequiredService<IInstanceClient>()
            );
            services.TryAddTransient<IAppModel>(_ => appModelMock.Object);
            services.TryAddTransient<IAppMetadata>(_ => appMetadataMock.Object);
            services.TryAddTransient<IAppResources>(_ => appResourcesMock.Object);
            services.TryAddTransient<ITranslationService>(_ => translationServiceMock.Object);
            services.TryAddTransient<InstanceDataUnitOfWorkInitializer>();
            services.TryAddTransient<IValidationService>(_ => validationServiceMock.Object);
            var workflowServiceMock = new Mock<IWorkflowEngineService>(MockBehavior.Strict);
            workflowServiceMock
                .Setup(service =>
                    service.EnqueueAndWaitForProcessNext(
                        It.IsAny<Instance>(),
                        It.IsAny<StorageVersionMetadata>(),
                        It.IsAny<string>(),
                        It.IsAny<ProcessStateChange>(),
                        It.IsAny<string?>(),
                        It.IsAny<CancellationToken>()
                    )
                )
                .ReturnsAsync(
                    (
                        Instance instance,
                        StorageVersionMetadata versions,
                        string _,
                        ProcessStateChange _,
                        string? _,
                        CancellationToken _
                    ) => new ProcessNextWorkflowResult(instance, versions, null, false)
                );
            workflowServiceMock
                .Setup(service =>
                    service.ResolveWorkflowTaskStatus(It.IsAny<Instance>(), It.IsAny<CancellationToken>())
                )
                .ReturnsAsync(new WorkflowTaskStatus(WorkflowActivityStatus.Idle, null, null));
            services.TryAddSingleton<IWorkflowEngineService>(_ => workflowServiceMock.Object);

            services.TryAddSingleton(new AppIdentifier("org", "app"));
            services.AddSingleton(
                Microsoft.Extensions.Options.Options.Create(
                    new Altinn.App.Core.Configuration.AppSettings { RegisterEventsWithEventsComponent = true }
                )
            );
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

            services.TryAddTransient<WorkflowStateSigner>();
            services.TryAddTransient<WorkflowCallbackStateService>();

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
}
