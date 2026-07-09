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
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands.ProcessNext.ProcessEnd;

public class DeleteInstanceIfConfiguredTests
{
    private static ProcessEngineCommandContext CreateContext(Instance instance, IInstanceDataMutator? mutator = null)
    {
        if (mutator is null)
        {
            var mutatorMock = new Mock<IInstanceDataMutator>();
            mutatorMock.Setup(x => x.Instance).Returns(instance);
            mutator = mutatorMock.Object;
        }

        return new ProcessEngineCommandContext
        {
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = mutator,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = DeleteInstanceIfConfigured.Key,
                Actor = new Actor { UserId = 1337 },
                LockToken = Guid.NewGuid().ToString(),
                State = "{}",
                WorkflowId = Guid.Empty,
            },
        };
    }

    private static Instance CreateInstance(bool processEnded = true)
    {
        var instanceGuid = Guid.NewGuid();
        var instance = new Instance
        {
            Id = $"1337/{instanceGuid}",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState(),
            Data = [],
        };

        if (processEnded)
        {
            instance.Process.Ended = DateTime.UtcNow;
            instance.Process.EndEvent = "EndEvent_1";
        }

        InstanceStorageMetadataRegistry.Set(
            instance,
            new StorageVersionMetadata(InstanceVersion: 12, ProcessStateVersion: 8)
        );
        return instance;
    }

    private static InstanceDataUnitOfWork CreateUnitOfWork(
        Instance instance,
        ApplicationMetadata applicationMetadata,
        IStorageDataClient? dataClient = null,
        InstanceDataMutatorStorageAccessGuard? storageAccessGuard = null
    ) =>
        new(
            instance,
            dataClient ?? Mock.Of<IStorageDataClient>(),
            Mock.Of<IStorageInstanceClient>(),
            applicationMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            storageAccessGuard ?? new InstanceDataMutatorStorageAccessGuard(),
            taskId: null,
            language: null
        );

    [Fact]
    public async Task Execute_WhenAutoDeleteOnProcessEndTrueAndProcessEnded_StagesInstanceDeletion()
    {
        var instance = CreateInstance(processEnded: true);
        var applicationMetadata = new ApplicationMetadata("ttd/test-app") { AutoDeleteOnProcessEnd = true };
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);
        var dataClientMock = new Mock<IStorageDataClient>(MockBehavior.Strict);
        StorageInstanceMutationRequest? capturedMutation = null;
        dataClientMock
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
                    return new InstanceMutationWithStorageMetadata(
                        new Instance
                        {
                            Id = instance.Id,
                            Org = instance.Org,
                            AppId = instance.AppId,
                            InstanceOwner = instance.InstanceOwner,
                            Process = instance.Process,
                            Status = new InstanceStatus
                            {
                                IsHardDeleted = true,
                                IsSoftDeleted = true,
                                HardDeleted = DateTime.UtcNow,
                                SoftDeleted = DateTime.UtcNow,
                            },
                            Data = [],
                        },
                        new Dictionary<string, StorageDataElementMetadata>(),
                        new StorageVersionMetadata(InstanceVersion: 13, ProcessStateVersion: 8)
                    );
                }
            );
        using var unitOfWork = CreateUnitOfWork(instance, applicationMetadata, dataClientMock.Object);
        var command = new DeleteInstanceIfConfigured(appMetadataMock.Object);

        var result = await command.Execute(CreateContext(instance, unitOfWork));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        DataElementChanges changes = unitOfWork.GetDataElementChanges(initializeAltinnRowId: false);
        WorkflowAggregateSaveOutcome outcome = await unitOfWork.SaveWorkflowOwnedAggregate(
            changes,
            "delete-instance-step-id",
            CancellationToken.None
        );

        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, outcome);
        Assert.NotNull(capturedMutation?.DeleteInstance);
        Assert.True(capturedMutation.DeleteInstance.Hard);
    }

    [Fact]
    public async Task Execute_WhenAutoDeleteOnProcessEndTrue_DoesNotDisposeActiveUnitOfWork()
    {
        var instance = CreateInstance(processEnded: true);
        var applicationMetadata = new ApplicationMetadata("ttd/test-app") { AutoDeleteOnProcessEnd = true };
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);
        var storageAccessGuard = new InstanceDataMutatorStorageAccessGuard();
        using var unitOfWork = CreateUnitOfWork(instance, applicationMetadata, storageAccessGuard: storageAccessGuard);
        using IDisposable openedUnitOfWork = unitOfWork.Open();
        var command = new DeleteInstanceIfConfigured(appMetadataMock.Object);

        var result = await command.Execute(CreateContext(instance, unitOfWork));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        Assert.True(storageAccessGuard.IsActive);
    }

    [Fact]
    public async Task Execute_WhenAutoDeleteOnProcessEndFalse_DoesNotStageDeletion()
    {
        var instance = CreateInstance(processEnded: true);
        var applicationMetadata = new ApplicationMetadata("ttd/test-app") { AutoDeleteOnProcessEnd = false };
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);
        var dataClientMock = new Mock<IStorageDataClient>(MockBehavior.Strict);
        using var unitOfWork = CreateUnitOfWork(instance, applicationMetadata, dataClientMock.Object);
        var command = new DeleteInstanceIfConfigured(appMetadataMock.Object);

        var result = await command.Execute(CreateContext(instance, unitOfWork));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        DataElementChanges changes = unitOfWork.GetDataElementChanges(initializeAltinnRowId: false);
        WorkflowAggregateSaveOutcome outcome = await unitOfWork.SaveWorkflowOwnedAggregate(
            changes,
            "delete-instance-step-id",
            CancellationToken.None
        );
        Assert.Equal(WorkflowAggregateSaveOutcome.NothingToSave, outcome);
        dataClientMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_WhenProcessNotEnded_DoesNotStageDeletion()
    {
        var instance = CreateInstance(processEnded: false);
        var applicationMetadata = new ApplicationMetadata("ttd/test-app") { AutoDeleteOnProcessEnd = true };
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);
        var dataClientMock = new Mock<IStorageDataClient>(MockBehavior.Strict);
        using var unitOfWork = CreateUnitOfWork(instance, applicationMetadata, dataClientMock.Object);
        var command = new DeleteInstanceIfConfigured(appMetadataMock.Object);

        var result = await command.Execute(CreateContext(instance, unitOfWork));

        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        DataElementChanges changes = unitOfWork.GetDataElementChanges(initializeAltinnRowId: false);
        WorkflowAggregateSaveOutcome outcome = await unitOfWork.SaveWorkflowOwnedAggregate(
            changes,
            "delete-instance-step-id",
            CancellationToken.None
        );
        Assert.Equal(WorkflowAggregateSaveOutcome.NothingToSave, outcome);
        dataClientMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_WhenCallbackMutatorIsNotUnitOfWork_ReturnsPermanentFailure()
    {
        var instance = CreateInstance(processEnded: true);
        var applicationMetadata = new ApplicationMetadata("ttd/test-app") { AutoDeleteOnProcessEnd = true };
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);
        var command = new DeleteInstanceIfConfigured(appMetadataMock.Object);

        var result = await command.Execute(CreateContext(instance));

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Contains("InstanceDataUnitOfWork", failed.ErrorMessage, StringComparison.Ordinal);
    }
}
