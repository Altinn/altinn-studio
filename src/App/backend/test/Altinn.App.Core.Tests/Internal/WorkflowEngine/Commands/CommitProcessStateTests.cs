using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

public class CommitProcessStateTests
{
    [Fact]
    public async Task Execute_StagesProcessStateChangeWithoutCallingStorage()
    {
        using CommandSetup setup = CreateCommandSetup(CreateInstance("Task_1"));
        var payload = CreateProcessStateChangePayload(setup.UnitOfWork.Instance, "Task_2");
        var command = new CommitProcessState();
        StorageInstanceMutationRequest? capturedMutation = null;
        setup
            .DataClient.Setup(x =>
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
                            Process = mutation.ProcessState?.State,
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
        setup.DataClient.VerifyNoOtherCalls();

        WorkflowAggregateSaveOutcome outcome = await setup.UnitOfWork.SaveWorkflowOwnedAggregate(
            setup.UnitOfWork.GetDataElementChanges(false),
            "commit-process-state-step-id",
            CancellationToken.None
        );

        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, outcome);
        Assert.Equal("Task_2", setup.UnitOfWork.Instance.Process?.CurrentTask?.ElementId);
        Assert.Equal("Task_2", capturedMutation?.ProcessState?.State?.CurrentTask?.ElementId);
    }

    [Fact]
    public async Task Execute_WhenNewProcessStateIsNull_ReturnsPermanentFailure()
    {
        using CommandSetup setup = CreateCommandSetup(CreateInstance("Task_1"));
        var payload = new ProcessStateChangePayload(
            new ProcessStateChange { OldProcessState = setup.UnitOfWork.Instance.Process, NewProcessState = null }
        );
        var command = new CommitProcessState();

        ProcessEngineCommandResult result = await ((IWorkflowEngineCommand)command).Execute(
            CreateContext(setup.UnitOfWork, payload)
        );

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("InvalidOperationException", failed.ExceptionType);
        setup.DataClient.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_WhenMutatorIsNotUnitOfWork_ReturnsPermanentFailure()
    {
        var payload = CreateProcessStateChangePayload(CreateInstance("Task_1"), "Task_2");
        var context = CreateContext(Mock.Of<IInstanceDataMutator>(), payload);
        var command = new CommitProcessState();

        ProcessEngineCommandResult result = await ((IWorkflowEngineCommand)command).Execute(context);

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("InvalidOperationException", failed.ExceptionType);
    }

    private static Instance CreateInstance(string taskId) =>
        CreateInstanceWithStorageMetadata(
            new Instance
            {
                Id = $"1337/{Guid.NewGuid()}",
                AppId = "ttd/test-app",
                Org = "ttd",
                InstanceOwner = new InstanceOwner { PartyId = "1337" },
                Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
                Data = [],
            }
        );

    private static Instance CreateInstanceWithStorageMetadata(Instance instance)
    {
        InstanceStorageMetadataRegistry.Set(
            instance,
            new StorageVersionMetadata(InstanceVersion: 12, ProcessStateVersion: 8)
        );
        return instance;
    }

    private static ProcessEngineCommandContext CreateContext(
        IInstanceDataMutator mutator,
        ProcessStateChangePayload payload
    ) =>
        new()
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutator,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = CommitProcessState.Key,
                Actor = new Actor { UserId = 1337 },
                Payload = CommandPayloadSerializer.Serialize(payload),
                LockToken = Guid.NewGuid().ToString(),
                State = "{}",
                WorkflowId = Guid.NewGuid(),
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

    private static CommandSetup CreateCommandSetup(Instance instance)
    {
        var dataClientMock = new Mock<IStorageDataClient>(MockBehavior.Strict);
        var unitOfWork = new InstanceDataUnitOfWork(
            instance,
            dataClientMock.Object,
            Mock.Of<IStorageInstanceClient>(),
            new ApplicationMetadata("ttd/test-app") { DataTypes = [] },
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            new InstanceDataMutatorStorageAccessGuard(),
            taskId: null,
            language: null
        );

        return new CommandSetup(unitOfWork, dataClientMock);
    }

    private sealed record CommandSetup(InstanceDataUnitOfWork UnitOfWork, Mock<IStorageDataClient> DataClient)
        : IDisposable
    {
        public void Dispose() => UnitOfWork.Dispose();
    }
}
