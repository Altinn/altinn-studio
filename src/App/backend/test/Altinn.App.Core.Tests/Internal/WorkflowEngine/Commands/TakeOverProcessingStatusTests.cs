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
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands;

public class TakeOverProcessingStatusTests
{
    [Fact]
    public async Task Execute_StagesProcessingToProcessingAndSendsSynthesizedProcessPayload()
    {
        var instance = CreateInstance(ProcessStatus.Processing);
        ProcessState inMemoryProcess = instance.Process!;
        var dataClient = new Mock<IDataClientWithStorageMetadata>(MockBehavior.Strict);
        var mutationClient = dataClient.As<IInstanceMutationClient>();
        var unitOfWork = CreateUnitOfWork(instance, dataClient.Object, mutationClient.Object);
        StorageInstanceMutationRequest? capturedMutation = null;
        mutationClient
            .Setup(x =>
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
                    var stored = new Instance
                    {
                        Id = instance.Id,
                        AppId = instance.AppId,
                        Org = instance.Org,
                        InstanceOwner = instance.InstanceOwner,
                        Process = new ProcessState
                        {
                            Status = mutation.ProcessState?.State?.Status,
                            CurrentTask = instance.Process!.CurrentTask,
                        },
                        Data = [],
                    };
                    return new InstanceMutationWithStorageMetadata(
                        stored,
                        new StorageVersionMetadata(InstanceVersion: 13, ProcessStateVersion: 9)
                    );
                }
            );

        ProcessEngineCommandResult result = await new TakeOverProcessingStatus().Execute(CreateContext(unitOfWork));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.Equal(ProcessStatus.Processing, unitOfWork.Instance.Process?.Status);
        mutationClient.VerifyNoOtherCalls();

        WorkflowAggregateSaveOutcome outcome = await unitOfWork.SaveWorkflowOwnedAggregate(
            unitOfWork.GetDataElementChanges(false),
            Guid.NewGuid().ToString(),
            CancellationToken.None
        );

        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, outcome);
        Assert.Equal(ProcessStatus.Processing, capturedMutation?.ExpectedProcessStatus);
        var processStateUpdate = capturedMutation?.ProcessState;
        Assert.NotNull(processStateUpdate);
        Assert.NotNull(processStateUpdate.Events);
        Assert.Empty(processStateUpdate.Events);
        Assert.NotNull(processStateUpdate.State);
        ProcessState payloadState = processStateUpdate.State;
        Assert.NotSame(inMemoryProcess, payloadState);
        Assert.Equal(ProcessStatus.Processing, payloadState.Status);
        Assert.Equal(inMemoryProcess.Started, payloadState.Started);
        Assert.Equal(inMemoryProcess.CurrentTask?.ElementId, payloadState.CurrentTask?.ElementId);
        Assert.Null(payloadState.Ended);
        Assert.Equal(ProcessStatus.Processing, unitOfWork.Instance.Process?.Status);
    }

    [Fact]
    public async Task Execute_WhenMutatorIsNotWorkflowUnitOfWork_FailsWithoutSideEffects()
    {
        var mutator = new Mock<IInstanceDataMutator>(MockBehavior.Strict);

        ProcessEngineCommandResult result = await new TakeOverProcessingStatus().Execute(CreateContext(mutator.Object));

        var failure = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failure.NonRetryable);
        mutator.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_WhenProcessStateIsMissing_FailsWithoutStagingATransition()
    {
        var instance = CreateInstance(ProcessStatus.Processing);
        instance.Process = null;
        var dataClient = new Mock<IDataClientWithStorageMetadata>(MockBehavior.Strict);
        var mutationClient = dataClient.As<IInstanceMutationClient>();
        var unitOfWork = CreateUnitOfWork(instance, dataClient.Object, mutationClient.Object);

        ProcessEngineCommandResult result = await new TakeOverProcessingStatus().Execute(CreateContext(unitOfWork));

        var failure = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failure.NonRetryable);
        WorkflowAggregateSaveOutcome outcome = await unitOfWork.SaveWorkflowOwnedAggregate(
            unitOfWork.GetDataElementChanges(false),
            Guid.NewGuid().ToString(),
            CancellationToken.None
        );
        Assert.Equal(WorkflowAggregateSaveOutcome.NothingToSave, outcome);
        mutationClient.VerifyNoOtherCalls();
    }

    private static ProcessEngineCommandContext CreateContext(IInstanceDataMutator mutator) =>
        new()
        {
            StateCarry = new(),
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutator,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = TakeOverProcessingStatus.Key,
                Actor = new Actor { UserId = 1337 },
                State = "{}",
                WorkflowId = Guid.NewGuid(),
                StepId = Guid.NewGuid(),
                ExecutionReferenceTime = DateTimeOffset.UtcNow,
            },
        };

    private static InstanceDataUnitOfWork CreateUnitOfWork(
        Instance instance,
        IDataClientWithStorageMetadata dataClient,
        IInstanceMutationClient mutationClient
    ) =>
        new(
            instance,
            new StorageVersionMetadata(InstanceVersion: 12, ProcessStateVersion: 8),
            dataClient,
            mutationClient,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            new ApplicationMetadata("ttd/test-app") { DataTypes = [] },
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            taskId: null,
            language: null
        );

    private static Instance CreateInstance(ProcessStatus status) =>
        new()
        {
            Id = $"1337/{Guid.NewGuid()}",
            AppId = "ttd/test-app",
            Org = "ttd",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState
            {
                Status = status,
                Started = new DateTime(2026, 7, 20, 11, 0, 0, DateTimeKind.Utc),
                CurrentTask = new ProcessElementInfo { ElementId = "Task_1" },
            },
            Data = [],
        };
}
