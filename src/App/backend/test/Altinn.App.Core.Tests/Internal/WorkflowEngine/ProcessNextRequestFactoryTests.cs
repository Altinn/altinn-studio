using System.Text.Json;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Features.Auth;
using Altinn.App.Core.Features.Process;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Internal.WorkflowEngine.Authentication;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.AltinnEvents;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskAbandon;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;
using Altinn.App.Core.Internal.WorkflowEngine.Http;
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
            // Enqueues the side-effects workflow at the commit boundary
            EnqueueSideEffectsWorkflow.Key,
        };
        Assert.Equal(expected, keys);

        // The non-critical MovedToAltinnEvent runs in the separate side-effects workflow.
        Assert.Single(bundle.Request.Workflows);
        Assert.Equal([MovedToAltinnEvent.Key], ExtractSideEffectsCommandKeys(bundle));
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
            // Enqueues the side-effects workflow at the commit boundary
            EnqueueSideEffectsWorkflow.Key,
            // Critical post-commit (stay in Main)
            EndProcessLegacyHook.Key,
            DeleteDataElementsIfConfigured.Key,
            DeleteInstanceIfConfigured.Key,
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
            // Enqueues the side-effects workflow at the commit boundary
            EnqueueSideEffectsWorkflow.Key,
        };
        Assert.Equal(expected, keys);

        // The non-critical MovedToAltinnEvent runs in the separate side-effects workflow.
        Assert.Single(bundle.Request.Workflows);
        Assert.Equal([MovedToAltinnEvent.Key], ExtractSideEffectsCommandKeys(bundle));
    }

    [Fact]
    public async Task Create_ServiceTask_AddsExecuteServiceTaskToPostCommit()
    {
        // Arrange
        var factory = CreateFactory(serviceTasks: new FakeServiceTask("signing"));
        var stateChange = CreateInitialTaskStart(altinnTaskType: "signing");

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert - ExecuteServiceTask is critical: it stays in Main, after the commit boundary.
        var keys = ExtractCommandKeys(bundle);
        Assert.Contains(ExecuteServiceTask.Key, keys);
        int saveIndex = keys.IndexOf(SaveProcessStateToStorage.Key);
        int enqueueSideEffectsIndex = keys.IndexOf(EnqueueSideEffectsWorkflow.Key);
        int executeServiceTaskIndex = keys.IndexOf(ExecuteServiceTask.Key);
        Assert.True(enqueueSideEffectsIndex > saveIndex);
        // The side effects are scheduled before the service task runs, so they never wait on it.
        Assert.True(executeServiceTaskIndex > enqueueSideEffectsIndex);

        // MovedToAltinnEvent is non-critical and runs in the side-effects workflow instead.
        Assert.DoesNotContain(MovedToAltinnEvent.Key, keys);
        Assert.Single(bundle.Request.Workflows);
        Assert.Contains(MovedToAltinnEvent.Key, ExtractSideEffectsCommandKeys(bundle));
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
    /// A send→poll pipeline used by the expansion tests: one stage ("Dispatch") plus the
    /// concluding Finally. The task-wide options carry the 30 min timeout and the poll's 48 h
    /// wait budget; the stage overrides the timeout for itself.
    /// </summary>
    private sealed class SigningTask : IPipelineServiceTask
    {
        public string Type => "signing";

        public ProcessStepOptions? StepOptions =>
            new() { MaxExecutionTime = TimeSpan.FromMinutes(30), WaitBudget = TimeSpan.FromHours(48) };

        public ServiceTaskPipeline Define(ServiceTaskPipelineBuilder pipeline) =>
            pipeline
                .Stage(
                    "Dispatch",
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
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert — one ExecuteServiceTask engine step per stage, in composition order, each
        // payload carrying its stage's name and a distinct OperationId for the engine's records;
        // then the concluding step (the pipeline's Finally) with no stage name — the exact shape
        // a simple IServiceTask produces on its own.
        var serviceTaskSteps = ExtractServiceTaskSteps(bundle);
        Assert.Equal(2, serviceTaskSteps.Count);

        Assert.Equal("Dispatch", serviceTaskSteps[0].Payload.StageName);
        Assert.Equal($"{ExecuteServiceTask.Key}: Dispatch", serviceTaskSteps[0].OperationId);
        Assert.Null(serviceTaskSteps[1].Payload.StageName);
        Assert.Equal(ExecuteServiceTask.Key, serviceTaskSteps[1].OperationId);
        Assert.All(serviceTaskSteps, s => Assert.Equal("signing", s.Payload.ServiceTaskType));

        // Both stay critical: in Main, after the commit boundary and the side-effects enqueue.
        var keys = ExtractCommandKeys(bundle);
        int saveIndex = keys.IndexOf(SaveProcessStateToStorage.Key);
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
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        // Assert — the concluding step carries the task's own options unchanged; the stage's own
        // timeout wins field-wise over the task's, and the unset WaitBudget field is inherited
        // from the task (deliberate: shared options are the default, and a budget is inert on a
        // stage that never defers).
        var serviceTaskSteps = ExtractServiceTaskSteps(bundle);
        var dispatch = serviceTaskSteps.Single(s => s.Payload.StageName == "Dispatch").Step;
        var conclusion = serviceTaskSteps.Single(s => s.Payload.StageName is null).Step;

        Assert.Equal(TimeSpan.FromMinutes(10), dispatch.Command.MaxExecutionTime);
        Assert.Equal(TimeSpan.FromHours(48), dispatch.Command.WaitBudget);
        Assert.Equal(TimeSpan.FromMinutes(30), conclusion.Command.MaxExecutionTime);
        Assert.Equal(TimeSpan.FromHours(48), conclusion.Command.WaitBudget);
    }

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
                .Stage("SendToArchive", _ => Task.FromResult(ServiceTaskStageResult.Completed()))
                .Finally(
                    _ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()),
                    new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(3) }
                )
                .WithReplyFrom("SendToArchive", new MailboxOptions { Timeout = TimeSpan.FromDays(3) });
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
                .Stage("PrepareDocuments", _ => Task.FromResult(ServiceTaskStageResult.Completed()))
                .Stage(
                    "SendToArchive",
                    _ => Task.FromResult(ServiceTaskStageResult.Completed()),
                    new ProcessStepOptions { MaxExecutionTime = TimeSpan.FromMinutes(7) }
                )
                .Stage("RecordDispatch", _ => Task.FromResult(ServiceTaskStageResult.Completed()))
                .Finally(_ => Task.FromResult<ServiceTaskResult>(ServiceTaskResult.Success()))
                .WithReplyFrom("SendToArchive", new MailboxOptions { Timeout = TimeSpan.FromDays(3) });
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

    private static EnqueueReceiveWorkflowPayload ExtractReceiveEnqueuePayload(WorkflowEnqueueEnvelope bundle)
    {
        StepRequest step = bundle.Request.Workflows[0].Steps.Single(s => s.OperationId == EnqueueReceiveWorkflow.Key);
        var appData = JsonSerializer.Deserialize<AppCommandData>(step.Command.Data!.Value)!;
        return CommandPayloadSerializer.Deserialize<EnqueueReceiveWorkflowPayload>(appData.Payload)!;
    }

    [Fact]
    public async Task Create_MailboxPipeline_EndsMainWithTheReceiveEnqueueAndEmitsNoConclusion()
    {
        var factory = CreateFactory(serviceTasks: new ArchivingTask());
        var stateChange = CreateInitialTaskStart(altinnTaskType: "archiving");

        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        var serviceTaskSteps = ExtractServiceTaskSteps(bundle);
        StepRequest sendStep = Assert.Single(serviceTaskSteps).Step;
        Assert.Equal($"{ExecuteServiceTask.Key}: SendToArchive", sendStep.OperationId);
        Assert.DoesNotContain(serviceTaskSteps, s => s.Payload.StageName is null);

        var keys = ExtractCommandKeys(bundle);
        Assert.Equal(EnqueueReceiveWorkflow.Key, keys[^1]);
        Assert.Single(keys, key => key == EnqueueReceiveWorkflow.Key);
        Assert.True(keys.IndexOf(EnqueueReceiveWorkflow.Key) > keys.IndexOf(ExecuteServiceTask.Key));
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

        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        List<string> operationIds = bundle.Request.Workflows[0].Steps.Select(s => s.OperationId).ToList();
        int mint = operationIds.IndexOf($"{MintMailbox.Key}: SendToArchive");
        Assert.NotEqual(-1, mint);
        Assert.Equal($"{ExecuteServiceTask.Key}: PrepareDocuments", operationIds[mint - 1]);
        Assert.Equal($"{ExecuteServiceTask.Key}: SendToArchive", operationIds[mint + 1]);
        // The declaring stage need not be last: an unrelated stage may follow the send, and only the send gets
        // a mint.
        Assert.Equal($"{ExecuteServiceTask.Key}: RecordDispatch", operationIds[mint + 2]);
        Assert.Single(operationIds, id => id.StartsWith(MintMailbox.Key, StringComparison.Ordinal));

        MintMailboxPayload payload = ExtractMintPayload(bundle);
        Assert.Equal("archiving", payload.ServiceTaskType);
        Assert.Equal("SendToArchive", payload.StageName);
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

        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        StepRequest mintStep = bundle
            .Request.Workflows[0]
            .Steps.Single(s => s.OperationId == $"{MintMailbox.Key}: SendToArchive");
        Assert.Null(mintStep.Command.MaxExecutionTime);
        Assert.Null(mintStep.Command.WaitBudget);
        Assert.Null(mintStep.RetryStrategy);
    }

    [Fact]
    public async Task Create_PipelineWithoutMailbox_EmitsNoMintStep()
    {
        var factory = CreateFactory(serviceTasks: new SigningTask());
        var stateChange = CreateInitialTaskStart(altinnTaskType: "signing");

        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        Assert.DoesNotContain(MintMailbox.Key, ExtractCommandKeys(bundle));
    }

    /// <summary>
    /// Fixed at assembly time, per the rule that a stage name is never re-derived at a later hop: the step
    /// that enqueues the receiver is told which exchange it answers.
    /// </summary>
    [Fact]
    public async Task Create_MailboxPipeline_NamesTheOpeningStageOnTheReceiveEnqueuePayload()
    {
        var factory = CreateFactory(serviceTasks: new ArchivingTask());
        var stateChange = CreateInitialTaskStart(altinnTaskType: "archiving");

        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        Assert.Equal("SendToArchive", ExtractReceiveEnqueuePayload(bundle).OpeningStageName);
    }

    [Fact]
    public async Task Create_PipelineWithoutMailbox_EnqueuesNoReceiveWorkflow()
    {
        var factory = CreateFactory(serviceTasks: new SigningTask());
        var stateChange = CreateInitialTaskStart(altinnTaskType: "signing");

        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        var keys = ExtractCommandKeys(bundle);
        Assert.DoesNotContain(EnqueueReceiveWorkflow.Key, keys);
        Assert.Contains(ExtractServiceTaskSteps(bundle), s => s.Payload.StageName is null);
    }

    [Fact]
    public async Task Create_MailboxPipeline_PreAssemblesTheReceiveWorkflowAsAnIndependentHead()
    {
        var factory = CreateFactory(serviceTasks: new ArchivingTask());
        var stateChange = CreateInitialTaskStart(altinnTaskType: "archiving");

        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

        EnqueueReceiveWorkflowPayload payload = ExtractReceiveEnqueuePayload(bundle);
        WorkflowRequest receiver = Assert.Single(payload.EnqueueRequest.Workflows);

        Assert.True(receiver.IsHead);
        Assert.False(receiver.DependsOnHeads);
        Assert.StartsWith(
            ProcessNextRequestFactory.MailboxReceiveOperationIdPrefix,
            receiver.OperationId,
            StringComparison.Ordinal
        );

        Assert.Null(receiver.Mailbox);
        Assert.Null(receiver.State);
        Assert.Null(payload.EnqueueRequest.Context);

        StepRequest receiveStep = Assert.Single(receiver.Steps);
        var appData = JsonSerializer.Deserialize<AppCommandData>(receiveStep.Command.Data!.Value)!;
        Assert.Equal(ExecuteServiceTask.Key, appData.CommandKey);
        var receivePayload = CommandPayloadSerializer.Deserialize<ExecuteServiceTaskPayload>(appData.Payload)!;
        Assert.Equal("archiving", receivePayload.ServiceTaskType);
        Assert.Null(receivePayload.StageName);
        Assert.Equal(TimeSpan.FromMinutes(3), receiveStep.Command.MaxExecutionTime);

        Assert.Equal(bundle.Request.Labels, payload.EnqueueRequest.Labels);
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
    public async Task Create_WithSideEffects_EmbedsAnInvisibleIndependentRootAtTheCommitBoundary()
    {
        // Arrange
        var factory = CreateFactory();
        var stateChange = CreateTaskToTaskTransition("Task_1", "Task_2");

        // Act
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

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
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

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
        var bundle = await factory.Create(
            TestInstance,
            stateChange,
            "lock-token",
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

        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", SignedTestState);

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
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", "{}");

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
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", "{}");

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
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", "{}");

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
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", "{}");

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
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", "{}");

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
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", "{}");

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
            factory.Create(TestInstance, stateChange, "lock-token", "{}")
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
            factory.Create(TestInstance, stateChange, "lock-token", "{}")
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
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", "{}");

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
        var bundle = await factory.Create(TestInstance, stateChange, "lock-token", "{}");

        // Assert
        var step = GetStep(bundle, OnTaskStartingHook.Key);
        Assert.Equal(TimeSpan.FromMinutes(3), step.Command.MaxExecutionTime);
    }
}
