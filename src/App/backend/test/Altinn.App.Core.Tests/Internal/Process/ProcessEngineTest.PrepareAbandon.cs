using Altinn.App.Core.Features;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Internal.Data;
using Altinn.App.Core.Internal.Instances;
using Altinn.App.Core.Internal.Process.ProcessTasks;
using Altinn.App.Core.Internal.Storage;
using Altinn.App.Core.Internal.WorkflowEngine;
using Altinn.App.Core.Models;
using Altinn.App.Core.Models.Process;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.DependencyInjection;
using Moq;

namespace Altinn.App.Core.Tests.Internal.Process;

public sealed partial class ProcessEngineTest
{
    private static readonly StorageVersionMetadata _preparedVersions = new(InstanceVersion: 7, ProcessStateVersion: 2);

    [Fact]
    public async Task Next_Reject_RefusedByTheTaskBeingAbandoned_ReturnsTheRefusalWithoutTransition()
    {
        var refusal = new ProcessChangeResult
        {
            Success = false,
            ErrorType = ProcessErrorType.Conflict,
            ErrorMessage = "The payment is already completed.",
        };
        var task = new AbandonPreparingTask(_ => refusal);
        var services = new ServiceCollection();
        services.AddSingleton<IProcessTask>(task);
        await using var fixture = Fixture.Create(services);

        ProcessChangeResult result = await fixture.ProcessEngine.Next(CreateRejectRequest(CreatePreparingInstance()));

        Assert.Same(refusal, result);
        Assert.Equal(["Task_2"], task.PreparedTaskIds);
        VerifyNoTransition(fixture);
        fixture
            .Mock<IInstanceClient>()
            .As<IInstanceClientWithStorageMetadata>()
            .Verify(
                c =>
                    c.GetInstanceWithStorageMetadata(
                        It.IsAny<Instance>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
    }

    [Fact]
    public async Task Next_Reject_SavesWhatTheTaskStaged_AndTransitionsFromTheRefetchedInstance()
    {
        DataElement dataElement = CreatePaymentDataElement();
        var task = new AbandonPreparingTask(dataMutator =>
        {
            dataMutator.UpdateBinaryDataElement(
                dataElement,
                "application/json",
                """{"status":"Cancelled"}"""u8.ToArray()
            );
            return null;
        });
        Instance preparedInstance = CreatePreparingInstance(dataElement);
        var (services, mutationClientMock) = CreateDataServices(dataElement, preparedInstance);
        services.AddSingleton<IProcessTask>(task);

        StorageVersionMetadata? enqueuedVersions = null;
        Instance? enqueuedInstance = null;
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
                (instance, versions, _, _, _, _) =>
                {
                    enqueuedInstance = instance;
                    enqueuedVersions = versions;
                }
            )
            .ReturnsAsync(new ProcessNextWorkflowResult(CreateEndedInstance(), _storageVersions, null, true));
        services.AddSingleton(workflowService.Object);

        await using var fixture = Fixture.Create(services);
        SetupPaymentDataType(fixture);

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            CreateRejectRequest(CreatePreparingInstance(dataElement))
        );

        Assert.True(result.Success);
        Assert.Equal(["Task_2"], task.PreparedTaskIds);
        VerifyStagedChangeSaved(mutationClientMock);
        Assert.Same(preparedInstance, enqueuedInstance);
        Assert.Equal(_preparedVersions, enqueuedVersions);
    }

    [Fact]
    public async Task Next_Reject_SavesWhatTheTaskStaged_AlsoWhenItRefusesTheReject()
    {
        DataElement dataElement = CreatePaymentDataElement();
        var refusal = new ProcessChangeResult
        {
            Success = false,
            ErrorType = ProcessErrorType.Conflict,
            ErrorMessage = "The payment is already completed.",
        };
        var task = new AbandonPreparingTask(dataMutator =>
        {
            dataMutator.UpdateBinaryDataElement(dataElement, "application/json", """{"status":"Paid"}"""u8.ToArray());
            return refusal;
        });
        var (services, mutationClientMock) = CreateDataServices(dataElement, CreatePreparingInstance(dataElement));
        services.AddSingleton<IProcessTask>(task);

        await using var fixture = Fixture.Create(services);
        SetupPaymentDataType(fixture);

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            CreateRejectRequest(CreatePreparingInstance(dataElement))
        );

        Assert.Same(refusal, result);
        VerifyStagedChangeSaved(mutationClientMock);
        VerifyNoTransition(fixture);
        fixture
            .Mock<IInstanceClientWithStorageMetadata>()
            .Verify(
                c =>
                    c.GetInstanceWithStorageMetadata(
                        It.IsAny<Instance>(),
                        It.IsAny<StorageAuthenticationMethod?>(),
                        It.IsAny<CancellationToken>()
                    ),
                Times.Never
            );
    }

    [Fact]
    public async Task Next_Reject_WhenTheProcessMovedOnWhileSaving_ReportsThatTheInstanceChanged()
    {
        DataElement dataElement = CreatePaymentDataElement();
        var task = new AbandonPreparingTask(dataMutator =>
        {
            dataMutator.UpdateBinaryDataElement(
                dataElement,
                "application/json",
                """{"status":"Cancelled"}"""u8.ToArray()
            );
            return null;
        });
        Instance movedOnInstance = CreatePreparingInstance(dataElement);
        movedOnInstance.Process.CurrentTask.Flow = 4;
        var (services, _) = CreateDataServices(dataElement, movedOnInstance);
        services.AddSingleton<IProcessTask>(task);

        await using var fixture = Fixture.Create(services);
        SetupPaymentDataType(fixture);

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            CreateRejectRequest(CreatePreparingInstance(dataElement))
        );

        Assert.False(result.Success);
        Assert.Equal(ProcessNextState.InstanceChanged, result.ProcessNextState);
        VerifyNoTransition(fixture);
    }

    [Fact]
    public async Task Next_WithoutReject_DoesNotPrepareTheTaskForBeingAbandoned()
    {
        var task = new AbandonPreparingTask(_ => throw new InvalidOperationException("Must not be called."));
        var services = new ServiceCollection();
        services.AddSingleton<IProcessTask>(task);
        await using var fixture = Fixture.Create(services);
        SetupWorkflowResult(fixture, CreateEndedInstance());

        ProcessChangeResult result = await fixture.ProcessEngine.Next(
            new ProcessNextRequest
            {
                Instance = CreatePreparingInstance(),
                InstanceVersions = _storageVersions,
                User = CreateUserClaimsPrincipal(),
                Action = null,
                Language = null,
            }
        );

        Assert.True(result.Success);
        Assert.Empty(task.PreparedTaskIds);
    }

    private static ProcessNextRequest CreateRejectRequest(Instance instance) =>
        new()
        {
            Instance = instance,
            InstanceVersions = _storageVersions,
            User = CreateUserClaimsPrincipal(),
            Action = "reject",
            Language = null,
        };

    private static Instance CreatePreparingInstance(params DataElement[] dataElements)
    {
        Instance instance = CreateTask2Instance();
        instance.Process.CurrentTask.AltinnTaskType = AbandonPreparingTask.TaskType;
        instance.Data = [.. dataElements];
        return instance;
    }

    private static DataElement CreatePaymentDataElement() =>
        new()
        {
            Id = Guid.NewGuid().ToString(),
            InstanceGuid = _instanceGuid.ToString(),
            DataType = "payment",
            ContentType = "application/json",
            Filename = "payment.json",
        };

    private static void SetupPaymentDataType(Fixture fixture) =>
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

    private static (ServiceCollection Services, Mock<IInstanceMutationClient> MutationClient) CreateDataServices(
        DataElement dataElement,
        Instance preparedInstance
    )
    {
        Mock<IDataClient> dataClientMock = new(MockBehavior.Strict);
        Mock<IDataClientWithStorageMetadata> dataClientWithStorageMetadataMock =
            dataClientMock.As<IDataClientWithStorageMetadata>();
        Mock<IInstanceMutationClient> mutationClientMock = dataClientMock.As<IInstanceMutationClient>();
        dataClientWithStorageMetadataMock
            .Setup(c =>
                c.GetDataBytesWithExpectedBlobVersionId(
                    _instanceOwnerPartyId,
                    _instanceGuid,
                    Guid.Parse(dataElement.Id),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<string?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync("""{"status":"Created"}"""u8.ToArray());
        mutationClientMock
            .Setup(c =>
                c.CommitInstanceMutationWithStorageMetadata(
                    _instanceOwnerPartyId,
                    _instanceGuid,
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new InstanceMutationWithStorageMetadata(
                    preparedInstance,
                    new StorageVersionMetadata(InstanceVersion: 6, ProcessStateVersion: 1)
                )
            );

        var instanceClientMock = new Mock<IInstanceClientWithStorageMetadata>(MockBehavior.Strict);
        instanceClientMock
            .Setup(c =>
                c.GetInstanceWithStorageMetadata(
                    It.IsAny<Instance>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new InstanceWithStorageMetadata(preparedInstance, _preparedVersions));

        var services = new ServiceCollection();
        services.AddSingleton<IDataClient>(dataClientMock.Object);
        services.AddSingleton<IDataClientWithStorageMetadata>(dataClientWithStorageMetadataMock.Object);
        services.AddSingleton<IInstanceMutationClient>(mutationClientMock.Object);
        services.AddSingleton(instanceClientMock.Object);
        return (services, mutationClientMock);
    }

    private static void VerifyStagedChangeSaved(Mock<IInstanceMutationClient> mutationClientMock) =>
        mutationClientMock.Verify(
            c =>
                c.CommitInstanceMutationWithStorageMetadata(
                    _instanceOwnerPartyId,
                    _instanceGuid,
                    It.IsAny<StorageInstanceMutationRequest>(),
                    It.IsAny<IReadOnlyDictionary<string, StorageInstanceMutationContent>>(),
                    It.IsAny<StorageAuthenticationMethod?>(),
                    It.IsAny<StorageWritePreconditions?>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Once
        );

    private static void VerifyNoTransition(Fixture fixture) =>
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

    private sealed class AbandonPreparingTask(Func<IInstanceDataMutator, ProcessChangeResult?> prepare)
        : IProcessTask,
            IProcessTaskAbandonPreparer
    {
        public const string TaskType = "abandonPreparing";

        public List<string> PreparedTaskIds { get; } = [];

        public string Type => TaskType;

        public Task<ProcessChangeResult?> PrepareAbandon(
            IInstanceDataMutator dataMutator,
            string taskId,
            CancellationToken cancellationToken
        )
        {
            PreparedTaskIds.Add(taskId);
            return Task.FromResult(prepare(dataMutator));
        }
    }
}
