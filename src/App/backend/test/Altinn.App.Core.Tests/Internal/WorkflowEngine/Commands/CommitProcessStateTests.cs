using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.App.Tests.Common;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;
using Moq;
using NewtonsoftJson = Newtonsoft.Json.JsonConvert;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

public class CommitProcessStateTests
{
    [Fact]
    public async Task Execute_StagesProcessStateChangeAndKeepsProcessing()
    {
        CommandSetup setup = CreateCommandSetup(CreateInstance("Task_1"));
        List<StorageInstanceMutationRequest> mutations = CaptureMutations(setup);

        WorkflowEngineCommandResult result = await ((IWorkflowEngineCommand)CreateCommand()).Execute(
            CreateContext(setup.UnitOfWork, CreateProcessStateChangePayload(setup.UnitOfWork.Instance, "Task_2"))
        );

        Assert.IsType<SuccessfulWorkflowEngineCommandResult>(result);
        setup.MutationClient.VerifyNoOtherCalls();
        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, await Save(setup));
        StorageInstanceMutationRequest mutation = Assert.Single(mutations);
        Assert.Equal("Task_2", mutation.ProcessState?.State?.CurrentTask?.ElementId);
        Assert.Equal(ProcessStatus.Processing, mutation.ExpectedProcessStatus);
        Assert.Equal(ProcessStatus.Processing, mutation.ProcessState?.State?.Status);
        Assert.Equal("process_StartTask", Assert.Single(mutation.ProcessState!.Events!).EventType);
        Assert.Equal("Task_2", setup.UnitOfWork.Instance.Process?.CurrentTask?.ElementId);
        Assert.Equal(ProcessStatus.Processing, setup.UnitOfWork.Instance.Process?.Status);
    }

    [Fact]
    public async Task Execute_ThenReleaseProcessingStatus_ReleasesTheCommittedTaskInItsOwnSave()
    {
        CommandSetup setup = CreateCommandSetup(CreateInstance("Task_1"));
        List<StorageInstanceMutationRequest> mutations = CaptureMutations(setup);

        await ExecuteAndSave(
            setup,
            CreateCommand(),
            CreateContext(setup.UnitOfWork, CreateProcessStateChangePayload(setup.UnitOfWork.Instance, "Task_2"))
        );
        await ExecuteAndSave(setup, CreateRelease(), CreateContext(setup.UnitOfWork, serializedPayload: null));

        Assert.Equal(2, mutations.Count);
        StorageInstanceMutationRequest release = mutations[1];
        Assert.Equal(ProcessStatus.Processing, release.ExpectedProcessStatus);
        Assert.Equal(ProcessStatus.Idle, release.ProcessState?.State?.Status);
        Assert.Equal("Task_2", release.ProcessState?.State?.CurrentTask?.ElementId);
        Assert.Empty(release.ProcessState!.Events!);
        Assert.Null(release.DeleteInstance);
        Assert.Equal(ProcessStatus.Idle, setup.UnitOfWork.Instance.Process?.Status);
    }

    [Fact]
    public async Task Execute_ProcessEnd_CommitsEndedStateThenDeletesDataThenReleasesWithTheHardDelete()
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
        var dataElement = new DataElement
        {
            Id = Guid.NewGuid().ToString(),
            InstanceGuid = new InstanceIdentifier(instance).InstanceGuid.ToString(),
            DataType = autoDeleteDataType,
        };
        instance.Data = [dataElement];
        CommandSetup setup = CreateCommandSetup(instance, applicationMetadata);
        List<StorageInstanceMutationRequest> mutations = CaptureMutations(setup);
        var ended = DateTime.UtcNow;

        await ExecuteAndSave(
            setup,
            CreateCommand(),
            CreateContext(setup.UnitOfWork, CreateProcessEndPayload(instance, ended))
        );
        await ExecuteAndSave(
            setup,
            CreateDeleteData(applicationMetadata),
            CreateContext(setup.UnitOfWork, serializedPayload: null)
        );
        await ExecuteAndSave(
            setup,
            CreateRelease(applicationMetadata),
            CreateContext(setup.UnitOfWork, serializedPayload: null)
        );

        Assert.Equal(3, mutations.Count);
        StorageInstanceMutationRequest endMutation = mutations[0];
        Assert.Equal(ProcessStatus.Processing, endMutation.ProcessState?.State?.Status);
        Assert.Equal(ended, endMutation.ProcessState?.State?.Ended);
        Assert.Null(endMutation.ProcessState?.State?.CurrentTask);
        Assert.Empty(endMutation.DeleteDataElements);
        Assert.Null(endMutation.DeleteInstance);

        StorageInstanceMutationRequest dataMutation = mutations[1];
        Assert.Equal(ProcessStatus.Processing, dataMutation.ExpectedProcessStatus);
        Assert.Null(dataMutation.ProcessState);
        var delete = Assert.Single(dataMutation.DeleteDataElements);
        Assert.Equal(Guid.Parse(dataElement.Id), delete.DataElementId);
        Assert.Null(dataMutation.DeleteInstance);

        StorageInstanceMutationRequest releaseMutation = mutations[2];
        Assert.Equal(ProcessStatus.Processing, releaseMutation.ExpectedProcessStatus);
        Assert.Equal(ProcessStatus.Idle, releaseMutation.ProcessState?.State?.Status);
        Assert.Equal(ended, releaseMutation.ProcessState?.State?.Ended);
        Assert.Equal("EndEvent_1", releaseMutation.ProcessState?.State?.EndEvent);
        Assert.Empty(releaseMutation.DeleteDataElements);
        Assert.True(releaseMutation.DeleteInstance?.Hard);
    }

    [Fact]
    public async Task Commit_CountsAProcessStartOnceStorageHasIt()
    {
        using var telemetry = new TelemetrySink();
        Instance instance = CreateInstance("Task_1");
        instance.Process = null;
        CommandSetup setup = CreateCommandSetup(instance, telemetry: telemetry.Object);
        CaptureMutations(setup);
        var started = new DateTime(2026, 11, 2, 8, 0, 0, DateTimeKind.Utc);
        var payload = new ProcessStateChangePayload(
            new ProcessStateChange
            {
                OldProcessState = null,
                NewProcessState = new ProcessState
                {
                    Started = started,
                    StartEvent = "StartEvent_1",
                    CurrentTask = new ProcessElementInfo { ElementId = "Task_1" },
                },
                Events = [new InstanceEvent { EventType = InstanceEventType.process_StartEvent.ToString() }],
            }
        );

        await ExecuteAndSave(setup, CreateCommand(), CreateContext(setup.UnitOfWork, payload));

        Assert.Single(Measurements(telemetry, "altinn.app_lib.processes.started"));
        Assert.Empty(Measurements(telemetry, "altinn.app_lib.processes.ended"));
    }

    [Fact]
    public async Task Commit_CountsAProcessEndAndItsDurationOnceStorageHasIt()
    {
        using var telemetry = new TelemetrySink();
        Instance instance = CreateInstance("Task_1");
        var started = new DateTime(2026, 11, 2, 8, 0, 0, DateTimeKind.Utc);
        instance.Process!.Started = started;
        CommandSetup setup = CreateCommandSetup(instance, telemetry: telemetry.Object);
        CaptureMutations(setup);
        ProcessStateChangePayload payload = CreateProcessEndPayload(instance, started.AddHours(3));
        payload.ProcessStateChange.NewProcessState!.Started = started;

        await ExecuteAndSave(setup, CreateCommand(), CreateContext(setup.UnitOfWork, payload));
        await ExecuteAndSave(setup, CreateRelease(), CreateContext(setup.UnitOfWork, serializedPayload: null));

        Assert.Single(Measurements(telemetry, "altinn.app_lib.processes.ended"));
        var duration = Assert.Single(Measurements(telemetry, "altinn.app_lib.processes.duration"));
        Assert.Equal(TimeSpan.FromHours(3).TotalSeconds, duration.Value);
        Assert.Empty(Measurements(telemetry, "altinn.app_lib.processes.started"));
    }

    [Fact]
    public async Task Commit_DoesNotCountATaskTransition()
    {
        using var telemetry = new TelemetrySink();
        Instance instance = CreateInstance("Task_1");
        instance.Process!.Started = DateTime.UtcNow;
        CommandSetup setup = CreateCommandSetup(instance, telemetry: telemetry.Object);
        CaptureMutations(setup);
        ProcessStateChangePayload payload = CreateProcessStateChangePayload(instance, "Task_2");
        payload.ProcessStateChange.NewProcessState!.Started = instance.Process.Started;

        await ExecuteAndSave(setup, CreateCommand(), CreateContext(setup.UnitOfWork, payload));

        Assert.Empty(Measurements(telemetry, "altinn.app_lib.processes.started"));
        Assert.Empty(Measurements(telemetry, "altinn.app_lib.processes.ended"));
    }

    [Fact]
    public async Task Commit_DoesNotCountAProcessEndAgainWhenStorageReplaysTheSave()
    {
        using var telemetry = new TelemetrySink();
        Instance instance = CreateInstance("Task_1");
        var started = DateTime.UtcNow.AddHours(-1);
        instance.Process!.Started = started;
        Instance committed = CreateInstance("Task_1");
        committed.Id = instance.Id;
        committed.Process = new ProcessState
        {
            Started = started,
            Ended = DateTime.UtcNow,
            EndEvent = "EndEvent_1",
            Status = ProcessStatus.Processing,
        };
        var instanceClient = new Mock<IInstanceClientWithStorageMetadata>();
        instanceClient
            .Setup(x =>
                x.GetInstanceWithStorageMetadata(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int>(),
                    It.IsAny<Guid>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(committed, new StorageVersionMetadata(14, 9)));
        CommandSetup setup = CreateCommandSetup(
            instance,
            telemetry: telemetry.Object,
            instanceClient: instanceClient.Object
        );
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
                new InstanceMutationWithStorageMetadata(
                    committed,
                    new StorageVersionMetadata(14, 9),
                    [],
                    replayed: true
                )
            );
        ProcessStateChangePayload payload = CreateProcessEndPayload(instance, DateTime.UtcNow);
        payload.ProcessStateChange.NewProcessState!.Started = started;

        Assert.IsType<SuccessfulWorkflowEngineCommandResult>(
            await ((IWorkflowEngineCommand)CreateCommand()).Execute(CreateContext(setup.UnitOfWork, payload))
        );
        await Assert.ThrowsAsync<InstanceMutationReplayedException>(() => Save(setup));

        Assert.Empty(Measurements(telemetry, "altinn.app_lib.processes.ended"));
        Assert.Empty(Measurements(telemetry, "altinn.app_lib.processes.duration"));
    }

    [Fact]
    public async Task DeleteDataOnProcessEnd_WhenProcessHasNotEnded_ReturnsPermanentFailureWithoutStaging()
    {
        CommandSetup setup = CreateCommandSetup(CreateInstance("Task_1"));

        WorkflowEngineCommandResult result = await CreateDeleteData()
            .Execute(CreateContext(setup.UnitOfWork, serializedPayload: null));

        var failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal(WorkflowAggregateSaveOutcome.NothingToSave, await Save(setup));
    }

    [Fact]
    public async Task ReleaseProcessingStatus_DoesNotHardDeleteAnActiveProcess()
    {
        var metadata = new ApplicationMetadata("ttd/test-app") { AutoDeleteOnProcessEnd = true, DataTypes = [] };
        CommandSetup setup = CreateCommandSetup(CreateInstance("Task_1"), metadata);
        List<StorageInstanceMutationRequest> mutations = CaptureMutations(setup);

        await ExecuteAndSave(setup, CreateRelease(metadata), CreateContext(setup.UnitOfWork, serializedPayload: null));

        StorageInstanceMutationRequest release = Assert.Single(mutations);
        Assert.Equal(ProcessStatus.Idle, release.ProcessState?.State?.Status);
        Assert.Null(release.DeleteInstance);
    }

    [Theory]
    [InlineData(false, true, 1, false)]
    [InlineData(true, false, 0, true)]
    [InlineData(false, false, 0, false)]
    public async Task ProcessEnd_PreservesEachCleanupConfiguration(
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
            },
        ];
        CommandSetup setup = CreateCommandSetup(instance, metadata);
        List<StorageInstanceMutationRequest> mutations = CaptureMutations(setup);

        await ExecuteAndSave(
            setup,
            CreateCommand(),
            CreateContext(setup.UnitOfWork, CreateProcessEndPayload(instance, DateTime.UtcNow))
        );
        await ExecuteAndSave(
            setup,
            CreateDeleteData(metadata),
            CreateContext(setup.UnitOfWork, serializedPayload: null)
        );
        await ExecuteAndSave(setup, CreateRelease(metadata), CreateContext(setup.UnitOfWork, serializedPayload: null));

        // A cleanup step with nothing to delete stages nothing, so it makes no save.
        Assert.Equal(expectedElementDeletes > 0 ? 3 : 2, mutations.Count);
        Assert.Equal(expectedElementDeletes, mutations.Sum(mutation => mutation.DeleteDataElements.Count));
        StorageInstanceMutationRequest release = mutations[^1];
        Assert.Equal(expectedInstanceDelete, release.DeleteInstance?.Hard == true);
        Assert.Equal(ProcessStatus.Processing, release.ExpectedProcessStatus);
        Assert.Equal(ProcessStatus.Idle, release.ProcessState?.State?.Status);
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
        };
        instance.Data = [dataElement];
        ProcessState originalProcess = instance.Process;
        CommandSetup setup = CreateCommandSetup(instance, metadata);
        var command = new CommitProcessState();
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

        WorkflowEngineCommandResult result = await ((IWorkflowEngineCommand)command).Execute(
            CreateContext(setup.UnitOfWork, payload)
        );

        var failure = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
        Assert.True(failure.NonRetryable);
        Assert.Equal("InvalidOperationException", failure.ExceptionType);
        Assert.Same(originalProcess, setup.UnitOfWork.Instance.Process);
        Assert.Equal(ProcessStatus.Processing, setup.UnitOfWork.Instance.Process?.Status);
        Assert.Same(dataElement, Assert.Single(setup.UnitOfWork.Instance.Data));
        Assert.Equal(
            WorkflowAggregateSaveOutcome.NothingToSave,
            await setup.UnitOfWork.SaveWorkflowOwnedAggregate(
                setup.UnitOfWork.GetDataElementChanges(false),
                Guid.NewGuid().ToString(),
                CancellationToken.None
            )
        );
        setup.MutationClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_WhenNewProcessStateIsNull_ReturnsPermanentFailure()
    {
        CommandSetup setup = CreateCommandSetup(CreateInstance("Task_1"));
        var payload = new ProcessStateChangePayload(
            new ProcessStateChange { OldProcessState = setup.UnitOfWork.Instance.Process, NewProcessState = null }
        );
        CommitProcessState command = CreateCommand();

        WorkflowEngineCommandResult result = await ((IWorkflowEngineCommand)command).Execute(
            CreateContext(setup.UnitOfWork, payload)
        );

        var failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
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

        WorkflowEngineCommandResult result = await ((IWorkflowEngineCommand)command).Execute(context);

        var failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
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

        WorkflowEngineCommandResult result = await ((IWorkflowEngineCommand)command).Execute(
            CreateContext(mutatorMock.Object, serializedPayload)
        );

        var failed = Assert.IsType<FailedWorkflowEngineCommandResult>(result);
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

    private static WorkflowEngineCommandContext CreateContext(
        IInstanceDataMutator mutator,
        ProcessStateChangePayload payload
    ) => CreateContext(mutator, CommandPayloadSerializer.Serialize(payload));

    private static WorkflowEngineCommandContext CreateContext(
        IInstanceDataMutator mutator,
        string? serializedPayload
    ) =>
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

    private static ProcessStateChangePayload CreateProcessStateChangePayload(Instance instance, string taskId) =>
        new(
            new ProcessStateChange
            {
                OldProcessState = instance.Process,
                NewProcessState = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
                Events = [new InstanceEvent { EventType = "process_StartTask" }],
            }
        );

    private static ProcessStateChangePayload CreateProcessEndPayload(Instance instance, DateTime ended) =>
        new(
            new ProcessStateChange
            {
                OldProcessState = instance.Process,
                NewProcessState = new ProcessState { Ended = ended, EndEvent = "EndEvent_1" },
                Events = [new InstanceEvent { EventType = InstanceEventType.process_EndEvent.ToString() }],
            }
        );

    private static CommitProcessState CreateCommand() => new();

    private static ReleaseProcessingStatus CreateRelease(ApplicationMetadata? applicationMetadata = null) =>
        new(CreateAppMetadata(applicationMetadata));

    private static DeleteDataOnProcessEnd CreateDeleteData(ApplicationMetadata? applicationMetadata = null) =>
        new(CreateAppMetadata(applicationMetadata));

    private static IAppMetadata CreateAppMetadata(ApplicationMetadata? applicationMetadata)
    {
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock
            .Setup(x => x.ApplicationMetadata)
            .Returns(applicationMetadata ?? new ApplicationMetadata("ttd/test-app") { DataTypes = [] });
        return appMetadataMock.Object;
    }

    /// <summary>
    /// Runs one workflow step and the save that follows it, as the callback controller does.
    /// </summary>
    private static async Task ExecuteAndSave(
        CommandSetup setup,
        IWorkflowEngineCommand command,
        WorkflowEngineCommandContext context
    )
    {
        Assert.IsType<SuccessfulWorkflowEngineCommandResult>(await command.Execute(context));
        await Save(setup);
    }

    private static Task<WorkflowAggregateSaveOutcome> Save(CommandSetup setup) =>
        setup.UnitOfWork.SaveWorkflowOwnedAggregate(
            setup.UnitOfWork.GetDataElementChanges(false),
            Guid.NewGuid().ToString(),
            CancellationToken.None
        );

    /// <summary>
    /// Records every Storage mutation and answers with the instance it describes.
    /// </summary>
    private static List<StorageInstanceMutationRequest> CaptureMutations(CommandSetup setup)
    {
        var mutations = new List<StorageInstanceMutationRequest>();
        Instance instance = setup.UnitOfWork.Instance;
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
                    // Snapshot the request as Storage would receive it: later steps change the same objects.
                    mutations.Add(
                        NewtonsoftJson.DeserializeObject<StorageInstanceMutationRequest>(
                            NewtonsoftJson.SerializeObject(mutation)
                        )!
                    );
                    HashSet<Guid> deleted = mutation.DeleteDataElements.Select(d => d.DataElementId).ToHashSet();
                    return new InstanceMutationWithStorageMetadata(
                        new Instance
                        {
                            Id = instance.Id,
                            AppId = instance.AppId,
                            Org = instance.Org,
                            InstanceOwner = instance.InstanceOwner,
                            Process = mutation.ProcessState?.State ?? setup.UnitOfWork.Instance.Process,
                            Status = new InstanceStatus { IsHardDeleted = mutation.DeleteInstance?.Hard == true },
                            Data = setup
                                .UnitOfWork.Instance.Data.Where(element => !deleted.Contains(Guid.Parse(element.Id)))
                                .ToList(),
                        },
                        new StorageVersionMetadata(InstanceVersion: 13 + mutations.Count, ProcessStateVersion: 9)
                    );
                }
            );
        return mutations;
    }

    private static CommandSetup CreateCommandSetup(
        Instance instance,
        ApplicationMetadata? applicationMetadata = null,
        Telemetry? telemetry = null,
        IInstanceClientWithStorageMetadata? instanceClient = null
    )
    {
        applicationMetadata ??= new ApplicationMetadata("ttd/test-app") { DataTypes = [] };
        var dataClientMock = new Mock<IDataClientWithStorageMetadata>(MockBehavior.Strict);
        var mutationClientMock = dataClientMock.As<IInstanceMutationClient>();
        var unitOfWork = new InstanceDataUnitOfWork(
            instance,
            new StorageVersionMetadata(InstanceVersion: 12, ProcessStateVersion: 8),
            dataClientMock.Object,
            mutationClientMock.Object,
            instanceClient ?? Mock.Of<IInstanceClientWithStorageMetadata>(),
            applicationMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            taskId: null,
            language: null,
            telemetry: telemetry
        );

        return new CommandSetup(unitOfWork, mutationClientMock);
    }

    private static IReadOnlyList<MetricMeasurement> Measurements(TelemetrySink telemetry, string name) =>
        telemetry.CapturedMetrics.TryGetValue((name, "Altinn.App"), out var measurements) ? measurements : [];

    private sealed record CommandSetup(InstanceDataUnitOfWork UnitOfWork, Mock<IInstanceMutationClient> MutationClient);
}
