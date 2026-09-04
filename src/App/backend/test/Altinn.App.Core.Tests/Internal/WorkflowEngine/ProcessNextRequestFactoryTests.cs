using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.Instances;
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
        Action<IServiceCollection>? configureServices = null,
        params IPipelineServiceTask[] serviceTasks
    )
    {
        var services = new ServiceCollection();
        services.AddSingleton<AppImplementationFactory>();
        foreach (IPipelineServiceTask st in serviceTasks)
        {
            services.AddSingleton(st);
        }
        configureServices?.Invoke(services);
        var sp = services.BuildServiceProvider();
        var appImplFactory = sp.GetRequiredService<AppImplementationFactory>();

        // Only ExecuteServiceTask declares a per-command default (tier 2) today; the rest fall back to
        // the engine's global defaults, so this minimal set is enough to exercise resolution in tests.
        var stepOptionsResolver = new ProcessStepOptionsResolver(
            [new ExecuteServiceTask(appImplFactory, TestMailboxDeliveryEnvelope.Create())],
            appImplFactory
        );

        var authContextMock = new Mock<IAuthenticationContext>();
        authContextMock.Setup(x => x.Current).Returns(authentication ?? TestAuthentication.GetUserAuthentication());

        var appSettings = Options.Create(new AppSettings { RegisterEventsWithEventsComponent = registerEvents });

        var callbackTokenGeneratorMock = new Mock<IWorkflowCallbackTokenGenerator>();
        callbackTokenGeneratorMock.Setup(x => x.GenerateToken(It.IsAny<Guid>())).Returns("test-callback-token");

        return new ProcessNextRequestFactory(
            appImplFactory,
            authContextMock.Object,
            TestAppIdentifier,
            appSettings,
            callbackTokenGeneratorMock.Object,
            stepOptionsResolver
        );
    }

    private static StepRequest GetStep(WorkflowEnqueueEnvelope bundle, string commandKey) =>
        bundle
            .Request.Workflows[0]
            .Steps.Single(s =>
            {
                if (s.Command.Data is not { } data)
                    return false;
                var appData = JsonSerializer.Deserialize<AppCommandData>(data);
                return appData?.CommandKey == commandKey;
            });

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

    private static ProcessStateChange CreateSameTaskLoopRevisit(string taskId = "Task_SubformPdf")
    {
        return new ProcessStateChange
        {
            OldProcessState = new ProcessState
            {
                CurrentTask = new ProcessElementInfo
                {
                    ElementId = taskId,
                    AltinnTaskType = "subformPdf",
                    Flow = 4,
                },
            },
            NewProcessState = new ProcessState
            {
                CurrentTask = new ProcessElementInfo
                {
                    ElementId = taskId,
                    AltinnTaskType = "subformPdf",
                    Flow = 5,
                },
            },
            Events =
            [
                new InstanceEvent
                {
                    EventType = InstanceEventType.process_EndTask.ToString(),
                    ProcessInfo = new ProcessState
                    {
                        CurrentTask = new ProcessElementInfo
                        {
                            ElementId = taskId,
                            AltinnTaskType = "subformPdf",
                            Flow = 4,
                        },
                    },
                },
                new InstanceEvent
                {
                    EventType = InstanceEventType.process_StartTask.ToString(),
                    ProcessInfo = new ProcessState
                    {
                        CurrentTask = new ProcessElementInfo
                        {
                            ElementId = taskId,
                            AltinnTaskType = "subformPdf",
                            Flow = 5,
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
        bundle
            .Request.Workflows.SelectMany(ExtractCommandKeys)
            .Concat(
                TryExtractSideEffectsEnqueueRequest(bundle) is { } sideEffectsRequest
                    ? sideEffectsRequest.Workflows.SelectMany(ExtractCommandKeys)
                    : []
            )
            .ToList();

    /// <summary>
    /// Unwraps the enqueue request embedded in the Main workflow's EnqueueSideEffectsWorkflow step
    /// payload (the request that step submits to the engine at the commit boundary), or null when
    /// the transition has no side effects.
    /// </summary>
    private static WorkflowEnqueueRequest? TryExtractSideEffectsEnqueueRequest(WorkflowEnqueueEnvelope bundle)
    {
        StepRequest? enqueueStep = bundle
            .Request.Workflows.SelectMany(workflow => workflow.Steps)
            .SingleOrDefault(step =>
                step.Command.Type == "app"
                && step.Command.Data is { } data
                && JsonSerializer.Deserialize<AppCommandData>(data)?.CommandKey == EnqueueSideEffectsWorkflow.Key
            );
        if (enqueueStep is null)
            return null;

        var commandData = JsonSerializer.Deserialize<AppCommandData>(enqueueStep.Command.Data!.Value)!;
        return CommandPayloadSerializer
            .Deserialize<EnqueueSideEffectsWorkflowPayload>(commandData.Payload)!
            .EnqueueRequest;
    }

    private static List<WorkflowRequest> ExtractSideEffectsWorkflows(WorkflowEnqueueEnvelope bundle)
    {
        WorkflowEnqueueRequest? request = TryExtractSideEffectsEnqueueRequest(bundle);
        Assert.NotNull(request);
        Assert.NotEmpty(request.Workflows);
        return [.. request.Workflows];
    }

    /// <summary>
    /// The side-effect command keys across all sibling workflows, in declaration order (one
    /// single-step workflow per side effect).
    /// </summary>
    private static List<string> ExtractSideEffectsCommandKeys(WorkflowEnqueueEnvelope bundle) =>
        ExtractSideEffectsWorkflows(bundle).SelectMany(ExtractCommandKeys).ToList();

    private static List<ExecuteServiceTaskPayload> ExtractExecuteServiceTaskPayloads(WorkflowEnqueueEnvelope bundle)
    {
        return bundle
            .Request.Workflows[0]
            .Steps.Where(s => s.Command.Type == "app" && s.Command.Data is not null)
            .Select(s => JsonSerializer.Deserialize<AppCommandData>(s.Command.Data!.Value))
            .Where(appData => appData?.CommandKey == ExecuteServiceTask.Key)
            .Select(appData => CommandPayloadSerializer.Deserialize<ExecuteServiceTaskPayload>(appData!.Payload)!)
            .ToList();
    }

    private static ProcessStateChangePayload ExtractCommitProcessStatePayload(WorkflowEnqueueEnvelope bundle)
    {
        AppCommandData appData = bundle
            .Request.Workflows[0]
            .Steps.Where(s => s.Command.Type == "app" && s.Command.Data is not null)
            .Select(s => JsonSerializer.Deserialize<AppCommandData>(s.Command.Data!.Value))
            .OfType<AppCommandData>()
            .Single(appData => appData.CommandKey == CommitProcessState.Key);

        return Assert.IsType<ProcessStateChangePayload>(
            CommandPayloadSerializer.Deserialize<CommandRequestPayload>(appData.Payload)
        );
    }

    private static List<StepRequest> ExtractExecuteServiceTaskSteps(WorkflowEnqueueEnvelope bundle)
    {
        return bundle
            .Request.Workflows[0]
            .Steps.Where(s =>
            {
                if (s.Command.Type != "app" || s.Command.Data is null)
                    return false;

                var appData = JsonSerializer.Deserialize<AppCommandData>(s.Command.Data.Value);
                return appData?.CommandKey == ExecuteServiceTask.Key;
            })
            .ToList();
    }

    [Fact]
    public async Task Create_TaskToTaskTransition_ProducesCorrectCommandSequence()
    {
        // Arrange
        var factory = CreateFactory();
        var stateChange = CreateTaskToTaskTransition();

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        // Assert
        var keys = ExtractCommandKeys(bundle);
        var expected = new List<string>
        {
            AcquireProcessingStatus.Key,
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
            // CommitProcessState (commit boundary)
            CommitProcessState.Key,
            // Enqueues the side-effects workflow at the commit boundary
            EnqueueSideEffectsWorkflow.Key,
        };
        Assert.Equal(expected, keys);

        // The non-critical MovedToAltinnEvent runs in the separate side-effects workflow.
        Assert.Single(bundle.Request.Workflows);
        Assert.Equal([MovedToAltinnEvent.Key], ExtractSideEffectsCommandKeys(bundle));
    }

    [Fact]
    public async Task Create_TaskToTaskTransition_LockCommandsUseCurrentTaskDataLockPayloads()
    {
        var factory = CreateFactory();
        var stateChange = CreateTaskToTaskTransition("Task_1", "Task_2");

        WorkflowEnqueueEnvelope bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            "{}"
        );

        List<AppCommandData> commands = bundle
            .Request.Workflows[0]
            .Steps.Where(step => step.Command.Type == "app" && step.Command.Data is not null)
            .Select(step => JsonSerializer.Deserialize<AppCommandData>(step.Command.Data!.Value))
            .OfType<AppCommandData>()
            .ToList();
        AppCommandData lockCommand = Assert.Single(commands, command => command.CommandKey == LockTaskData.Key);
        AppCommandData unlockCommand = Assert.Single(commands, command => command.CommandKey == UnlockTaskData.Key);

        AssertTaskDataLockPayload(lockCommand.Payload, "Task_1");
        AssertTaskDataLockPayload(unlockCommand.Payload, "Task_2");
    }

    private static void AssertTaskDataLockPayload(string? serializedPayload, string expectedTaskId)
    {
        Assert.NotNull(serializedPayload);
        using var document = JsonDocument.Parse(serializedPayload);
        Assert.Equal("taskDataLock", document.RootElement.GetProperty("$type").GetString());
        Assert.Equal(expectedTaskId, document.RootElement.GetProperty("taskId").GetString());

        TaskDataLockPayload payload = Assert.IsType<TaskDataLockPayload>(
            CommandPayloadSerializer.Deserialize<CommandRequestPayload>(serializedPayload)
        );
        Assert.Equal(expectedTaskId, payload.TaskId);
    }

    [Fact]
    public async Task Create_ProcessStateChangeCommands_UseProcessStateChangePayloadDiscriminator()
    {
        // Arrange
        var factory = CreateFactory();
        var stateChange = CreateTaskToTaskTransition();

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            "{}"
        );

        // Assert
        var processStatePayloads = bundle
            .Request.Workflows[0]
            .Steps.Where(s => s.Command.Type == "app" && s.Command.Data is not null)
            .Select(s => JsonSerializer.Deserialize<AppCommandData>(s.Command.Data!.Value))
            .Where(appData =>
                appData?.CommandKey == MutateProcessState.Key || appData?.CommandKey == CommitProcessState.Key
            )
            .Select(appData => appData!.Payload)
            .ToList();

        Assert.Equal(2, processStatePayloads.Count);
        foreach (string? payload in processStatePayloads)
        {
            Assert.NotNull(payload);
            using var document = JsonDocument.Parse(payload);
            Assert.Equal("processStateChange", document.RootElement.GetProperty("$type").GetString());
        }
    }

    [Fact]
    public async Task Create_SameTaskLoopRevisit_RunsCommonTaskInitializationBeforeServiceTaskExecution()
    {
        // Arrange
        var factory = CreateFactory(serviceTasks: new FakeServiceTask("subformPdf"));
        var stateChange = CreateSameTaskLoopRevisit();

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            "{}"
        );

        // Assert
        var keys = ExtractCommandKeys(bundle);
        var expected = new List<string>
        {
            AcquireProcessingStatus.Key,
            EndTask.Key,
            CommonTaskFinalization.Key,
            OnTaskEndingHook.Key,
            LockTaskData.Key,
            MutateProcessState.Key,
            UnlockTaskData.Key,
            CleanupGeneratedFromTask.Key,
            OnTaskStartingHook.Key,
            CommonTaskInitialization.Key,
            StartTask.Key,
            CommitProcessState.Key,
            EnqueueSideEffectsWorkflow.Key,
            ExecuteServiceTask.Key,
        };
        Assert.Equal(expected, keys);
        Assert.True(ExtractCommitProcessStatePayload(bundle).ServiceTaskFollows);

        // The non-critical MovedToAltinnEvent runs in the separate side-effects workflow.
        Assert.Equal([MovedToAltinnEvent.Key], ExtractSideEffectsCommandKeys(bundle));

        var workflow = bundle.Request.Workflows.Single();
        Assert.Equal("Process next: Task_SubformPdf -> Task_SubformPdf", workflow.OperationId);
        Assert.Equal("Task_SubformPdf:4", bundle.Request.Labels![ProcessNextRequestFactory.ProcessNextSourceIdLabel]);
        Assert.Equal("Task_SubformPdf:5", bundle.Request.Labels[ProcessNextRequestFactory.ProcessNextTargetIdLabel]);
    }

    [Fact]
    public async Task Create_TaskToEndTransition_ProducesCorrectCommandSequence()
    {
        // Arrange
        var factory = CreateFactory();
        var stateChange = CreateTaskToEndTransition();

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        // Assert
        var keys = ExtractCommandKeys(bundle);
        var expected = new List<string>
        {
            AcquireProcessingStatus.Key,
            // Task end commands
            EndTask.Key,
            CommonTaskFinalization.Key,
            OnTaskEndingHook.Key,
            LockTaskData.Key,
            // MutateProcessState
            MutateProcessState.Key,
            // Process end commands (pre-commit)
            OnProcessEndingHook.Key,
            EndProcessLegacyHook.Key,
            // CommitProcessState
            CommitProcessState.Key,
            // Enqueues the side-effects workflow at the commit boundary
            EnqueueSideEffectsWorkflow.Key,
        };
        Assert.Equal(expected, keys);

        // The non-critical CompletedAltinnEvent runs in the separate side-effects workflow.
        Assert.Single(bundle.Request.Workflows);
        Assert.Equal([CompletedAltinnEvent.Key], ExtractSideEffectsCommandKeys(bundle));
    }

    [Fact]
    public async Task Create_InitialTaskStart_NoMutateProcessState_IncludesInstanceCreatedEvent()
    {
        // Arrange
        var factory = CreateFactory();
        var stateChange = CreateInitialTaskStart();

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState,
            isInstantiation: true
        );

        // Assert
        var keys = ExtractCommandKeys(bundle);

        // No MutateProcessState because there is no task-end
        Assert.DoesNotContain(MutateProcessState.Key, keys);

        var expected = new List<string>
        {
            AcquireProcessingStatus.Key,
            // Task start commands only
            UnlockTaskData.Key,
            CleanupGeneratedFromTask.Key,
            OnTaskStartingHook.Key,
            CommonTaskInitialization.Key,
            StartTask.Key,
            // CommitProcessState
            CommitProcessState.Key,
            // Enqueues the side-effects workflow at the commit boundary
            EnqueueSideEffectsWorkflow.Key,
        };
        Assert.Equal(expected, keys);

        // Both events are non-critical and run in the side-effects workflow, in order.
        Assert.Single(bundle.Request.Workflows);
        Assert.Equal([MovedToAltinnEvent.Key, InstanceCreatedAltinnEvent.Key], ExtractSideEffectsCommandKeys(bundle));
    }

    [Fact]
    public async Task Create_InitialTaskStart_NotInstantiation_DoesNotIncludeInstanceCreatedEvent()
    {
        // Arrange
        var factory = CreateFactory();
        var stateChange = CreateInitialTaskStart();

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

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
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        // Assert
        var keys = ExtractCommandKeys(bundle);
        var expected = new List<string>
        {
            AcquireProcessingStatus.Key,
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
            // CommitProcessState
            CommitProcessState.Key,
            // Enqueues the side-effects workflow at the commit boundary
            EnqueueSideEffectsWorkflow.Key,
        };
        Assert.Equal(expected, keys);

        // The non-critical MovedToAltinnEvent runs in the separate side-effects workflow.
        Assert.Single(bundle.Request.Workflows);
        Assert.Equal([MovedToAltinnEvent.Key], ExtractSideEffectsCommandKeys(bundle));
    }

    [Fact]
    public async Task Create_ServiceTask_AddsExecuteServiceTaskAfterCommitAndMarksCommitPayload()
    {
        // Arrange
        var factory = CreateFactory(serviceTasks: new FakeServiceTask("signing"));
        var stateChange = CreateInitialTaskStart(altinnTaskType: "signing");

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        // Assert - ExecuteServiceTask is critical: it stays in Main, after the commit boundary.
        var keys = ExtractCommandKeys(bundle);
        Assert.Contains(ExecuteServiceTask.Key, keys);
        int saveIndex = keys.IndexOf(CommitProcessState.Key);
        int enqueueSideEffectsIndex = keys.IndexOf(EnqueueSideEffectsWorkflow.Key);
        int executeServiceTaskIndex = keys.IndexOf(ExecuteServiceTask.Key);
        Assert.True(enqueueSideEffectsIndex > saveIndex);
        // The side effects are scheduled before the service task runs, so they never wait on it.
        Assert.True(executeServiceTaskIndex > enqueueSideEffectsIndex);

        // MovedToAltinnEvent is non-critical and runs in the side-effects workflow instead.
        Assert.DoesNotContain(MovedToAltinnEvent.Key, keys);
        Assert.Single(bundle.Request.Workflows);
        Assert.Contains(MovedToAltinnEvent.Key, ExtractSideEffectsCommandKeys(bundle));
        Assert.True(ExtractCommitProcessStatePayload(bundle).ServiceTaskFollows);

        var payload = Assert.Single(ExtractExecuteServiceTaskPayloads(bundle));
        Assert.Equal("signing", payload.ServiceTaskType);

        var step = Assert.Single(ExtractExecuteServiceTaskSteps(bundle));
        Assert.Equal($"{ExecuteServiceTask.Key}: 0", step.OperationId);
        var appData = JsonSerializer.Deserialize<AppCommandData>(step.Command.Data!.Value);
        Assert.NotNull(appData?.Payload);
        using var payloadDocument = JsonDocument.Parse(appData.Payload);
        Assert.False(payloadDocument.RootElement.TryGetProperty("phase", out _));
    }

    /// <summary>
    /// A simple IServiceTask with configurable type and options — a real class, not a mock,
    /// because Moq bypasses the forwarding Define default the factory relies on.
    /// </summary>
    private sealed class FakeServiceTask(string type, ProcessStepOptions? options = null) : IServiceTask
    {
        public string Type => type;

        public ProcessStepOptions? StepOptions => options;

        public Task<ServiceTaskResult> Execute(ServiceTaskContext context) =>
            Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());
    }

    /// <summary>
    /// A send→poll pipeline used by the expansion tests: one stage plus the concluding Finally. The task-wide
    /// options carry the 30 min timeout and the poll's 48 h wait budget; the stage overrides the timeout for
    /// itself.
    /// </summary>
    private sealed class SigningTask : IPipelineServiceTask
    {
        public string Type => "signing";

        public ProcessStepOptions? StepOptions =>
            new() { MaxExecutionTime = TimeSpan.FromMinutes(30), WaitBudget = TimeSpan.FromHours(48) };

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(
                    _ => Task.FromResult(ServiceTaskStageResult.Completed()),
                    new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(10) }
                )
                .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()));
    }

    private static List<(
        string OperationId,
        ExecuteServiceTaskPayload Payload,
        StepRequest Step
    )> ExtractServiceTaskSteps(WorkflowEnqueueEnvelope bundle) =>
        bundle
            .Request.Workflows[0]
            .Steps.Select(s =>
            {
                if (s.Command.Data is not { } data)
                    return default;
                var appData = JsonSerializer.Deserialize<AppCommandData>(data);
                if (appData?.CommandKey != ExecuteServiceTask.Key)
                    return default;
                var payload = CommandPayloadSerializer.Deserialize<ExecuteServiceTaskPayload>(appData.Payload)!;
                return (s.OperationId, payload, s);
            })
            .Where(x => x != default)
            .ToList();

    [Fact]
    public async Task Create_PipelineServiceTask_ExpandsToOneEngineStepPerStage_ThenTheConclusion()
    {
        // Arrange
        var factory = CreateFactory(serviceTasks: new SigningTask());
        var stateChange = CreateInitialTaskStart(altinnTaskType: "signing");

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        // Assert
        var serviceTaskSteps = ExtractServiceTaskSteps(bundle);
        Assert.Equal(2, serviceTaskSteps.Count);

        Assert.Equal(0, serviceTaskSteps[0].Payload.ItemIndex);
        Assert.Equal($"{ExecuteServiceTask.Key}: 0", serviceTaskSteps[0].OperationId);
        Assert.Equal(1, serviceTaskSteps[1].Payload.ItemIndex);
        Assert.Equal($"{ExecuteServiceTask.Key}: 1", serviceTaskSteps[1].OperationId);
        Assert.All(serviceTaskSteps, s => Assert.Equal("signing", s.Payload.ServiceTaskType));

        // Both stay critical: in Main, after the commit boundary and the side-effects enqueue.
        var keys = ExtractCommandKeys(bundle);
        int saveIndex = keys.IndexOf(CommitProcessState.Key);
        int firstServiceTaskIndex = keys.IndexOf(ExecuteServiceTask.Key);
        Assert.True(firstServiceTaskIndex > saveIndex);
    }

    [Fact]
    public async Task Create_PipelineServiceTask_ResolvesOptionsPerStage()
    {
        // Arrange
        var factory = CreateFactory(serviceTasks: new SigningTask());
        var stateChange = CreateInitialTaskStart(altinnTaskType: "signing");

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        // Assert — the concluding step carries the task's own options unchanged; the stage's own
        // timeout wins field-wise over the task's, and the unset WaitBudget field is inherited
        // from the task (deliberate: shared options are the default, and a budget is inert on a
        // stage that never defers).
        var serviceTaskSteps = ExtractServiceTaskSteps(bundle);
        var dispatch = serviceTaskSteps.Single(s => s.Payload.ItemIndex == 0).Step;
        var conclusion = serviceTaskSteps.Single(s => s.Payload.ItemIndex == 1).Step;

        Assert.Equal(TimeSpan.FromMinutes(10), dispatch.Command.MaxExecutionTime);
        Assert.Equal(TimeSpan.FromHours(48), dispatch.Command.WaitBudget);
        Assert.Equal(TimeSpan.FromMinutes(30), conclusion.Command.MaxExecutionTime);
        Assert.Equal(TimeSpan.FromHours(48), conclusion.Command.WaitBudget);
    }

    private static readonly MailboxOptions _mailboxThreeDays = new() { Timeout = TimeSpan.FromDays(3) };

    private static Task<ServiceTaskStageResult> PlainStage(ServiceTaskContext context) =>
        Task.FromResult(ServiceTaskStageResult.Completed());

    private static Task<ServiceTaskOpeningStageResult> SendStage(
        ServiceTaskContext context,
        ServiceTaskMailbox mailbox
    ) => Task.FromResult(ServiceTaskOpeningStageResult.Completed());

    private static Task<ServiceTaskExchangeResult> OnMessage(ServiceTaskContext context, ServiceTaskReply reply) =>
        Task.FromResult<ServiceTaskExchangeResult>(ServiceTaskResult.Success());

    private static Task<ServiceTaskResult> OnClosed(ServiceTaskContext context, MailboxClosedReason reason) =>
        Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success());

    private static Task<ServiceTaskStageExchangeResult> OnSegmentMessage(
        ServiceTaskContext context,
        ServiceTaskReply reply
    ) => Task.FromResult<ServiceTaskStageExchangeResult>(ServiceTaskStageResult.Completed());

    private static Task<ServiceTaskStageResult> OnSegmentClosed(
        ServiceTaskContext context,
        MailboxClosedReason reason
    ) => Task.FromResult(ServiceTaskStageResult.Completed());

    /// <summary>
    /// A pipeline answered by a message; its conclusion declares its own timeout so the receive step can be
    /// shown to resolve the <c>Finally</c>'s options.
    /// </summary>
    private sealed class ArchivingTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ProcessStepOptions? StepOptions => new() { MaxExecutionTime = TimeSpan.FromMinutes(30) };

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(SendStage, _mailboxThreeDays, out MailboxHandle archive)
                .ConcludeOnReplies(
                    archive,
                    OnMessage,
                    OnClosed,
                    new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) }
                );
    }

    /// <summary>
    /// A declaring pipeline with a stage on <em>each</em> side of the one that sends, so "immediately before
    /// the declaring stage" is distinguishable from both "first" and "last" — the
    /// <c>send → unrelated stage → reply terminal</c> shape the design supports.
    /// </summary>
    private sealed class SurroundedSendArchivingTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(PlainStage)
                .Stage(
                    SendStage,
                    _mailboxThreeDays,
                    out MailboxHandle archive,
                    new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(7) }
                )
                .Stage(PlainStage)
                .ConcludeOnReplies(archive, OnMessage, OnClosed);
    }

    /// <summary>
    /// Two exchanges, the first answered <em>mid-pipeline</em>: Main therefore carries only the pipeline's
    /// first segment and hands over to that exchange's receiver, with the journal's send and the terminal
    /// belonging to the continuation the archive's conclusion starts. The two handlers declare distinct
    /// timeouts so the receive step can be shown to resolve the handler that answers <em>it</em>.
    /// </summary>
    private sealed class ArchiveThenJournalTask : IPipelineServiceTask
    {
        public string Type => "archiving";

        public ProcessStepOptions? StepOptions => new() { MaxExecutionTime = TimeSpan.FromMinutes(30) };

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(SendStage, _mailboxThreeDays, out MailboxHandle archive)
                .HandleReplies(
                    archive,
                    OnSegmentMessage,
                    OnSegmentClosed,
                    new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(5) }
                )
                .Stage(SendStage, _mailboxThreeDays, out MailboxHandle journal)
                .ConcludeOnReplies(
                    journal,
                    OnMessage,
                    OnClosed,
                    new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) }
                );
    }

    private static MintMailboxPayload ExtractMintPayload(WorkflowEnqueueEnvelope bundle)
    {
        StepRequest step = bundle
            .Request.Workflows[0]
            .Steps.Single(s => s.OperationId.StartsWith(MintMailbox.Key, StringComparison.Ordinal));
        var appData = JsonSerializer.Deserialize<AppCommandData>(step.Command.Data!.Value)!;
        Assert.Equal(MintMailbox.Key, appData.CommandKey);
        return CommandPayloadSerializer.Deserialize<MintMailboxPayload>(appData.Payload)!;
    }

    [Fact]
    public async Task Create_MailboxPipeline_EndsMainWithTheSendStageAndEmitsNoConclusion()
    {
        var factory = CreateFactory(serviceTasks: new ArchivingTask());
        var stateChange = CreateInitialTaskStart(altinnTaskType: "archiving");

        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        var serviceTaskSteps = ExtractServiceTaskSteps(bundle);
        (string OperationId, ExecuteServiceTaskPayload Payload, StepRequest Step) sendStep = Assert.Single(
            serviceTaskSteps
        );
        Assert.Equal($"{ExecuteServiceTask.Key}: 0", sendStep.OperationId);
        // The send's own item and nothing else: the conclusion — item 1 here — answers the exchange, so it
        // runs on the receive workflows rather than in Main.
        Assert.Equal(0, sendStep.Payload.ItemIndex);

        // Main's last step is the segment's last stage: completing it is what enqueues the first receiver,
        // from inside the still-unsettled step, so the frontier never reads empty while the exchange is open.
        var keys = ExtractCommandKeys(bundle);
        Assert.Equal(ExecuteServiceTask.Key, keys[^1]);
    }

    /// <summary>
    /// The mint is its own step and hugs the stage that sends: never at the transition's start (the deadline
    /// clock would start before the stages that precede the send) and never after it.
    /// </summary>
    [Fact]
    public async Task Create_MailboxPipeline_EmitsTheMintStepImmediatelyBeforeTheDeclaringStage()
    {
        var factory = CreateFactory(serviceTasks: new SurroundedSendArchivingTask());
        var stateChange = CreateInitialTaskStart(altinnTaskType: "archiving");

        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        List<string> operationIds = bundle.Request.Workflows[0].Steps.Select(s => s.OperationId).ToList();
        int mint = operationIds.IndexOf($"{MintMailbox.Key}: 1");
        Assert.NotEqual(-1, mint);
        Assert.Equal($"{ExecuteServiceTask.Key}: 0", operationIds[mint - 1]);
        Assert.Equal($"{ExecuteServiceTask.Key}: 1", operationIds[mint + 1]);
        Assert.Single(operationIds, id => id.StartsWith(MintMailbox.Key, StringComparison.Ordinal));
        // The declaring stage ends Main whether or not the exchange's handler follows it: the unrelated stage
        // composed after the send rides the continuation that stage's completion enqueues.
        Assert.DoesNotContain($"{ExecuteServiceTask.Key}: 2", operationIds);
        Assert.Equal($"{ExecuteServiceTask.Key}: 1", operationIds[^1]);

        MintMailboxPayload payload = ExtractMintPayload(bundle);
        Assert.Equal("archiving", payload.ServiceTaskType);
        Assert.Equal(1, payload.StageIndex);
    }

    /// <summary>
    /// One HTTP call, so the mint takes the engine's own defaults — not the declaring stage's options, which
    /// belong to the work that sends.
    /// </summary>
    [Fact]
    public async Task Create_MailboxPipeline_LeavesTheMintStepOnTheEngineDefaults()
    {
        var factory = CreateFactory(serviceTasks: new SurroundedSendArchivingTask());
        var stateChange = CreateInitialTaskStart(altinnTaskType: "archiving");

        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        StepRequest mintStep = bundle.Request.Workflows[0].Steps.Single(s => s.OperationId == $"{MintMailbox.Key}: 1");
        Assert.Null(mintStep.Command.MaxExecutionTime);
        Assert.Null(mintStep.Command.WaitBudget);
        Assert.Null(mintStep.RetryStrategy);
    }

    [Fact]
    public async Task Create_PipelineWithoutMailbox_EmitsNoMintStep()
    {
        var factory = CreateFactory(serviceTasks: new SigningTask());
        var stateChange = CreateInitialTaskStart(altinnTaskType: "signing");

        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        Assert.DoesNotContain(MintMailbox.Key, ExtractCommandKeys(bundle));
    }

    /// <summary>
    /// The assembled send stage's whole serialized payload, pinned exactly: the service task and the item it
    /// runs, and nothing else. What follows the send — this pipeline's terminal, its exchange's only receiver
    /// — is worked out by that step when it runs, from the pipeline it resolves then. Pinned on the whole
    /// string so that a field added to the payload fails here too, not only a field removed.
    /// </summary>
    [Fact]
    public async Task Create_MailboxPipeline_SendStagePayload_IsTheItemIndexAndNothingElse()
    {
        var factory = CreateFactory(serviceTasks: new ArchivingTask());
        var stateChange = CreateInitialTaskStart(altinnTaskType: "archiving");

        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        var sendStep = Assert.Single(ExtractServiceTaskSteps(bundle));
        string payloadJson = JsonSerializer.Deserialize<AppCommandData>(sendStep.Step.Command.Data!.Value)!.Payload!;
        Assert.Equal(
            "{\"$type\":\"executeServiceTask\",\"serviceTaskType\":\"archiving\",\"itemIndex\":0}",
            payloadJson
        );
    }

    /// <summary>
    /// The assembly half of multi-exchange, and the seam nothing else covers: until the planner learned to
    /// split at a reply handler, a composed <c>HandleReplies</c> made Main's planning throw, so this shape
    /// could not reach the engine at all. Main carries only the pipeline's <em>first</em> segment — the
    /// archive's send, whose completion starts that exchange's receive leg — with the journal's send and the
    /// terminal belonging to the workflows further down the chain.
    /// </summary>
    [Fact]
    public async Task Create_MailboxPipelineAnsweredMidPipeline_EndsMainAtTheFirstSend()
    {
        var factory = CreateFactory(serviceTasks: new ArchiveThenJournalTask());
        var stateChange = CreateInitialTaskStart(altinnTaskType: "archiving");

        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        // One stage step, the archive's send: no send for the journal (that stage rides the continuation) and
        // no concluding step (the conclusion is a later item, and it rides the continuation too).
        var serviceTaskSteps = ExtractServiceTaskSteps(bundle);
        (string OperationId, ExecuteServiceTaskPayload Payload, StepRequest Step) sendStep = Assert.Single(
            serviceTaskSteps
        );
        Assert.Equal($"{ExecuteServiceTask.Key}: 0", sendStep.OperationId);
        Assert.Equal(0, sendStep.Payload.ItemIndex);

        var keys = ExtractCommandKeys(bundle);
        Assert.Equal(ExecuteServiceTask.Key, keys[^1]);
        // Only the archive's mailbox is minted in Main: the journal's clock starts in the continuation.
        Assert.Single(keys, key => key == MintMailbox.Key);
        Assert.Equal(0, ExtractMintPayload(bundle).StageIndex);
    }

    [Fact]
    public async Task Create_PipelineWithoutMailbox_RunsTheWholePipelineInMain()
    {
        var factory = CreateFactory(serviceTasks: new SigningTask());
        var stateChange = CreateInitialTaskStart(altinnTaskType: "signing");

        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        var serviceTaskSteps = ExtractServiceTaskSteps(bundle);
        // The signing pipeline's conclusion is its item 1, and Main runs it as an ordinary step.
        Assert.Contains(serviceTaskSteps, s => s.Payload.ItemIndex == 1);
    }

    /// <summary>
    /// Main runs the stages up to and including the first mailbox-opening one and stops there: the plain stage
    /// composed after the send is a later segment's step, and the handler that answers the exchange — this
    /// pipeline's terminal, at item index 3 — is the receive workflow's step alone. Nothing hands over to that
    /// exchange from Main: the stage between the two is what will, from the continuation it rides.
    /// </summary>
    [Fact]
    public async Task Create_MailboxPipeline_EndsMainAtTheOpeningStage()
    {
        var factory = CreateFactory(serviceTasks: new SurroundedSendArchivingTask());
        var stateChange = CreateInitialTaskStart(altinnTaskType: "archiving");

        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        var serviceTaskSteps = ExtractServiceTaskSteps(bundle);
        Assert.Equal([0, 1], serviceTaskSteps.Select(s => s.Payload.ItemIndex).ToList());

        var keys = ExtractCommandKeys(bundle);
        Assert.Equal(ExecuteServiceTask.Key, keys[^1]);
    }

    [Fact]
    public async Task Create_PrefillPassedCorrectly_InInitialTaskStart()
    {
        // Arrange
        var factory = CreateFactory();
        var stateChange = CreateInitialTaskStart();
        var prefill = new Dictionary<string, string> { ["key1"] = "value1" };

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState,
            prefill: prefill
        );

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
        const string idempotencyKey = "process-next-operation-test-instance-7";
        var bundle = await factory.CreateChainInitiating(TestInstance, stateChange, idempotencyKey, SignedTestState);

        // Assert
        Assert.Equal(idempotencyKey, bundle.IdempotencyKey);
        Assert.Equal("ttd/test-app", bundle.Namespace);
        Assert.NotNull(bundle.Request.Labels);
        InstanceIdentifier instanceIdentifier = new(TestInstance);
        Assert.Equal(
            instanceIdentifier.InstanceGuid.ToString("N"),
            bundle.Request.Labels[ProcessNextRequestFactory.ProcessNextInstanceGuidLabel]
        );
        Assert.Equal(instanceIdentifier.InstanceGuid.ToString(), bundle.CollectionKey);
        var workflow = bundle.Request.Workflows[0];
        Assert.Equal("Process next: Task_1 -> Task_2", workflow.OperationId);
        Assert.Equal(SignedTestState, workflow.State);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public async Task CreateChainInitiating_MissingIdempotencyKey_Throws(string? idempotencyKey)
    {
        var factory = CreateFactory();

        await Assert.ThrowsAnyAsync<ArgumentException>(() =>
            factory.CreateChainInitiating(
                TestInstance,
                CreateTaskToTaskTransition(),
                idempotencyKey!,
                state: "signed-state"
            )
        );
    }

    [Fact]
    public void CreateProcessNextLabels_TaskToTask_LabelsSourceAndTarget()
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
        Assert.Equal("Task_2", labels[ProcessNextRequestFactory.ProcessNextTargetTaskLabel]);
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
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

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
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

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
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

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
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

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
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

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
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

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
        var factory = CreateFactory(registerEvents: false);
        var stateChange = CreateTaskToEndTransition();

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        // Assert
        var keys = ExtractAllCommandKeys(bundle);
        Assert.DoesNotContain(CompletedAltinnEvent.Key, keys);
        Assert.DoesNotContain(MovedToAltinnEvent.Key, keys);
        // The legacy hook must see the ended process and pre-cleanup data before the terminal commit.
        Assert.Contains(EndProcessLegacyHook.Key, keys);
        Assert.Equal(EndProcessLegacyHook.Key, keys[^2]);
        Assert.Equal(CommitProcessState.Key, keys[^1]);
    }

    [Fact]
    public async Task Create_RegisterEventsDisabled_InitialTaskStart_ExcludesAllEvents()
    {
        // Arrange
        var factory = CreateFactory(registerEvents: false);
        var stateChange = CreateInitialTaskStart();

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

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
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
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
    public async Task Create_TaskToEnd_HasNoPostCommitStorageMutationCommands()
    {
        var factory = CreateFactory();
        var stateChange = CreateTaskToEndTransition();

        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        // Assert
        var keys = ExtractAllCommandKeys(bundle);
        Assert.DoesNotContain("DeleteDataElementsIfConfigured", keys);
        Assert.DoesNotContain("DeleteInstanceIfConfigured", keys);
        // Other process end commands should still be present
        Assert.Contains(EndProcessLegacyHook.Key, keys);
        Assert.Equal(AcquireProcessingStatus.Key, keys[0]);
        Assert.DoesNotContain(TakeOverProcessingStatus.Key, keys);
        Assert.True(keys.IndexOf(OnProcessEndingHook.Key) < keys.IndexOf(CommitProcessState.Key));
        Assert.True(keys.IndexOf(OnProcessEndingHook.Key) < keys.IndexOf(EndProcessLegacyHook.Key));
        Assert.True(keys.IndexOf(EndProcessLegacyHook.Key) < keys.IndexOf(CommitProcessState.Key));
    }

    [Fact]
    public async Task Create_TakeOverProcessingStatus_ReplacesAcquireAsTheFirstCommand()
    {
        var factory = CreateFactory();
        var stateChange = CreateTaskToTaskTransition();

        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState,
            takeOverProcessingStatus: true
        );

        var keys = ExtractCommandKeys(bundle);
        Assert.Equal(TakeOverProcessingStatus.Key, keys[0]);
        Assert.DoesNotContain(AcquireProcessingStatus.Key, keys);
        Assert.Equal(EndTask.Key, keys[1]);
    }

    [Fact]
    public async Task Create_DependentWorkflow_DoesNotAcquireAndPreservesDependency()
    {
        var factory = CreateFactory();
        var stateChange = CreateTaskToTaskTransition();
        WorkflowRef dependency = Guid.NewGuid();

        var bundle = await factory.CreateDependent(
            TestInstance,
            stateChange,
            "signed-state",
            new Actor { UserId = 1337 },
            [dependency],
            "dependent-idempotency-key"
        );

        var keys = ExtractCommandKeys(bundle);
        Assert.DoesNotContain(AcquireProcessingStatus.Key, keys);
        Assert.DoesNotContain(TakeOverProcessingStatus.Key, keys);
        Assert.Equal(EndTask.Key, keys[0]);
        Assert.Equal("dependent-idempotency-key", bundle.IdempotencyKey);
        Assert.Equal("signed-state", bundle.Request.Workflows.Single().State);
        Assert.Equal(dependency, Assert.Single(bundle.Request.Workflows.Single().DependsOn!));
    }

    [Fact]
    public async Task Create_AllAppCommandContexts_OmitLegacyLockToken()
    {
        var factory = CreateFactory();
        ProcessStateChange stateChange = CreateTaskToTaskTransition();
        WorkflowEnqueueEnvelope[] bundles =
        [
            await factory.CreateChainInitiating(TestInstance, stateChange, "initiating-key"),
            await factory.CreateDependent(
                TestInstance,
                stateChange,
                "signed-state",
                new Actor { UserId = 1337 },
                [Guid.NewGuid()],
                "dependent-key"
            ),
        ];

        Assert.All(
            bundles,
            bundle =>
            {
                Assert.Contains(
                    bundle.Request.Workflows.SelectMany(workflow => workflow.Steps),
                    step => step.Command.Type == "app"
                );
                Assert.False(bundle.Request.Context!.Value.TryGetProperty("lockToken", out _));
            }
        );
    }

    [Fact]
    public async Task Create_WithSideEffects_EmbedsAnInvisibleIndependentRootAtTheCommitBoundary()
    {
        // Arrange
        var factory = CreateFactory();
        var stateChange = CreateTaskToTaskTransition("Task_1", "Task_2");

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        // Assert - one Main workflow; the side-effects workflow travels inside the
        // EnqueueSideEffectsWorkflow step payload and is only enqueued once the commit ran.
        var main = Assert.Single(bundle.Request.Workflows);
        Assert.Equal("Process next: Task_1 -> Task_2", main.OperationId);
        Assert.Null(main.IsHead);

        WorkflowEnqueueRequest? sideEffectsRequest = TryExtractSideEffectsEnqueueRequest(bundle);
        Assert.NotNull(sideEffectsRequest);
        // The embedded batch reuses the Main batch's labels and context (incl. callback token),
        // so ops label queries find the side-effects workflow and its callbacks authenticate.
        Assert.Equal(bundle.Request.Labels, sideEffectsRequest.Labels);
        Assert.NotNull(sideEffectsRequest.Context);

        var sideEffects = Assert.Single(sideEffectsRequest.Workflows);
        Assert.Equal(
            $"Process next side-effects: Task_1 -> Task_2 · {MovedToAltinnEvent.Key}",
            sideEffects.OperationId
        );
        // An independent root, invisible to the collection heads frontier: no dependencies, does
        // not pick up the current heads, and never becomes a head itself.
        Assert.False(sideEffects.IsHead);
        Assert.False(sideEffects.DependsOnHeads);
        Assert.Null(sideEffects.DependsOn);
        // State and Links are runtime-only: EnqueueSideEffectsWorkflow injects the commit-time
        // state blob and the Main workflow id when the step executes.
        Assert.Null(sideEffects.State);
        Assert.Null(sideEffects.Links);
    }

    [Fact]
    public async Task Create_NoSideEffects_EmitsSingleWorkflowWithoutEnqueueStep()
    {
        // Arrange - no events, no service task, no instantiation extras -> no side effects
        var factory = CreateFactory(registerEvents: false);
        var stateChange = CreateTaskToTaskTransition();

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        // Assert - regression guard: the common path is identical to the pre-split behavior
        var workflow = Assert.Single(bundle.Request.Workflows);
        Assert.Null(workflow.Ref);
        Assert.Null(workflow.IsHead);
        Assert.Null(workflow.DependsOn);
        Assert.Equal(SignedTestState, workflow.State);
        Assert.DoesNotContain(EnqueueSideEffectsWorkflow.Key, ExtractCommandKeys(bundle));
        Assert.Null(TryExtractSideEffectsEnqueueRequest(bundle));
    }

    [Fact]
    public async Task Create_InstantiationWithNotification_EmitsOneSingleStepSiblingPerSideEffect()
    {
        // Arrange
        var factory = CreateFactory();
        var stateChange = CreateInitialTaskStart();
        var notification = new InstantiationNotification();

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState,
            isInstantiation: true,
            notification: notification
        );

        // Assert - the effects are independent outcomes: each rides its own single-step sibling
        // workflow so a dead-lettered event registration cannot starve the notification behind it.
        Assert.Single(bundle.Request.Workflows);
        List<WorkflowRequest> siblings = ExtractSideEffectsWorkflows(bundle);
        Assert.Equal(
            [MovedToAltinnEvent.Key, InstanceCreatedAltinnEvent.Key, NotifyInstanceOwnerOnInstantiation.Key],
            siblings.SelectMany(ExtractCommandKeys).ToList()
        );
        Assert.All(
            siblings,
            sibling =>
            {
                Assert.Single(sibling.Steps);
                Assert.False(sibling.IsHead);
                Assert.False(sibling.DependsOnHeads);
                Assert.Null(sibling.DependsOn);
            }
        );
    }

    [Fact]
    public async Task Create_SideEffectsOperationIds_MatchTheMarkerPrefixAndNameTheEffect()
    {
        // The prefix is a human-readable naming convention for ops queries and logs only - not
        // load-bearing for identification (wait/settle scoping and failure classification key off
        // the engine-persisted IsHead == false directive). Guard the convention so ops queries
        // against the OperationId keep working, and guard the per-effect suffix so siblings of the
        // same transition stay distinguishable in listings.
        var factory = CreateFactory();
        var stateChange = CreateTaskToTaskTransition();

        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        Assert.All(
            ExtractSideEffectsWorkflows(bundle),
            sibling =>
            {
                Assert.StartsWith(
                    ProcessNextRequestFactory.SideEffectsOperationIdPrefix,
                    sibling.OperationId,
                    StringComparison.Ordinal
                );
                Assert.EndsWith(
                    $"· {Assert.Single(ExtractCommandKeys(sibling))}",
                    sibling.OperationId,
                    StringComparison.Ordinal
                );
            }
        );
    }

    // ---- Step options resolution (execution timeout / retry strategy): tier 1/2/3 ----

    [Fact]
    public async Task StepOptions_OrdinaryCommand_LeavesEngineDefaults()
    {
        // Arrange - tier 1: a command with no per-command default and no app handler
        var factory = CreateFactory();
        var stateChange = CreateTaskToTaskTransition();

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        // Assert - nothing stamped, so the engine applies its own global defaults
        var startTaskStep = GetStep(bundle, StartTask.Key);
        Assert.Null(startTaskStep.Command.MaxExecutionTime);
        Assert.Null(startTaskStep.RetryStrategy);
    }

    [Fact]
    public async Task StepOptions_ServiceTask_NoOverride_UsesCommandDefaultTimeout()
    {
        // Arrange - tier 2: service task without its own options → ExecuteServiceTask's 10 min default
        var factory = CreateFactory(serviceTasks: new FakeServiceTask("signing"));
        var stateChange = CreateInitialTaskStart(altinnTaskType: "signing");

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        // Assert
        var step = GetStep(bundle, ExecuteServiceTask.Key);
        Assert.Equal(ExecuteServiceTask.DefaultServiceTaskTimeout, step.Command.MaxExecutionTime);
        Assert.Equal(TimeSpan.FromMinutes(10), step.Command.MaxExecutionTime);
        Assert.Null(step.RetryStrategy);
    }

    [Fact]
    public async Task StepOptions_ServiceTask_ImplementationTimeout_OverridesCommandDefault()
    {
        // Arrange - tier 3: a greedy service task asks for two hours
        var factory = CreateFactory(
            serviceTasks: new FakeServiceTask(
                "signing",
                new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromHours(2) }
            )
        );
        var stateChange = CreateInitialTaskStart(altinnTaskType: "signing");

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        // Assert
        var step = GetStep(bundle, ExecuteServiceTask.Key);
        Assert.Equal(TimeSpan.FromHours(2), step.Command.MaxExecutionTime);
        // The non-specified field falls through: no retry override and no tier-2 retry default → unset.
        Assert.Null(step.RetryStrategy);
    }

    [Fact]
    public async Task StepOptions_ServiceTask_ImplementationBothFields_HonorsBoth()
    {
        // Arrange - tier 3 sets BOTH timeout and retry; both must land on the wire, resolved per-field
        var factory = CreateFactory(
            serviceTasks: new FakeServiceTask(
                "signing",
                new ProcessStepOptions
                {
                    MaxExecutionTime = TimeSpan.FromHours(2),
                    RetryStrategy = ProcessStepRetryStrategy.Exponential(TimeSpan.FromSeconds(5), maxRetries: 3),
                }
            )
        );
        var stateChange = CreateInitialTaskStart(altinnTaskType: "signing");

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        // Assert - timeout overrides the 10 min tier-2 default AND retry is mapped to the wire model
        var step = GetStep(bundle, ExecuteServiceTask.Key);
        Assert.Equal(TimeSpan.FromHours(2), step.Command.MaxExecutionTime);
        Assert.NotNull(step.RetryStrategy);
        Assert.Equal(BackoffType.Exponential, step.RetryStrategy.BackoffType);
        Assert.Equal(TimeSpan.FromSeconds(5), step.RetryStrategy.BaseInterval);
        Assert.Equal(3, step.RetryStrategy.MaxRetries);
    }

    [Fact]
    public async Task StepOptions_ServiceTask_ImplementationRetryOnly_FallsBackToCommandTimeout()
    {
        // Arrange - tier 3 sets only the retry strategy; timeout must fall back to the tier-2 default
        var factory = CreateFactory(
            serviceTasks: new FakeServiceTask(
                "signing",
                new ProcessStepOptions
                {
                    RetryStrategy = ProcessStepRetryStrategy.Exponential(
                        baseInterval: TimeSpan.FromSeconds(5),
                        maxRetries: 3,
                        maxDelay: TimeSpan.FromMinutes(1),
                        maxDuration: TimeSpan.FromMinutes(30)
                    ),
                }
            )
        );
        var stateChange = CreateInitialTaskStart(altinnTaskType: "signing");

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        // Assert - timeout from tier 2, retry from tier 3, mapped to the wire model
        var step = GetStep(bundle, ExecuteServiceTask.Key);
        Assert.Equal(ExecuteServiceTask.DefaultServiceTaskTimeout, step.Command.MaxExecutionTime);
        Assert.NotNull(step.RetryStrategy);
        Assert.Equal(BackoffType.Exponential, step.RetryStrategy.BackoffType);
        Assert.Equal(TimeSpan.FromSeconds(5), step.RetryStrategy.BaseInterval);
        Assert.Equal(3, step.RetryStrategy.MaxRetries);
        Assert.Equal(TimeSpan.FromMinutes(1), step.RetryStrategy.MaxDelay);
        Assert.Equal(TimeSpan.FromMinutes(30), step.RetryStrategy.MaxDuration);
    }

    [Fact]
    public async Task StepOptions_ServiceTask_WaitBudget_LandsOnTheWireCommand()
    {
        // Arrange - a handler that only widens the wait allowance, leaving the timeout to its tier-2 default
        var factory = CreateFactory(
            serviceTasks: new FakeServiceTask(
                "eformidling",
                new ProcessStepOptions { WaitBudget = TimeSpan.FromDays(7) }
            )
        );
        var stateChange = CreateInitialTaskStart(altinnTaskType: "eformidling");

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            "{}"
        );

        // Assert - the budget reaches the engine, and the untouched timeout keeps its tier-2 default
        var step = GetStep(bundle, ExecuteServiceTask.Key);
        Assert.Equal(TimeSpan.FromDays(7), step.Command.WaitBudget);
        Assert.Equal(ExecuteServiceTask.DefaultServiceTaskTimeout, step.Command.MaxExecutionTime);
    }

    [Fact]
    public async Task StepOptions_NegativeMaxExecutionTime_ThrowsAtEnqueue()
    {
        // Arrange - a misconfigured handler (e.g. arithmetic slip producing a negative timeout)
        var factory = CreateFactory(
            serviceTasks: new FakeServiceTask(
                "signing",
                new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(-10) }
            )
        );
        var stateChange = CreateInitialTaskStart(altinnTaskType: "signing");

        // Act + Assert - fails fast with an actionable message instead of poisoning the engine workflow
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            factory.CreateChainInitiating(
                TestInstance,
                stateChange,
                "test-process-next-idempotency-key",
                SignedTestState
            )
        );
        Assert.Contains(nameof(ProcessStepOptions.MaxExecutionTime), ex.Message);
    }

    [Fact]
    public async Task StepOptions_ZeroIntervalRetryWithRetriesEnabled_ThrowsAtEnqueue()
    {
        // Arrange - a bare strategy (Constant, zero interval, unbounded) would hot-loop in the engine
        var factory = CreateFactory(
            serviceTasks: new FakeServiceTask(
                "signing",
                new ProcessStepOptions { RetryStrategy = new ProcessStepRetryStrategy() }
            )
        );
        var stateChange = CreateInitialTaskStart(altinnTaskType: "signing");

        // Act + Assert
        var ex = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            factory.CreateChainInitiating(
                TestInstance,
                stateChange,
                "test-process-next-idempotency-key",
                SignedTestState
            )
        );
        Assert.Contains(nameof(ProcessStepRetryStrategy.BaseInterval), ex.Message);
    }

    [Fact]
    public async Task StepOptions_RetryStrategyNone_IsAcceptedAndMapped()
    {
        // Arrange - None() is the sanctioned zero-interval strategy (retries disabled)
        var factory = CreateFactory(
            serviceTasks: new FakeServiceTask(
                "signing",
                new ProcessStepOptions { RetryStrategy = ProcessStepRetryStrategy.None() }
            )
        );
        var stateChange = CreateInitialTaskStart(altinnTaskType: "signing");

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        // Assert
        var step = GetStep(bundle, ExecuteServiceTask.Key);
        Assert.NotNull(step.RetryStrategy);
        Assert.Equal(0, step.RetryStrategy.MaxRetries);
    }

    [Fact]
    public async Task StepOptions_TaskStartingHook_ImplementationOverride_IsApplied()
    {
        // Arrange - tier 3 on a lifecycle hook (not just service tasks)
        var hookMock = new Mock<IOnTaskStartingHandler>();
        hookMock.Setup(h => h.ShouldRunForTask(It.IsAny<string>())).Returns(true);
        hookMock
            .Setup(h => h.StepOptions)
            .Returns(new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) });
        var factory = CreateFactory(configureServices: s => s.AddSingleton(hookMock.Object));
        var stateChange = CreateTaskToTaskTransition();

        // Act
        var bundle = await factory.CreateChainInitiating(
            TestInstance,
            stateChange,
            "test-process-next-idempotency-key",
            SignedTestState
        );

        // Assert
        var step = GetStep(bundle, OnTaskStartingHook.Key);
        Assert.Equal(TimeSpan.FromMinutes(3), step.Command.MaxExecutionTime);
    }
}
