using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Infrastructure.Clients.Secrets;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.AltinnEvents;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskAbandon;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Internal.WorkflowEngine.Models.Engine;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Notifications.Future;
using Altinn.App.Core.Models.Process;
using Altinn.App.Tests.Common.Auth;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine;

public class ProcessNextRequestFactoryTests
{
    private static readonly AppIdentifier TestAppIdentifier = new("ttd", "test-app");

    private static readonly Instance TestInstance = new()
    {
        Id = "1337/aabbccdd-1234-5678-9012-aabbccddeeff",
        AppId = "ttd/test-app",
        Org = "ttd",
        InstanceOwner = new InstanceOwner { PartyId = "1337" },
        Data = [],
    };

    /// <summary>
    /// The primary state blob is opaque to the factory (it is neither inspected nor rewritten -
    /// the side-effects workflow inherits Main's final state via the engine), so any string works.
    /// </summary>
    private const string SignedTestState = "signed-state-blob";

    private static ProcessNextRequestFactory CreateFactory(
        Authenticated? authentication = null,
        bool registerEvents = true,
        bool autoDeleteOnProcessEnd = false,
        bool hasAutoDeleteDataTypes = true,
        params IServiceTask[] serviceTasks
    )
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        foreach (var st in serviceTasks)
        {
            services.AddSingleton(st);
        }
        var sp = services.BuildServiceProvider();
        var appImplFactory = sp.GetRequiredService<AppImplementationFactory>();

        var authContextMock = new Mock<IAuthenticationContext>();
        authContextMock.Setup(x => x.Current).Returns(authentication ?? TestAuthentication.GetUserAuthentication());

        var appSettings = Options.Create(new AppSettings { RegisterEventsWithEventsComponent = registerEvents });

        var dataTypes = new List<DataType>();
        if (hasAutoDeleteDataTypes)
        {
            dataTypes.Add(
                new DataType
                {
                    Id = "auto-delete-type",
                    AppLogic = new ApplicationLogic { AutoDeleteOnProcessEnd = true },
                }
            );
        }

        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(
                new ApplicationMetadata("ttd/test-app")
                {
                    AutoDeleteOnProcessEnd = autoDeleteOnProcessEnd,
                    DataTypes = dataTypes,
                }
            );

        var callbackTokenGeneratorMock = new Mock<IWorkflowCallbackTokenGenerator>();
        callbackTokenGeneratorMock.Setup(x => x.GenerateToken(It.IsAny<Guid>())).Returns("test-callback-token");

        return new ProcessNextRequestFactory(
            appImplFactory,
            authContextMock.Object,
            TestAppIdentifier,
            appSettings,
            appMetadataMock.Object,
            callbackTokenGeneratorMock.Object
        );
    }

    private static ProcessStateChange CreateTaskToTaskTransition(
        string fromTaskId = "Task_1",
        string toTaskId = "Task_2",
        string? toAltinnTaskType = null
    )
    {
        return new ProcessStateChange
        {
            OldProcessState = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { ElementId = fromTaskId, AltinnTaskType = "data" },
            },
            NewProcessState = new ProcessState
            {
                CurrentTask = new ProcessElementInfo
                {
                    ElementId = toTaskId,
                    AltinnTaskType = toAltinnTaskType ?? "data",
                },
            },
            Events =
            [
                new InstanceEvent
                {
                    EventType = InstanceEventType.process_EndTask.ToString(),
                    ProcessInfo = new ProcessState
                    {
                        CurrentTask = new ProcessElementInfo { ElementId = fromTaskId, AltinnTaskType = "data" },
                    },
                },
                new InstanceEvent
                {
                    EventType = InstanceEventType.process_StartTask.ToString(),
                    ProcessInfo = new ProcessState
                    {
                        CurrentTask = new ProcessElementInfo
                        {
                            ElementId = toTaskId,
                            AltinnTaskType = toAltinnTaskType ?? "data",
                        },
                    },
                },
            ],
        };
    }

    private static ProcessStateChange CreateTaskToEndTransition(
        string fromTaskId = "Task_1",
        string endEvent = "EndEvent_1"
    )
    {
        return new ProcessStateChange
        {
            OldProcessState = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { ElementId = fromTaskId, AltinnTaskType = "data" },
            },
            NewProcessState = new ProcessState { CurrentTask = null, EndEvent = endEvent },
            Events =
            [
                new InstanceEvent
                {
                    EventType = InstanceEventType.process_EndTask.ToString(),
                    ProcessInfo = new ProcessState
                    {
                        CurrentTask = new ProcessElementInfo { ElementId = fromTaskId, AltinnTaskType = "data" },
                    },
                },
                new InstanceEvent { EventType = InstanceEventType.process_EndEvent.ToString() },
            ],
        };
    }

    private static ProcessStateChange CreateInitialTaskStart(
        string taskId = "Task_1",
        string? altinnTaskType = null,
        string startEvent = "StartEvent_1"
    )
    {
        return new ProcessStateChange
        {
            OldProcessState = new ProcessState { CurrentTask = null },
            NewProcessState = new ProcessState
            {
                StartEvent = startEvent,
                CurrentTask = new ProcessElementInfo { ElementId = taskId, AltinnTaskType = altinnTaskType ?? "data" },
            },
            Events =
            [
                new InstanceEvent { EventType = InstanceEventType.process_StartEvent.ToString() },
                new InstanceEvent
                {
                    EventType = InstanceEventType.process_StartTask.ToString(),
                    ProcessInfo = new ProcessState
                    {
                        CurrentTask = new ProcessElementInfo
                        {
                            ElementId = taskId,
                            AltinnTaskType = altinnTaskType ?? "data",
                        },
                    },
                },
            ],
        };
    }

    private static ProcessStateChange CreateTaskAbandonToNextTask(
        string fromTaskId = "Task_1",
        string toTaskId = "Task_2"
    )
    {
        return new ProcessStateChange
        {
            OldProcessState = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { ElementId = fromTaskId, AltinnTaskType = "data" },
            },
            NewProcessState = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { ElementId = toTaskId, AltinnTaskType = "data" },
            },
            Events =
            [
                new InstanceEvent
                {
                    EventType = InstanceEventType.process_AbandonTask.ToString(),
                    ProcessInfo = new ProcessState
                    {
                        CurrentTask = new ProcessElementInfo { ElementId = fromTaskId, AltinnTaskType = "data" },
                    },
                },
                new InstanceEvent
                {
                    EventType = InstanceEventType.process_StartTask.ToString(),
                    ProcessInfo = new ProcessState
                    {
                        CurrentTask = new ProcessElementInfo { ElementId = toTaskId, AltinnTaskType = "data" },
                    },
                },
            ],
        };
    }

    private static List<string> ExtractCommandKeys(WorkflowEnqueueEnvelope bundle) =>
        ExtractCommandKeys(bundle.Request.Workflows[0]);

    private static List<string> ExtractCommandKeys(WorkflowRequest workflow)
    {
        return workflow
            .Steps.Select(s =>
            {
                if (s.Command.Type != "app" || s.Command.Data is not { } data)
                    return null;
                var appData = JsonSerializer.Deserialize<AppCommandData>(data);
                return appData?.CommandKey;
            })
            .Where(k => k != null)
            .ToList()!;
    }

    private static List<string> ExtractAllCommandKeys(WorkflowEnqueueEnvelope bundle) =>
        bundle.Request.Workflows.SelectMany(ExtractCommandKeys).ToList();

    [Fact]
    public async Task Create_TaskToTaskTransition_ProducesCorrectCommandSequence()
    {
        // Arrange
        var factory = CreateFactory();
        var stateChange = CreateTaskToTaskTransition();

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert
        var keys = ExtractCommandKeys(bundle);
        var expected = new List<string>
        {
            // Task end commands
            EndTask.Key,
            CommonTaskFinalization.Key,
            OnTaskEndingHook.Key,
            LockTaskData.Key,
            // MutateProcessState (between end and start)
            MutateProcessState.Key,
            // Task start commands
            UnlockTaskData.Key,
            CleanupGeneratedFromTask.Key,
            OnTaskStartingHook.Key,
            CommonTaskInitialization.Key,
            StartTask.Key,
            // SaveProcessStateToStorage (commit boundary)
            SaveProcessStateToStorage.Key,
        };
        Assert.Equal(expected, keys);

        // The non-critical MovedToAltinnEvent runs in the separate side-effects workflow.
        Assert.Equal(2, bundle.Request.Workflows.Count);
        Assert.Equal([MovedToAltinnEvent.Key], ExtractCommandKeys(bundle.Request.Workflows[1]));
    }

    [Fact]
    public async Task Create_TaskToEndTransition_ProducesCorrectCommandSequence()
    {
        // Arrange
        var factory = CreateFactory(autoDeleteOnProcessEnd: true);
        var stateChange = CreateTaskToEndTransition();

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert
        var keys = ExtractCommandKeys(bundle);
        var expected = new List<string>
        {
            // Task end commands
            EndTask.Key,
            CommonTaskFinalization.Key,
            OnTaskEndingHook.Key,
            LockTaskData.Key,
            // MutateProcessState
            MutateProcessState.Key,
            // Process end commands (pre-commit)
            OnProcessEndingHook.Key,
            // SaveProcessStateToStorage
            SaveProcessStateToStorage.Key,
            // Critical post-commit (stay in Main)
            EndProcessLegacyHook.Key,
            DeleteDataElementsIfConfigured.Key,
            DeleteInstanceIfConfigured.Key,
        };
        Assert.Equal(expected, keys);

        // The non-critical CompletedAltinnEvent runs in the separate side-effects workflow.
        Assert.Equal(2, bundle.Request.Workflows.Count);
        Assert.Equal([CompletedAltinnEvent.Key], ExtractCommandKeys(bundle.Request.Workflows[1]));
    }

    [Fact]
    public async Task Create_InitialTaskStart_NoMutateProcessState_IncludesInstanceCreatedEvent()
    {
        // Arrange
        var factory = CreateFactory();
        var stateChange = CreateInitialTaskStart();

        // Act
        var bundle = await factory.Create(
            TestInstance,
            stateChange,
            "lock-token",
            SignedTestState,
            isInstantiation: true
        );

        // Assert
        var keys = ExtractCommandKeys(bundle);

        // No MutateProcessState because there is no task-end
        Assert.DoesNotContain(MutateProcessState.Key, keys);

        var expected = new List<string>
        {
            // Task start commands only
            UnlockTaskData.Key,
            CleanupGeneratedFromTask.Key,
            OnTaskStartingHook.Key,
            CommonTaskInitialization.Key,
            StartTask.Key,
            // SaveProcessStateToStorage
            SaveProcessStateToStorage.Key,
        };
        Assert.Equal(expected, keys);

        // Both events are non-critical and run in the side-effects workflow, in order.
        Assert.Equal(2, bundle.Request.Workflows.Count);
        Assert.Equal(
            [MovedToAltinnEvent.Key, InstanceCreatedAltinnEvent.Key],
            ExtractCommandKeys(bundle.Request.Workflows[1])
        );
    }

    [Fact]
    public async Task Create_InitialTaskStart_NotInstantiation_DoesNotIncludeInstanceCreatedEvent()
    {
        // Arrange
        var factory = CreateFactory();
        var stateChange = CreateInitialTaskStart();

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert
        var keys = ExtractAllCommandKeys(bundle);
        Assert.DoesNotContain(InstanceCreatedAltinnEvent.Key, keys);
        Assert.DoesNotContain(NotifyInstanceOwnerOnInstantiation.Key, keys);
    }

    [Fact]
    public async Task Create_TaskAbandonToNextTask_ProducesCorrectCommandSequence()
    {
        // Arrange
        var factory = CreateFactory();
        var stateChange = CreateTaskAbandonToNextTask();

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert
        var keys = ExtractCommandKeys(bundle);
        var expected = new List<string>
        {
            // Abandon commands
            AbandonTask.Key,
            OnTaskAbandonHook.Key,
            // MutateProcessState
            MutateProcessState.Key,
            // Task start commands
            UnlockTaskData.Key,
            CleanupGeneratedFromTask.Key,
            OnTaskStartingHook.Key,
            CommonTaskInitialization.Key,
            StartTask.Key,
            // SaveProcessStateToStorage
            SaveProcessStateToStorage.Key,
        };
        Assert.Equal(expected, keys);

        // The non-critical MovedToAltinnEvent runs in the separate side-effects workflow.
        Assert.Equal(2, bundle.Request.Workflows.Count);
        Assert.Equal([MovedToAltinnEvent.Key], ExtractCommandKeys(bundle.Request.Workflows[1]));
    }

    [Fact]
    public async Task Create_ServiceTask_AddsExecuteServiceTaskToPostCommit()
    {
        // Arrange
        var serviceTaskMock = new Mock<IServiceTask>();
        serviceTaskMock.Setup(x => x.Type).Returns("signing");
        var factory = CreateFactory(serviceTasks: serviceTaskMock.Object);
        var stateChange = CreateInitialTaskStart(altinnTaskType: "signing");

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert - ExecuteServiceTask is critical: it stays in Main, after the commit boundary.
        var keys = ExtractCommandKeys(bundle);
        Assert.Contains(ExecuteServiceTask.Key, keys);
        int saveIndex = keys.IndexOf(SaveProcessStateToStorage.Key);
        int executeServiceTaskIndex = keys.IndexOf(ExecuteServiceTask.Key);
        Assert.True(executeServiceTaskIndex > saveIndex);

        // MovedToAltinnEvent is non-critical and runs in the side-effects workflow instead.
        Assert.DoesNotContain(MovedToAltinnEvent.Key, keys);
        Assert.Equal(2, bundle.Request.Workflows.Count);
        Assert.Contains(MovedToAltinnEvent.Key, ExtractCommandKeys(bundle.Request.Workflows[1]));
    }

    [Fact]
    public async Task Create_PrefillPassedCorrectly_InInitialTaskStart()
    {
        // Arrange
        var factory = CreateFactory();
        var stateChange = CreateInitialTaskStart();
        var prefill = new Dictionary<string, string> { ["key1"] = "value1" };

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState, prefill: prefill);

        // Assert
        var steps = bundle.Request.Workflows[0].Steps.ToList();
        var commonInitStep = steps
            .Where(s => s.Command.Type == "app" && s.Command.Data is not null)
            .Select(s =>
            {
                var appData = JsonSerializer.Deserialize<AppCommandData>(s.Command.Data!.Value);
                return appData;
            })
            .First(c => c?.CommandKey == CommonTaskInitialization.Key);

        Assert.NotNull(commonInitStep?.Payload);
        var payload = CommandPayloadSerializer.Deserialize<CommonTaskInitializationPayload>(commonInitStep.Payload);
        Assert.NotNull(payload);
        Assert.NotNull(payload.Prefill);
        Assert.Equal("value1", payload.Prefill["key1"]);
    }

    [Fact]
    public async Task Create_SetsOperationIdIdempotencyKeyAndType()
    {
        // Arrange
        var factory = CreateFactory();
        var stateChange = CreateTaskToTaskTransition("Task_1", "Task_2");

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert
        Assert.Equal("lock-token", bundle.IdempotencyKey);
        Assert.Equal("ttd/test-app", bundle.Namespace);
        Assert.NotNull(bundle.Request.Labels);
        InstanceIdentifier instanceIdentifier = new(TestInstance);
        Assert.Equal(
            instanceIdentifier.InstanceGuid.ToString("N"),
            bundle.Request.Labels[ProcessNextRequestFactory.ProcessNextInstanceGuidLabel]
        );
        var workflow = bundle.Request.Workflows[0];
        Assert.Equal("Process next: Task_1 -> Task_2", workflow.OperationId);
        Assert.Equal(SignedTestState, workflow.State);
    }

    [Fact]
    public void CreateProcessNextLabels_TaskToTask_LabelsSourceTargetAndLegacyTarget()
    {
        // Arrange
        var stateChange = new ProcessStateChange
        {
            OldProcessState = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { ElementId = "Task_1", Flow = 2 },
            },
            NewProcessState = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { ElementId = "Task_2", Flow = 3 },
            },
        };

        // Act
        Dictionary<string, string>? labels = ProcessNextRequestFactory.CreateProcessNextLabels(stateChange);

        // Assert
        Assert.NotNull(labels);
        Assert.Equal(3, labels.Count);
        Assert.Equal("Task_1:2", labels[ProcessNextRequestFactory.ProcessNextSourceIdLabel]);
        Assert.Equal("Task_2:3", labels[ProcessNextRequestFactory.ProcessNextTargetIdLabel]);
        Assert.Equal("Task_2:3", labels[ProcessNextRequestFactory.ProcessNextIdLabel]);
    }

    [Fact]
    public void CreateProcessNextLabels_TaskToEnd_LabelsSourceOnly()
    {
        // Arrange
        var stateChange = new ProcessStateChange
        {
            OldProcessState = new ProcessState
            {
                CurrentTask = new ProcessElementInfo { ElementId = "Task_1", Flow = 2 },
            },
            NewProcessState = new ProcessState { CurrentTask = null, EndEvent = "EndEvent_1" },
        };

        // Act
        Dictionary<string, string>? labels = ProcessNextRequestFactory.CreateProcessNextLabels(stateChange);

        // Assert
        Assert.NotNull(labels);
        Assert.Single(labels);
        Assert.Equal("Task_1:2", labels[ProcessNextRequestFactory.ProcessNextSourceIdLabel]);
    }

    [Fact]
    public async Task Create_InitialTaskStart_OperationIdUsesStartEventName()
    {
        // Arrange
        var factory = CreateFactory();
        var stateChange = CreateInitialTaskStart("Task_1", startEvent: "StartEvent_1");

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert
        var workflow = bundle.Request.Workflows[0];
        Assert.Equal("Process next: StartEvent_1 -> Task_1", workflow.OperationId);
    }

    [Fact]
    public async Task Create_TaskToEndTransition_OperationIdUsesEndEventName()
    {
        // Arrange
        var factory = CreateFactory();
        var stateChange = CreateTaskToEndTransition("Task_1", "EndEvent_1");

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert
        var workflow = bundle.Request.Workflows[0];
        Assert.Equal("Process next: Task_1 -> EndEvent_1", workflow.OperationId);
    }

    [Fact]
    public async Task Create_ExtractsActorFromAuthenticationContext()
    {
        // Arrange
        var userAuth = TestAuthentication.GetUserAuthentication(userId: 42);
        var factory = CreateFactory(authentication: userAuth);
        var stateChange = CreateInitialTaskStart();

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert - Actor is now in Context
        Assert.NotNull(bundle.Request.Context);
        var context = JsonSerializer.Deserialize<AppWorkflowContext>(bundle.Request.Context.Value);
        Assert.NotNull(context);
        Assert.Equal(42, context.Actor.UserId);
        Assert.Equal(2, context.Actor.AuthenticationLevel);
        Assert.Equal("12345678901", context.Actor.NationalIdentityNumber);
        Assert.Equal("nb", context.Actor.Language);
    }

    [Fact]
    public async Task Create_ExtractsServiceOwnerActorFromAuthenticationContext()
    {
        // Arrange
        var serviceOwnerAuth = TestAuthentication.GetServiceOwnerAuthentication();
        var factory = CreateFactory(authentication: serviceOwnerAuth);
        var stateChange = CreateInitialTaskStart();

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert
        Assert.NotNull(bundle.Request.Context);
        var context = JsonSerializer.Deserialize<AppWorkflowContext>(bundle.Request.Context.Value);
        Assert.NotNull(context);
        Assert.Equal(TestAuthentication.DefaultOrgNumber, context.Actor.OrgId);
        Assert.Equal(3, context.Actor.AuthenticationLevel);
        Assert.Equal("nb", context.Actor.Language);
    }

    [Fact]
    public async Task Create_ExtractsSystemUserActorFromAuthenticationContext()
    {
        // Arrange
        var systemUserAuth = TestAuthentication.GetSystemUserAuthentication();
        var factory = CreateFactory(authentication: systemUserAuth);
        var stateChange = CreateInitialTaskStart();

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert
        Assert.NotNull(bundle.Request.Context);
        var context = JsonSerializer.Deserialize<AppWorkflowContext>(bundle.Request.Context.Value);
        Assert.NotNull(context);
        Assert.Equal(Guid.Parse(TestAuthentication.DefaultSystemUserId), context.Actor.SystemUserId);
        Assert.Equal(TestAuthentication.DefaultSystemUserOrgNumber, context.Actor.SystemUserOwnerOrgNo);
        Assert.Equal(3, context.Actor.AuthenticationLevel);
        Assert.Equal("nb", context.Actor.Language);
    }

    [Fact]
    public async Task Create_RegisterEventsDisabled_ExcludesAltinnEventCommands()
    {
        // Arrange
        var factory = CreateFactory(registerEvents: false);
        var stateChange = CreateTaskToTaskTransition();

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert
        var keys = ExtractAllCommandKeys(bundle);
        Assert.DoesNotContain(MovedToAltinnEvent.Key, keys);
        Assert.DoesNotContain(CompletedAltinnEvent.Key, keys);
        Assert.DoesNotContain(InstanceCreatedAltinnEvent.Key, keys);
    }

    [Fact]
    public async Task Create_RegisterEventsDisabled_TaskToEnd_ExcludesCompletedEvent()
    {
        // Arrange
        var factory = CreateFactory(registerEvents: false, autoDeleteOnProcessEnd: true);
        var stateChange = CreateTaskToEndTransition();

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert
        var keys = ExtractAllCommandKeys(bundle);
        Assert.DoesNotContain(CompletedAltinnEvent.Key, keys);
        Assert.DoesNotContain(MovedToAltinnEvent.Key, keys);
        // Non-event post-commit commands should still be present
        Assert.Contains(EndProcessLegacyHook.Key, keys);
        Assert.Contains(DeleteDataElementsIfConfigured.Key, keys);
        Assert.Contains(DeleteInstanceIfConfigured.Key, keys);
    }

    [Fact]
    public async Task Create_RegisterEventsDisabled_InitialTaskStart_ExcludesAllEvents()
    {
        // Arrange
        var factory = CreateFactory(registerEvents: false);
        var stateChange = CreateInitialTaskStart();

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert
        var keys = ExtractAllCommandKeys(bundle);
        Assert.DoesNotContain(MovedToAltinnEvent.Key, keys);
        Assert.DoesNotContain(InstanceCreatedAltinnEvent.Key, keys);
    }

    [Fact]
    public async Task Create_RegisterEventsDisabled_InstantiationWithNotification_IncludesNotificationCommand()
    {
        // Arrange
        var factory = CreateFactory(registerEvents: false);
        var stateChange = CreateInitialTaskStart();
        var notification = new InstantiationNotification();

        // Act
        var bundle = await factory.Create(
            TestInstance,
            stateChange,
            "lock-token",
            SignedTestState,
            isInstantiation: true,
            notification: notification
        );

        // Assert
        var keys = ExtractAllCommandKeys(bundle);
        Assert.DoesNotContain(MovedToAltinnEvent.Key, keys);
        Assert.DoesNotContain(InstanceCreatedAltinnEvent.Key, keys);
        Assert.Contains(NotifyInstanceOwnerOnInstantiation.Key, keys);
    }

    [Fact]
    public async Task Create_NoAutoDeleteConfig_TaskToEnd_ExcludesDeleteCommands()
    {
        // Arrange
        var factory = CreateFactory(autoDeleteOnProcessEnd: false, hasAutoDeleteDataTypes: false);
        var stateChange = CreateTaskToEndTransition();

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert
        var keys = ExtractAllCommandKeys(bundle);
        Assert.DoesNotContain(DeleteDataElementsIfConfigured.Key, keys);
        Assert.DoesNotContain(DeleteInstanceIfConfigured.Key, keys);
        // Other process end commands should still be present
        Assert.Contains(EndProcessLegacyHook.Key, keys);
    }

    [Fact]
    public async Task Create_AutoDeleteInstanceEnabled_TaskToEnd_IncludesDeleteInstanceCommand()
    {
        // Arrange
        var factory = CreateFactory(autoDeleteOnProcessEnd: true, hasAutoDeleteDataTypes: false);
        var stateChange = CreateTaskToEndTransition();

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert
        var keys = ExtractAllCommandKeys(bundle);
        Assert.Contains(DeleteInstanceIfConfigured.Key, keys);
        Assert.DoesNotContain(DeleteDataElementsIfConfigured.Key, keys);
    }

    [Fact]
    public async Task Create_AutoDeleteDataTypesEnabled_TaskToEnd_IncludesDeleteDataElementsCommand()
    {
        // Arrange
        var factory = CreateFactory(autoDeleteOnProcessEnd: false, hasAutoDeleteDataTypes: true);
        var stateChange = CreateTaskToEndTransition();

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert
        var keys = ExtractAllCommandKeys(bundle);
        Assert.Contains(DeleteDataElementsIfConfigured.Key, keys);
        Assert.DoesNotContain(DeleteInstanceIfConfigured.Key, keys);
    }

    [Fact]
    public async Task Create_WithSideEffects_SideEffectsWorkflowIsInvisibleAndDependsOnMain()
    {
        // Arrange
        var factory = CreateFactory();
        var stateChange = CreateTaskToTaskTransition("Task_1", "Task_2");

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert
        Assert.Equal(2, bundle.Request.Workflows.Count);

        var main = bundle.Request.Workflows[0];
        Assert.Equal(ProcessNextRequestFactory.MainWorkflowRef, main.Ref);
        Assert.Equal("Process next: Task_1 -> Task_2", main.OperationId);
        Assert.Null(main.IsHead);

        var sideEffects = bundle.Request.Workflows[1];
        Assert.Equal("Process next side-effects: Task_1 -> Task_2", sideEffects.OperationId);
        Assert.False(sideEffects.IsHead);
        Assert.True(sideEffects.DependsOnHeads); // default, no-op since it is not a root
        var dependsOn = Assert.Single(sideEffects.DependsOn!);
        Assert.True(dependsOn.IsRef);
        Assert.Equal(ProcessNextRequestFactory.MainWorkflowRef, dependsOn.Ref);
        Assert.Equal(ProcessNextRequestFactory.MainWorkflowRef, sideEffects.InheritStateFrom?.Ref);
    }

    [Fact]
    public async Task Create_NoSideEffects_EmitsSingleWorkflowWithoutRef()
    {
        // Arrange - no events, no service task, no instantiation extras -> no side effects
        var factory = CreateFactory(registerEvents: false);
        var stateChange = CreateTaskToTaskTransition();

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert - regression guard: the common path is identical to the pre-split behaviour
        var workflow = Assert.Single(bundle.Request.Workflows);
        Assert.Null(workflow.Ref);
        Assert.Null(workflow.IsHead);
        Assert.Null(workflow.DependsOn);
        Assert.Equal(SignedTestState, workflow.State);
    }

    [Fact]
    public async Task Create_SideEffectsWorkflow_InheritsMainStateInsteadOfCarryingItsOwn()
    {
        // Arrange
        var factory = CreateFactory();
        var stateChange = CreateTaskToTaskTransition("Task_1", "Task_2");

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert - Main keeps the original blob untouched
        Assert.Equal(SignedTestState, bundle.Request.Workflows[0].State);

        // The side-effects workflow carries no state of its own: the engine resolves its initial
        // state from Main's final evolved state after Main completes (State and InheritStateFrom
        // are mutually exclusive by engine validation).
        var sideEffects = bundle.Request.Workflows[1];
        Assert.Null(sideEffects.State);
        Assert.NotNull(sideEffects.InheritStateFrom);
        Assert.True(sideEffects.InheritStateFrom.Value.IsRef);
        Assert.Equal(ProcessNextRequestFactory.MainWorkflowRef, sideEffects.InheritStateFrom.Value.Ref);
    }

    [Fact]
    public async Task Create_InstantiationWithNotification_SideEffectsWorkflowContainsAllSideEffectsInOrder()
    {
        // Arrange
        var factory = CreateFactory();
        var stateChange = CreateInitialTaskStart();
        var notification = new InstantiationNotification();

        // Act
        var bundle = await factory.Create(
            TestInstance,
            stateChange,
            "lock-token",
            SignedTestState,
            isInstantiation: true,
            notification: notification
        );

        // Assert
        Assert.Equal(2, bundle.Request.Workflows.Count);
        Assert.Equal(
            [MovedToAltinnEvent.Key, InstanceCreatedAltinnEvent.Key, NotifyInstanceOwnerOnInstantiation.Key],
            ExtractCommandKeys(bundle.Request.Workflows[1])
        );
    }

    [Fact]
    public async Task Create_SideEffectsOperationId_MatchesTheMarkerPrefix()
    {
        // The wait/settle logic identifies side-effects workflows by this prefix - guard the coupling.
        var factory = CreateFactory();
        var stateChange = CreateTaskToTaskTransition();

        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        Assert.StartsWith(
            ProcessNextRequestFactory.SideEffectsOperationIdPrefix,
            bundle.Request.Workflows[1].OperationId,
            StringComparison.Ordinal
        );
    }
}
