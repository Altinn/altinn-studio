using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Helpers.Serialization;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.Texts;
using Altinn.App.Core.Internal.WorkflowEngine.Commands;
using Altinn.App.Core.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;
using Altinn.App.Core.Internal.WorkflowEngine.Models;
using Altinn.App.Core.Internal.WorkflowEngine.Models.AppCommand;
using Altinn.App.Core.Models;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Options;
using Moq;

namespace Altinn.App.Core.Tests.Internal.WorkflowEngine.Commands.ProcessNext.TaskStart;

public class UnlockTaskDataTests
{
    private static ProcessEngineCommandContext CreateContext(
        IInstanceDataMutator instanceDataMutator,
        string? serializedPayload = null
    )
    {
        return new ProcessEngineCommandContext
        {
            StateCarry = new(),
            AppId = new AppIdentifier("ttd", "test-app"),
            InstanceId = new InstanceIdentifier(1337, Guid.NewGuid()),
            InstanceDataMutator = instanceDataMutator,
            CancellationToken = CancellationToken.None,
            Payload = new AppCallbackPayload
            {
                CommandKey = UnlockTaskData.Key,
                Actor = new Actor { UserId = 1337 },
                Payload = serializedPayload,
                State = "{}",
                WorkflowId = Guid.Empty,
                StepId = Guid.NewGuid(),
                ExecutionReferenceTime = new DateTimeOffset(2025, 3, 14, 9, 26, 53, TimeSpan.Zero),
            },
        };
    }

    private static Instance CreateInstance(string taskId = "Task_1")
    {
        Guid instanceGuid = Guid.NewGuid();
        return new Instance
        {
            Id = $"1337/{instanceGuid}",
            Org = "ttd",
            AppId = "ttd/test-app",
            InstanceOwner = new InstanceOwner { PartyId = "1337" },
            Process = new ProcessState { CurrentTask = new ProcessElementInfo { ElementId = taskId } },
            Data =
            [
                CreateDataElement(instanceGuid, "task-data"),
                CreateDataElement(instanceGuid, "task-data"),
                CreateDataElement(instanceGuid, "task-attachment"),
                CreateDataElement(instanceGuid, "other-data"),
            ],
        };
    }

    private static DataElement CreateDataElement(Guid instanceGuid, string dataTypeId) =>
        new()
        {
            Id = Guid.NewGuid().ToString(),
            InstanceGuid = instanceGuid.ToString(),
            DataType = dataTypeId,
            ContentType = "application/json",
            Locked = true,
        };

    private static ApplicationMetadata CreateApplicationMetadata(string appId) =>
        new(appId)
        {
            DataTypes =
            [
                new DataType { Id = "task-data", TaskId = "Task_1" },
                new DataType { Id = "task-attachment", TaskId = "Task_1" },
                new DataType { Id = "other-data", TaskId = "Task_2" },
            ],
        };

    private static InstanceDataUnitOfWork CreateUnitOfWork(
        Instance instance,
        ApplicationMetadata applicationMetadata,
        IDataClientWithStorageMetadata dataClient,
        IInstanceMutationClient mutationClient
    ) =>
        new(
            instance,
            new StorageVersionMetadata(InstanceVersion: 12, ProcessStateVersion: null),
            dataClient,
            mutationClient,
            Mock.Of<IInstanceClientWithStorageMetadata>(),
            applicationMetadata,
            Mock.Of<ITranslationService>(),
            new ModelSerializationService(null!),
            Mock.Of<IAppResources>(),
            Options.Create(new FrontEndSettings()),
            taskId: null,
            language: null
        );

    [Fact]
    public async Task Execute_StagesUnlockStatusForEachDataTypeConnectedToTask_ReturnsSuccess()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        ApplicationMetadata applicationMetadata = CreateApplicationMetadata(instance.AppId);
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);
        var dataClientMock = new Mock<IDataClientWithStorageMetadata>(MockBehavior.Strict);
        var mutationClientMock = dataClientMock.As<IInstanceMutationClient>();
        StorageInstanceMutationRequest? capturedMutation = null;
        mutationClientMock
            .Setup(x =>
                x.CommitInstanceMutationWithStorageMetadata(
                    1337,
                    Guid.Parse(instance.Id.Split('/')[1]),
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
                    StorageInstanceMutationRequest request,
                    IReadOnlyDictionary<string, StorageInstanceMutationContent> _,
                    StorageAuthenticationMethod? _,
                    StorageWritePreconditions? _,
                    CancellationToken _
                ) =>
                {
                    capturedMutation = request;
                    return new InstanceMutationWithStorageMetadata(
                        instance,
                        new StorageVersionMetadata(InstanceVersion: 13, ProcessStateVersion: null)
                    );
                }
            );
        var unitOfWork = CreateUnitOfWork(
            instance,
            applicationMetadata,
            dataClientMock.Object,
            mutationClientMock.Object
        );
        var command = new UnlockTaskData(appMetadataMock.Object);
        string? serializedPayload = CommandPayloadSerializer.Serialize(new TaskDataLockPayload("Task_1"));
        var context = CreateContext(unitOfWork, serializedPayload);

        // Act
        var result = await ((IWorkflowEngineCommand)command).Execute(context);

        // Assert
        Assert.IsType<SuccessfulProcessEngineCommandResult>(result);
        WorkflowAggregateSaveOutcome outcome = await unitOfWork.SaveWorkflowOwnedAggregate(
            unitOfWork.GetDataElementChanges(initializeAltinnRowId: false),
            "unlock-task-data-step-id",
            CancellationToken.None
        );

        Assert.Equal(WorkflowAggregateSaveOutcome.Saved, outcome);
        Assert.NotNull(capturedMutation);
        Assert.Empty(capturedMutation.CreateDataElements);
        Assert.Empty(capturedMutation.DeleteDataElements);
        Assert.Equal(3, capturedMutation.UpdateDataElements.Count);
        Assert.All(capturedMutation.UpdateDataElements, update => AssertLockUpdate(update, expectedLocked: false));
        Assert.Equal(
            ["task-attachment", "task-data", "task-data"],
            capturedMutation
                .UpdateDataElements.Select(update =>
                    instance.Data.Single(dataElement => dataElement.Id == update.DataElementId.ToString()).DataType
                )
                .OrderBy(dataTypeId => dataTypeId, StringComparer.Ordinal)
                .ToList()
        );
        mutationClientMock.Verify(
            x =>
                x.CommitInstanceMutationWithStorageMetadata(
                    1337,
                    Guid.Parse(instance.Id.Split('/')[1]),
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );
        mutationClientMock.VerifyNoOtherCalls();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("{")]
    [InlineData("{\"taskId\":\"Task_1\"}")]
    [InlineData("{\"$type\":\"taskDataLock\"}")]
    [InlineData("{\"$type\":\"taskDataLock\",\"taskId\":\" \"}")]
    [InlineData("{\"$type\":\"unknown\"}")]
    [InlineData("{\"$type\":\"executeServiceTask\",\"serviceTaskType\":\"test\"}")]
    public async Task Execute_WithInvalidPayload_ReturnsPermanentInvalidPayloadWithoutSideEffects(
        string? serializedPayload
    )
    {
        var mutatorMock = new Mock<IInstanceDataMutator>(MockBehavior.Strict);
        var appMetadataMock = new Mock<IAppMetadata>(MockBehavior.Strict);
        var command = new UnlockTaskData(appMetadataMock.Object);

        ProcessEngineCommandResult result = await ((IWorkflowEngineCommand)command).Execute(
            CreateContext(mutatorMock.Object, serializedPayload)
        );

        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("UnlockTaskData payload is missing or invalid", failed.ErrorMessage);
        Assert.Equal("InvalidPayloadException", failed.ExceptionType);
        mutatorMock.VerifyNoOtherCalls();
        appMetadataMock.VerifyNoOtherCalls();
    }

    [Fact]
    public async Task Execute_WhenConnectedDataTypesExistAndMutatorIsNotUnitOfWork_ReturnsFailedResult()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        ApplicationMetadata applicationMetadata = CreateApplicationMetadata(instance.AppId);
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock.Setup(x => x.GetApplicationMetadata()).ReturnsAsync(applicationMetadata);
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);
        var command = new UnlockTaskData(appMetadataMock.Object);
        var context = CreateContext(mutatorMock.Object);

        // Act
        var result = await command.Execute(context, new TaskDataLockPayload("Task_1"));

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.True(failed.NonRetryable);
        Assert.Equal("UnreachableException", failed.ExceptionType);
        Assert.Contains("InstanceDataUnitOfWork", failed.ErrorMessage, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Execute_WhenMetadataLookupThrows_ReturnsFailedResult()
    {
        // Arrange
        var instance = CreateInstance("Task_1");
        var appMetadataMock = new Mock<IAppMetadata>();
        appMetadataMock.Setup(x => x.GetApplicationMetadata()).ThrowsAsync(new Exception("Unlock failed"));
        var mutatorMock = new Mock<IInstanceDataMutator>();
        mutatorMock.Setup(x => x.Instance).Returns(instance);
        var command = new UnlockTaskData(appMetadataMock.Object);
        var context = CreateContext(mutatorMock.Object);

        // Act
        var result = await command.Execute(context, new TaskDataLockPayload("Task_1"));

        // Assert
        var failed = Assert.IsType<FailedProcessEngineCommandResult>(result);
        Assert.Equal("Unlock failed", failed.ErrorMessage);
        Assert.Equal("Exception", failed.ExceptionType);
    }

    private static void AssertLockUpdate(StorageInstanceMutationUpdateDataElement update, bool expectedLocked)
    {
        Assert.Equal(expectedLocked, update.Locked);
        Assert.Null(update.ContentPartName);
    }
}
