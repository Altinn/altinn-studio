using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

public class CommitProcessStateTests
{
    [Fact]
    public async Task Execute_StagesProcessStateChangeWithoutCallingStorage()
    {
        CommandSetup setup = CreateCommandSetup(CreateInstance("Task_1"));
        var payload = CreateProcessStateChangePayload(setup.UnitOfWork.Instance, "Task_2");
        CommitProcessState command = CreateCommand();
        StorageInstanceMutationRequest? capturedMutation = null;
        setup
            .MutationClient.Setup(x =>
                x.CommitInstanceMutationWithStorageMetadata(
                    1337,
                    It.IsAny<Guid>(),
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (
                    int _,
                    Guid _,
                    StorageInstanceMutationRequest mutation,
                    IReadOnlyDictionary<string, StorageInstanceMutationContent> _,
                    StorageAuthenticationMethod? _,
                    StorageWritePreconditions? _,
                    CancellationToken _
                ) =>
                {
                    capturedMutation = mutation;
                    return new InstanceMutationWithStorageMetadata(
                        new Instance
                        {
                            Id = setup.UnitOfWork.Instance.Id,
                            AppId = setup.UnitOfWork.Instance.AppId,
                            Org = setup.UnitOfWork.Instance.Org,
                            InstanceOwner = setup.UnitOfWork.Instance.InstanceOwner,
                            Process = new ProcessState
                            {
                                CurrentTask = mutation.ProcessState?.State?.CurrentTask,
                                Status = mutation.ProcessState?.State?.Status,
                            },
                            Data = [],
                        },
                        new StorageVersionMetadata(InstanceVersion: 13, ProcessStateVersion: 9)
                    );
                }
            );
        ProcessEngineCommandResult result = await ((IWorkflowEngineCommand)command).Execute(
            CreateContext(setup.UnitOfWork, payload)
        );

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        setup.MutationClient.VerifyNoOtherCalls();

        WorkflowAggregateSaveOutcome outcome = await setup.UnitOfWork.SaveWorkflowOwnedAggregate(
            setup.UnitOfWork.GetDataElementChanges(false),
            "commit-process-state-step-id",
            CancellationToken.None
        );

        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, outcome);
        Assert.Equal("Task_2", setup.UnitOfWork.Instance.Process?.CurrentTask?.ElementId);
        Assert.Equal(ProcessStatus.Idle, setup.UnitOfWork.Instance.Process?.Status);
        Assert.Equal("Task_2", capturedMutation?.ProcessState?.State?.CurrentTask?.ElementId);
        Assert.Equal(ProcessStatus.Processing, capturedMutation?.ExpectedProcessStatus);
        Assert.Equal(ProcessStatus.Idle, capturedMutation?.ProcessState?.State?.Status);
        Assert.Equal("process_StartTask", Assert.Single(capturedMutation!.ProcessState!.Events!).EventType);
    }

    [Fact]
    public async Task Execute_WhenServiceTaskFollows_DurablyCommitsTargetAndKeepsProcessingBeforeServiceRuns()
    {
        CommandSetup setup = CreateCommandSetup(CreateInstance("Task_1"));
        var payload = CreateProcessStateChangePayload(
            setup.UnitOfWork.Instance,
            "ServiceTask_1",
            serviceTaskFollows: true
        );
        var capturedMutations = new List<StorageInstanceMutationRequest>();
        setup
            .MutationClient.Setup(x =>
                x.CommitInstanceMutationWithStorageMetadata(
                    1337,
                    It.IsAny<Guid>(),
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (
                    int _,
                    Guid _,
                    StorageInstanceMutationRequest mutation,
                    IReadOnlyDictionary<string, StorageInstanceMutationContent> _,
                    StorageAuthenticationMethod? _,
                    StorageWritePreconditions? _,
                    CancellationToken _
                ) =>
                {
                    capturedMutations.Add(mutation);
                    return new InstanceMutationWithStorageMetadata(
                        new Instance
                        {
                            Id = setup.UnitOfWork.Instance.Id,
                            AppId = setup.UnitOfWork.Instance.AppId,
                            Org = setup.UnitOfWork.Instance.Org,
                            InstanceOwner = setup.UnitOfWork.Instance.InstanceOwner,
                            Process = new ProcessState
                            {
                                CurrentTask = mutation.ProcessState?.State?.CurrentTask,
                                Status = mutation.ProcessState?.State?.Status,
                            },
                            Data = [],
                        },
                        new StorageVersionMetadata(InstanceVersion: 13, ProcessStateVersion: 9)
                    );
                }
            );

        ProcessEngineCommandResult result = await ((IWorkflowEngineCommand)CreateCommand()).Execute(
            CreateContext(setup.UnitOfWork, payload)
        );

        var success = Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.False(success.AutoAdvanceProcess);
        Assert.Equal(ProcessStatus.Processing, setup.UnitOfWork.Instance.Process?.Status);

        await setup.UnitOfWork.SaveWorkflowOwnedAggregate(
            setup.UnitOfWork.GetDataElementChanges(false),
            Guid.NewGuid().ToString(),
            CancellationToken.None
        );

        StorageInstanceMutationRequest firstMutation = Assert.Single(capturedMutations);
        Assert.Equal(ProcessStatus.Processing, firstMutation.ExpectedProcessStatus);
        Assert.Equal(ProcessStatus.Processing, firstMutation.ProcessState?.State?.Status);
        Assert.Equal("ServiceTask_1", firstMutation.ProcessState?.State?.CurrentTask?.ElementId);
        Assert.Equal("ServiceTask_1", setup.UnitOfWork.Instance.Process?.CurrentTask?.ElementId);
        Assert.Equal(ProcessStatus.Processing, setup.UnitOfWork.Instance.Process?.Status);

        ProcessEngineCommandResult dependentResult = await ((IWorkflowEngineCommand)CreateCommand()).Execute(
            CreateContext(
                setup.UnitOfWork,
                CreateProcessStateChangePayload(setup.UnitOfWork.Instance, "InteractiveTask_1")
            )
        );
        Assert.IsType<SuccessfulProcessEngineCommandResult>(dependentResult);
        await setup.UnitOfWork.SaveWorkflowOwnedAggregate(
            setup.UnitOfWork.GetDataElementChanges(false),
            Guid.NewGuid().ToString(),
            CancellationToken.None
        );

        Assert.Equal(2, capturedMutations.Count);
        StorageInstanceMutationRequest dependentMutation = capturedMutations[1];
        Assert.Equal(ProcessStatus.Processing, dependentMutation.ExpectedProcessStatus);
        Assert.Equal(ProcessStatus.Idle, dependentMutation.ProcessState?.State?.Status);
        Assert.Equal(ProcessStatus.Idle, setup.UnitOfWork.Instance.Process?.Status);
    }

    [Fact]
    public async Task Execute_ProcessEnd_StagesLockedCleanupStatusClearAndHardDeleteInSingleAggregate()
    {
        const string autoDeleteDataType = "auto-delete";
        var applicationMetadata = new ApplicationMetadata("ttd/test-app")
        {
            AutoDeleteOnProcessEnd = true,
            DataTypes =
            [
                new DataType
                {
                    Id = autoDeleteDataType,
                    AppLogic = new ApplicationLogic { AutoDeleteOnProcessEnd = true },
                },
            ],
        };
        Instance instance = CreateInstance("Task_1");
        var lockedDataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            InstanceGuid = new InstanceIdentifier(instance).InstanceGuid.ToString(),
            DataType = autoDeleteDataType,
            Locked = true,
        };
        instance.Data = [lockedDataElement];
        CommandSetup setup = CreateCommandSetup(instance, applicationMetadata);
        var ended = DateTime.UtcNow;
        var processEvent = new InstanceEvent { EventType = InstanceEventType.process_EndEvent.ToString() };
        var payload = new ProcessStateChangePayload(
            new ProcessStateChange
            {
                OldProcessState = instance.Process,
                NewProcessState = new ProcessState
                {
                    Ended = ended,
                    EndEvent = "EndEvent_1",
                    CurrentTask = null,
                },
                Events = [processEvent],
            }
        );
        StorageInstanceMutationRequest? capturedMutation = null;
        setup
            .MutationClient.Setup(x =>
                x.CommitInstanceMutationWithStorageMetadata(
                    1337,
                    It.IsAny<Guid>(),
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (
                    int _,
                    Guid _,
                    StorageInstanceMutationRequest mutation,
                    IReadOnlyDictionary<string, StorageInstanceMutationContent> _,
                    StorageAuthenticationMethod? _,
                    StorageWritePreconditions? _,
                    CancellationToken _
                ) =>
                {
                    capturedMutation = mutation;
                    return new InstanceMutationWithStorageMetadata(
                        new Instance
                        {
                            Id = instance.Id,
                            AppId = instance.AppId,
                            Org = instance.Org,
                            InstanceOwner = instance.InstanceOwner,
                            Process = new ProcessState
                            {
                                Ended = ended,
                                EndEvent = "EndEvent_1",
                                Status = ProcessStatus.Idle,
                            },
                            Status = new InstanceStatus
                            {
                                IsHardDeleted = true,
                                IsSoftDeleted = true,
                                HardDeleted = DateTime.UtcNow,
                                SoftDeleted = DateTime.UtcNow,
                            },
                            Data = [],
                        },
                        new StorageVersionMetadata(InstanceVersion: 13, ProcessStateVersion: 9)
                    );
                }
            );

        ProcessEngineCommandResult commandResult = await (
            (IWorkflowEngineCommand)CreateCommand(applicationMetadata)
        ).Execute(CreateContext(setup.UnitOfWork, payload));
        Assert.IsType<SuccessfulProcessEngineCommandResult>(commandResult);
        setup.MutationClient.VerifyNoOtherCalls();

        WorkflowAggregateSaveOutcome outcome = await setup.UnitOfWork.SaveWorkflowOwnedAggregate(
            setup.UnitOfWork.GetDataElementChanges(false),
            Guid.NewGuid().ToString(),
            CancellationToken.None
        );

        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, outcome);
        Assert.NotNull(capturedMutation);
        Assert.Equal(ProcessStatus.Processing, capturedMutation.ExpectedProcessStatus);
        Assert.Equal(ProcessStatus.Idle, capturedMutation.ProcessState?.State?.Status);
        Assert.Equal("EndEvent_1", capturedMutation.ProcessState?.State?.EndEvent);
        Assert.Equal(ended, capturedMutation.ProcessState?.State?.Ended);
        Assert.Equal(processEvent.EventType, Assert.Single(capturedMutation.ProcessState!.Events!).EventType);
        var delete = Assert.Single(capturedMutation.DeleteDataElements);
        Assert.Equal(Guid.Parse(lockedDataElement.Id), delete.DataElementId);
        Assert.True(delete.IgnoreLock);
        Assert.True(capturedMutation.DeleteInstance?.Hard);
        Assert.Equal(ProcessStatus.Idle, setup.UnitOfWork.Instance.Process?.Status);
        Assert.True(setup.UnitOfWork.Instance.Status.IsHardDeleted);
        Assert.Empty(setup.UnitOfWork.Instance.Data);
        setup.MutationClient.Verify(
            x =>
                x.CommitInstanceMutationWithStorageMetadata(
                    1337,
                    It.IsAny<Guid>(),
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
    }

    [Theory]
    [InlineData(false, true, 1, false)]
    [InlineData(true, false, 0, true)]
    [InlineData(false, false, 0, false)]
    public async Task Execute_ProcessEnd_PreservesEachCleanupConfiguration(
        bool deleteInstance,
        bool deleteDataType,
        int expectedElementDeletes,
        bool expectedInstanceDelete
    )
    {
        const string dataTypeId = "terminal-data";
        var metadata = new ApplicationMetadata("ttd/test-app")
        {
            AutoDeleteOnProcessEnd = deleteInstance,
            DataTypes =
            [
                new DataType
                {
                    Id = dataTypeId,
                    AppLogic = new ApplicationLogic { AutoDeleteOnProcessEnd = deleteDataType },
                },
            ],
        };
        Instance instance = CreateInstance("Task_1");
        instance.Data =
        [
            new DataElement
            {
                Id = Guid.NewGuid().ToString(),
                InstanceGuid = new InstanceIdentifier(instance).InstanceGuid.ToString(),
                DataType = dataTypeId,
                Locked = true,
            },
        ];
        CommandSetup setup = CreateCommandSetup(instance, metadata);
        StorageInstanceMutationRequest? capturedMutation = null;
        setup
            .MutationClient.Setup(x =>
                x.CommitInstanceMutationWithStorageMetadata(
                    1337,
                    It.IsAny<Guid>(),
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                (
                    int _,
                    Guid _,
                    StorageInstanceMutationRequest mutation,
                    IReadOnlyDictionary<string, StorageInstanceMutationContent> _,
                    StorageAuthenticationMethod? _,
                    StorageWritePreconditions? _,
                    CancellationToken _
                ) =>
                {
                    capturedMutation = mutation;
                    return new InstanceMutationWithStorageMetadata(
                        new Instance
                        {
                            Id = instance.Id,
                            AppId = instance.AppId,
                            Org = instance.Org,
                            InstanceOwner = instance.InstanceOwner,
                            Process = new ProcessState
                            {
                                Ended = mutation.ProcessState?.State?.Ended,
                                EndEvent = mutation.ProcessState?.State?.EndEvent,
                                Status = ProcessStatus.Idle,
                            },
                            Status = new InstanceStatus { IsHardDeleted = expectedInstanceDelete },
                            Data = expectedElementDeletes == 0 ? instance.Data : [],
                        },
                        new StorageVersionMetadata(InstanceVersion: 13, ProcessStateVersion: 9)
                    );
                }
            );
        var endedState = new ProcessState { Ended = DateTime.UtcNow, EndEvent = "EndEvent_1" };

        ProcessEngineCommandResult result = await ((IWorkflowEngineCommand)CreateCommand(metadata)).Execute(
            CreateContext(
                setup.UnitOfWork,
                new ProcessStateChangePayload(
                    new ProcessStateChange
                    {
                        OldProcessState = instance.Process,
                        NewProcessState = endedState,
                        Events = [new InstanceEvent { EventType = "process_EndEvent" }],
                    }
                )
            )
        );
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        await setup.UnitOfWork.SaveWorkflowOwnedAggregate(
            setup.UnitOfWork.GetDataElementChanges(false),
            Guid.NewGuid().ToString(),
            CancellationToken.None
        );

        Assert.NotNull(capturedMutation);
        Assert.Equal(expectedElementDeletes, capturedMutation.DeleteDataElements.Count);
        Assert.All(capturedMutation.DeleteDataElements, delete => Assert.True(delete.IgnoreLock));
        Assert.Equal(expectedInstanceDelete, capturedMutation.DeleteInstance?.Hard == true);
        Assert.Equal(ProcessStatus.Processing, capturedMutation.ExpectedProcessStatus);
        Assert.Equal(ProcessStatus.Idle, capturedMutation.ProcessState?.State?.Status);
    }

    [Theory]
    [InlineData(true, true, "EndEvent_1")]
    [InlineData(true, false, null)]
    [InlineData(true, false, "")]
    [InlineData(true, false, " ")]
    [InlineData(false, false, null)]
    [InlineData(false, false, "EndEvent_1")]
    public async Task Execute_WithInvalidProcessShape_FailsBeforeAnyStaging(
        bool isEnded,
        bool hasCurrentTask,
        string? endEvent
    )
    {
        var metadata = new ApplicationMetadata("ttd/test-app")
        {
            AutoDeleteOnProcessEnd = true,
            DataTypes =
            [
                new DataType
                {
                    Id = "auto-delete",
                    AppLogic = new ApplicationLogic { AutoDeleteOnProcessEnd = true },
                },
            ],
        };
        Instance instance = CreateInstance("Task_1");
        var dataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            InstanceGuid = new InstanceIdentifier(instance).InstanceGuid.ToString(),
            DataType = "auto-delete",
            Locked = true,
        };
        instance.Data = [dataElement];
        ProcessState originalProcess = instance.Process;
        CommandSetup setup = CreateCommandSetup(instance, metadata);
        var appMetadata = new Mock<IAppMetadata>(MockBehavior.Strict);
        var command = new CommitProcessState(appMetadata.Object);
        var payload = new ProcessStateChangePayload(
            new ProcessStateChange
            {
                OldProcessState = originalProcess,
                NewProcessState = new ProcessState
                {
                    Ended = isEnded ? DateTime.UtcNow : null,
                    EndEvent = endEvent,
                    CurrentTask = hasCurrentTask ? new ProcessElementInfo { ElementId = "Task_StillActive" } : null,
                },
                Events = [new InstanceEvent { EventType = "process_EndEvent" }],
            }
        );

        ProcessEngineCommandResult result = await ((IWorkflowEngineCommand)command).Execute(
            CreateContext(setup.UnitOfWork, payload)
        );

        var failure = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failure.NonRetryable);
        Assert.Equal("InvalidOperationException", failure.ExceptionType);
        Assert.Same(originalProcess, setup.UnitOfWork.Instance.Process);
        Assert.Equal(ProcessStatus.Processing, setup.UnitOfWork.Instance.Process?.Status);
        Assert.Same(dataElement, Assert.Single(setup.UnitOfWork.Instance.Data));
        Assert.True(dataElement.Locked);
        Assert.Equal(
            WorkflowAggregateSaveOutcome.NothingToSave,
            await setup.UnitOfWork.SaveWorkflowOwnedAggregate(
                setup.UnitOfWork.GetDataElementChanges(false),
                Guid.NewGuid().ToString(),
                CancellationToken.None
            )
        );
        setup.MutationClient.VerifyNoOtherCalls();
        appMetadata.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_WhenNewProcessStateIsNull_ReturnsPermanentFailure()
    {
        CommandSetup setup = CreateCommandSetup(CreateInstance("Task_1"));
        var payload = new ProcessStateChangePayload(
            new ProcessStateChange { OldProcessState = setup.UnitOfWork.Instance.Process, NewProcessState = null }
        );
        CommitProcessState command = CreateCommand();

        ProcessEngineCommandResult result = await ((IWorkflowEngineCommand)command).Execute(
            CreateContext(setup.UnitOfWork, payload)
        );

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("InvalidOperationException", failed.ExceptionType);
        setup.MutationClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_WhenMutatorIsNotUnitOfWork_ReturnsPermanentFailure()
    {
        var payload = CreateProcessStateChangePayload(CreateInstance("Task_1"), "Task_2");
        var context = CreateContext(Mock.Of<IInstanceDataMutator>(), payload);
        CommitProcessState command = CreateCommand();

        ProcessEngineCommandResult result = await ((IWorkflowEngineCommand)command).Execute(context);

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("InvalidOperationException", failed.ExceptionType);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("{")]
    [InlineData("{\"processStateChange\":{}}")]
    [InlineData("{\"$type\":\"processStateChange\"}")]
    [InlineData("{\"$type\":\"unknown\"}")]
    [InlineData("{\"$type\":\"executeServiceTask\",\"serviceTaskType\":\"test\"}")]
    public async Task Execute_WithInvalidPayload_ReturnsPermanentInvalidPayloadWithoutSideEffects(
        string? serializedPayload
    )
    {
        var mutatorMock = new Mock<IInstanceDataMutator>(MockBehavior.Strict);
        CommitProcessState command = CreateCommand();

        ProcessEngineCommandResult result = await ((IWorkflowEngineCommand)command).Execute(
            CreateContext(mutatorMock.Object, serializedPayload)
        );

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("CommitProcessState payload is missing or invalid", failed.ErrorMessage);
        Assert.Equal("InvalidPayloadException", failed.ExceptionType);
        mutatorMock.VerifyNoOtherCalls();
    }

    private static Instance CreateInstance(string taskId) =>
        new()
        {
            Id = $"1337/{Guid.NewGuid()}",
            AppId = "ttd/test-app",
            Org = "ttd",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState
            {
                Status = ProcessStatus.Processing,
                CurrentTask = new ProcessElementInfo { ElementId = taskId },
            },
            Data = [],
        };

    private static ProcessEngineCommandContext CreateContext(
        IInstanceDataMutator mutator,
        ProcessStateChangePayload payload
    ) => CreateContext(mutator, CommandPayloadSerializer.Serialize(payload));

    private static ProcessEngineCommandContext CreateContext(IInstanceDataMutator mutator, string? serializedPayload) =>
        new()
        {
            StateCarry = new(),
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutator,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = CommitProcessState.Key,
                Actor = new Actor { UserId = 1337 },
                Payload = serializedPayload,
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                StepId = Guid.NewGuid(),
                ExecutionReferenceTime = new DateTimeOffset(2025, 3, 14, 9, 26, 53, TimeSpan.Zero),
            },
        };

    private static ProcessStateChangePayload CreateProcessStateChangePayload(
        Instance instance,
        string taskId,
        bool serviceTaskFollows = false
    ) =>
        new(
            new ProcessStateChange
            {
                OldProcessState = instance.Process,
                NewProcessState = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
                Events = [new InstanceEvent { EventType = "process_StartTask" }],
            },
            serviceTaskFollows
        );

    private static CommitProcessState CreateCommand(ApplicationMetadata? applicationMetadata = null)
    {
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock
            .Setup(x => x.GetApplicationMetadata())
            .ReturnsAsync(applicationMetadata ?? new ApplicationMetadata("ttd/test-app") { DataTypes = [] });
        return new CommitProcessState(appMetadataMock.Object);
    }

    private static CommandSetup CreateCommandSetup(Instance instance, ApplicationMetadata? applicationMetadata = null)
    {
        applicationMetadata ??= new ApplicationMetadata("ttd/test-app") { DataTypes = [] };
        var dataClientMock = new Mock<IDataClientWithStorageMetadata>(MockBehavior.Strict);
        var mutationClientMock = dataClientMock.As<IInstanceMutationClient>();
        var unitOfWork = new InstanceDataUnitOfWork(
            instance,
            new StorageVersionMetadata(InstanceVersion: 12, ProcessStateVersion: 8),
            dataClientMock.Object,
            mutationClientMock.Object,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            applicationMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            taskId: null,
            language: null
        );

        return new CommandSetup(unitOfWork, mutationClientMock);
    }

    private sealed record CommandSetup(InstanceDataUnitOfWork UnitOfWork, Mock<IInstanceMutationClient> MutationClient);
}
