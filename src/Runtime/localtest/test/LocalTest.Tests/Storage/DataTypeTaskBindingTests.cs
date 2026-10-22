using System.Security.Claims;
using System.Text;
using Altinn.Platform.Storage.Authorization;
using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Controllers;
using Altinn.Platform.Storage.Extensions;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Enums;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Altinn.Platform.Storage.Services;
using AltinnCore.Authentication.Constants;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Moq;
using Newtonsoft.Json;
using Xunit;

namespace LocalTest.Tests.Storage;

public sealed class DataTypeTaskBindingTests
{
    private const string DataTypeId = "attachment";
    private const string UnboundDataTypeId = "notes";
    private const string AppOwner = "ttd";
    private const string WriteAction = "write";

    public static TheoryData<string[]?, string?, bool, bool> WriteCases =>
        new()
        {
            { null, "Task_2", false, true },
            { [], "Task_2", false, true },
            { ["Task_1"], "Task_1", false, true },
            { ["Task_1", "Task_2"], "Task_2", false, true },
            { ["Task_1"], "Task_2", false, false },
            { ["Task_1"], null, false, false },
            { ["Task_1"], "Task_2", true, true },
            { ["Task_1"], null, true, true },
        };

    [Theory]
    [MemberData(nameof(WriteCases))]
    public void GetTaskBindingConflict_AllowsWritesOnlyInTheBoundTasksOrInAProcessTransition(
        string[]? taskIds,
        string? currentTask,
        bool isPartOfProcessTransition,
        bool writable
    )
    {
        var dataType = new DataType { Id = DataTypeId, TaskIds = taskIds?.ToList() };
        var instance = new Instance { Process = Process(currentTask) };

        Assert.Equal(writable, dataType.GetTaskBindingConflict(instance, isPartOfProcessTransition) is null);
    }

    [Theory]
    [InlineData("Task_3", "(current task Task_3)")]
    [InlineData(null, "(no current task)")]
    public void GetTaskBindingConflict_NamesTheDataTypeAndItsTasks(string? currentTask, string ending)
    {
        var dataType = new DataType { Id = DataTypeId, TaskIds = ["Task_1", "Task_2"] };
        var instance = new Instance { Process = Process(currentTask) };

        Assert.Equal(
            $"Data element of type {DataTypeId} can only be modified in Task_1, Task_2 {ending}",
            dataType.GetTaskBindingConflict(instance, isPartOfProcessTransition: false)
        );
    }

    [Theory]
    // These endpoints are never part of a process transition, whoever calls them and whatever the process status.
    [InlineData(null, null)]
    [InlineData(AppOwner, null)]
    [InlineData(AppOwner, ProcessStatus.Processing)]
    public async Task DataEndpoints_RefuseAWriteOutsideTheBoundTasksWithConflict(string? org, ProcessStatus? status)
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_2", status);
        DataController controller = CreateDataController(storage, ["Task_1"], org);
        int partyId = int.Parse(instance.InstanceOwner.PartyId);
        Guid instanceGuid = InstanceGuid(instance);
        Guid dataGuid = Guid.Parse(dataElement.Id);

        ActionResult<DataElement>[] results =
        [
            await controller.CreateAndUploadData(partyId, instanceGuid, DataTypeId, CancellationToken.None),
            await controller.OverwriteData(partyId, instanceGuid, dataGuid, CancellationToken.None),
            await controller.Delete(partyId, instanceGuid, dataGuid, delay: false, CancellationToken.None),
            await controller.Update(partyId, instanceGuid, dataGuid, LockedCopy(dataElement), CancellationToken.None),
        ];

        Assert.All(
            results,
            result =>
                Assert.Equal(
                    $"Data element of type {DataTypeId} can only be modified in Task_1 (current task Task_2)",
                    Assert.IsType<ConflictObjectResult>(result.Result).Value
                )
        );
        Assert.False(Assert.Single(await storage.DataRepository.ReadAll(instanceGuid)).Locked);
    }

    [Fact]
    public async Task DataEndpoints_AuthorizeBeforeCheckingTheTaskBinding()
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_2");
        DataController controller = CreateDataController(storage, ["Task_1"], org: null, deniedDataTypeId: DataTypeId);
        int partyId = int.Parse(instance.InstanceOwner.PartyId);
        Guid instanceGuid = InstanceGuid(instance);
        Guid dataGuid = Guid.Parse(dataElement.Id);

        ActionResult<DataElement>[] results =
        [
            await controller.CreateAndUploadData(partyId, instanceGuid, DataTypeId, CancellationToken.None),
            await controller.OverwriteData(partyId, instanceGuid, dataGuid, CancellationToken.None),
            await controller.Delete(partyId, instanceGuid, dataGuid, delay: false, CancellationToken.None),
            await controller.Update(partyId, instanceGuid, dataGuid, LockedCopy(dataElement), CancellationToken.None),
        ];

        Assert.All(results, result => Assert.IsType<ForbidResult>(result.Result));
        Assert.False(Assert.Single(await storage.DataRepository.ReadAll(instanceGuid)).Locked);
    }

    [Theory]
    [InlineData(null)]
    [InlineData(AppOwner)]
    public async Task Update_AllowsAMetadataWriteInABoundTask(string? org)
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_1");
        DataController controller = CreateDataController(storage, ["Task_1"], org);

        ActionResult<DataElement> result = await controller.Update(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            Guid.Parse(dataElement.Id),
            LockedCopy(dataElement),
            CancellationToken.None
        );

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.True(Assert.Single(await storage.DataRepository.ReadAll(InstanceGuid(instance))).Locked);
    }

    [Fact]
    public async Task Update_RefusesABodyWhoseDataTypeDiffersFromTheStoredOne()
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_2");
        DataController controller = CreateDataController(storage, ["Task_1"], org: null);
        DataElement body = LockedCopy(dataElement);
        body.DataType = UnboundDataTypeId;

        ActionResult<DataElement> result = await controller.Update(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            Guid.Parse(dataElement.Id),
            body,
            CancellationToken.None
        );

        Assert.Equal(
            "Mismatch between stored data type and dataElement content",
            Assert.IsType<BadRequestObjectResult>(result.Result).Value
        );
        Assert.False(Assert.Single(await storage.DataRepository.ReadAll(InstanceGuid(instance))).Locked);
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("Task_2", null)]
    [InlineData(null, AppOwner)]
    [InlineData("Task_2", AppOwner)]
    public async Task CommitMutation_RefusesAWriteOutsideTheBoundTasksWithConflict(string? currentTask, string? org)
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, currentTask);
        Guid dataGuid = Guid.Parse(dataElement.Id);
        InstanceMutationRequest[] requests =
        [
            // The allowed create stages its content before the refused one is reached.
            new()
            {
                CreateDataElements =
                [
                    new InstanceMutationCreateDataElement
                    {
                        DataType = UnboundDataTypeId,
                        ContentPartName = "allowed",
                        ContentType = "text/plain",
                    },
                    new InstanceMutationCreateDataElement
                    {
                        DataType = DataTypeId,
                        ContentPartName = "refused",
                        ContentType = "text/plain",
                    },
                ],
            },
            new()
            {
                UpdateDataElements =
                [
                    new InstanceMutationUpdateDataElement { DataElementId = dataGuid, Locked = true },
                ],
            },
            new() { DeleteDataElements = [new InstanceMutationDeleteDataElement { DataElementId = dataGuid }] },
        ];

        foreach (InstanceMutationRequest request in requests)
        {
            InstanceMutationsController controller = CreateMutationsController(storage, ["Task_1"], request, org);

            ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
                int.Parse(instance.InstanceOwner.PartyId),
                InstanceGuid(instance),
                CancellationToken.None
            );

            Assert.StartsWith(
                $"Data element of type {DataTypeId} can only be modified in Task_1 (",
                Assert.IsType<string>(Assert.IsType<ConflictObjectResult>(result.Result).Value)
            );
        }

        Assert.Single(await storage.DataRepository.ReadAll(InstanceGuid(instance)));
        Assert.False(HasBlobs(storage, instance));
    }

    [Theory]
    [InlineData(null)]
    [InlineData(ProcessStatus.Processing)]
    public async Task CommitMutation_AuthorizesBeforeCheckingTheProcessStatusOrTheTaskBinding(ProcessStatus? status)
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_2", status);

        foreach (InstanceMutationRequest request in SingleWrites(Guid.Parse(dataElement.Id)))
        {
            InstanceMutationsController controller = CreateMutationsController(
                storage,
                ["Task_1"],
                request,
                org: null,
                deniedDataTypeId: DataTypeId
            );

            ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
                int.Parse(instance.InstanceOwner.PartyId),
                InstanceGuid(instance),
                CancellationToken.None
            );

            Assert.IsType<ForbidResult>(result.Result);
        }

        Assert.False(Assert.Single(await storage.DataRepository.ReadAll(InstanceGuid(instance))).Locked);
        Assert.False(HasBlobs(storage, instance));
    }

    [Fact]
    public async Task CommitMutation_AuthorizesEveryDataTypeBeforeCheckingAnyTaskBinding()
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, _) = await SeedInTask(storage, "Task_2");
        InstanceMutationsController controller = CreateMutationsController(
            storage,
            ["Task_1"],
            new InstanceMutationRequest
            {
                CreateDataElements =
                [
                    new InstanceMutationCreateDataElement
                    {
                        DataType = DataTypeId,
                        ContentPartName = "outside",
                        ContentType = "text/plain",
                    },
                    new InstanceMutationCreateDataElement
                    {
                        DataType = UnboundDataTypeId,
                        ContentPartName = "denied",
                        ContentType = "text/plain",
                    },
                ],
            },
            org: null,
            deniedDataTypeId: UnboundDataTypeId
        );

        ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            CancellationToken.None
        );

        Assert.IsType<ForbidResult>(result.Result);
        Assert.Single(await storage.DataRepository.ReadAll(InstanceGuid(instance)));
        Assert.False(HasBlobs(storage, instance));
    }

    [Fact]
    public async Task CommitMutation_ChecksTheProcessStatusBeforeTheTaskBinding()
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_2", ProcessStatus.Processing);

        foreach (InstanceMutationRequest request in SingleWrites(Guid.Parse(dataElement.Id)))
        {
            InstanceMutationsController controller = CreateMutationsController(storage, ["Task_1"], request, org: null);

            ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
                int.Parse(instance.InstanceOwner.PartyId),
                InstanceGuid(instance),
                CancellationToken.None
            );

            JsonResult conflict = Assert.IsType<JsonResult>(result.Result);
            Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
            Assert.Equal("process_status_conflict", Assert.IsType<ProblemDetails>(conflict.Value).Type);
        }

        Assert.False(Assert.Single(await storage.DataRepository.ReadAll(InstanceGuid(instance))).Locked);
        Assert.False(HasBlobs(storage, instance));
    }

    [Theory]
    [InlineData(new[] { "Task_1" }, "Task_1", null)]
    [InlineData(new[] { "Task_1" }, "Task_1", AppOwner)]
    [InlineData(new string[0], "Task_2", null)]
    [InlineData(null, "Task_2", null)]
    public async Task CommitMutation_AllowsAWriteInABoundTaskOrOfAnUnboundDataType(
        string[]? taskIds,
        string currentTask,
        string? org
    )
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, currentTask);
        InstanceMutationsController controller = CreateMutationsController(
            storage,
            taskIds,
            new InstanceMutationRequest
            {
                DeleteDataElements =
                [
                    new InstanceMutationDeleteDataElement { DataElementId = Guid.Parse(dataElement.Id) },
                ],
            },
            org
        );

        ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            CancellationToken.None
        );

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.Empty(await storage.DataRepository.ReadAll(InstanceGuid(instance)));
    }

    [Theory]
    // At a task start or end, and at process end, where there is no current task.
    [InlineData(null)]
    [InlineData("Task_2")]
    public async Task CommitMutation_AllowsAProcessTransitionToWriteOutsideTheBoundTasks(string? currentTask)
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        DataElement updated = await AddDataElement(storage, instance);
        DataElement deleted = await AddDataElement(storage, instance);
        instance = await SetProcess(storage, instance, currentTask, ProcessStatus.Processing);
        InstanceMutationsController controller = CreateMutationsController(
            storage,
            ["Task_1"],
            WritesAssertingProcessing(Guid.Parse(updated.Id), Guid.Parse(deleted.Id)),
            AppOwner
        );

        ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            CancellationToken.None
        );

        Assert.IsType<OkObjectResult>(result.Result);
        List<DataElement> dataElements = await storage.DataRepository.ReadAll(InstanceGuid(instance));
        Assert.Equal(2, dataElements.Count);
        Assert.True(Assert.Single(dataElements, dataElement => dataElement.Id == updated.Id).Locked);
        Assert.DoesNotContain(dataElements, dataElement => dataElement.Id == deleted.Id);
    }

    [Fact]
    public async Task CommitMutation_RefusesWritesAssertingProcessingOnAnIdleInstance()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        DataElement updated = await AddDataElement(storage, instance);
        DataElement deleted = await AddDataElement(storage, instance);
        instance = await SetProcess(storage, instance, "Task_2");
        InstanceMutationsController controller = CreateMutationsController(
            storage,
            ["Task_1"],
            WritesAssertingProcessing(Guid.Parse(updated.Id), Guid.Parse(deleted.Id)),
            AppOwner
        );

        ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            CancellationToken.None
        );

        JsonResult conflict = Assert.IsType<JsonResult>(result.Result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
        Assert.Equal("process_status_conflict", Assert.IsType<ProblemDetails>(conflict.Value).Type);
        Assert.Equal(2, (await storage.DataRepository.ReadAll(InstanceGuid(instance))).Count);
    }

    // One request per write; each asserts, by leaving ExpectedProcessStatus unset, that the instance is idle.
    private static InstanceMutationRequest[] SingleWrites(Guid dataElementId) =>
        [
            new()
            {
                CreateDataElements =
                [
                    new InstanceMutationCreateDataElement
                    {
                        DataType = DataTypeId,
                        ContentPartName = "created",
                        ContentType = "text/plain",
                    },
                ],
            },
            new()
            {
                UpdateDataElements =
                [
                    new InstanceMutationUpdateDataElement { DataElementId = dataElementId, Locked = true },
                ],
            },
            new() { DeleteDataElements = [new InstanceMutationDeleteDataElement { DataElementId = dataElementId }] },
        ];

    private static InstanceMutationRequest WritesAssertingProcessing(Guid updatedId, Guid deletedId) =>
        new()
        {
            ExpectedProcessStatus = ProcessStatus.Processing,
            CreateDataElements =
            [
                new InstanceMutationCreateDataElement
                {
                    DataType = DataTypeId,
                    ContentPartName = "created",
                    ContentType = "text/plain",
                },
            ],
            UpdateDataElements = [new InstanceMutationUpdateDataElement { DataElementId = updatedId, Locked = true }],
            DeleteDataElements = [new InstanceMutationDeleteDataElement { DataElementId = deletedId }],
        };

    private static ProcessState Process(string? currentTask, ProcessStatus? status = null) =>
        new()
        {
            Started = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            Status = status,
            CurrentTask = currentTask is null
                ? null
                : new ProcessElementInfo
                {
                    ElementId = currentTask,
                    AltinnTaskType = "data",
                    Flow = 2,
                },
        };

    private static ClaimsPrincipal User(string? org) =>
        new(
            new ClaimsIdentity(
                org is null
                    ? [new Claim(AltinnCoreClaimTypes.UserId, "1337")]
                    : [new Claim(AltinnCoreClaimTypes.Org, org), new Claim(AltinnCoreClaimTypes.OrgNumber, "991825827")],
                "test"
            )
        );

    private static Guid InstanceGuid(Instance instance) => Guid.Parse(instance.Id.Split('/')[1]);

    private static bool HasBlobs(LocalStorageFixture storage, Instance instance)
    {
        string blobFolder = Path.Combine(
            storage.Root,
            storage.Settings.BlobStorageFolder,
            instance.AppId,
            InstanceGuid(instance).ToString()
        );
        return Directory.Exists(blobFolder)
            && Directory.EnumerateFiles(blobFolder, "*", SearchOption.AllDirectories).Any();
    }

    private static DataElement LockedCopy(DataElement dataElement) =>
        new()
        {
            Id = dataElement.Id,
            InstanceGuid = dataElement.InstanceGuid,
            DataType = dataElement.DataType,
            LastChanged = dataElement.LastChanged,
            Locked = true,
        };

    private static async Task<(Instance Instance, DataElement DataElement)> SeedInTask(
        LocalStorageFixture storage,
        string? currentTask,
        ProcessStatus? status = null
    )
    {
        Instance instance = await storage.CreateInstance();
        DataElement dataElement = await AddDataElement(storage, instance);
        return (await SetProcess(storage, instance, currentTask, status), dataElement);
    }

    private static Task<Instance> SetProcess(
        LocalStorageFixture storage,
        Instance instance,
        string? currentTask,
        ProcessStatus? status = null
    )
    {
        instance.Process = Process(currentTask, status);
        return storage.InstanceRepository.Update(instance, [nameof(Instance.Process)], CancellationToken.None);
    }

    private static async Task<DataElement> AddDataElement(LocalStorageFixture storage, Instance instance)
    {
        Guid instanceGuid = InstanceGuid(instance);
        Guid dataElementId = Guid.NewGuid();
        return (
            await storage.DataRepository.Create(
                new DataElement
                {
                    Id = dataElementId.ToString(),
                    InstanceGuid = instanceGuid.ToString(),
                    DataType = DataTypeId,
                    ContentType = "text/plain",
                    BlobStoragePath = DataElementHelper.DataFileName(
                        instance.AppId,
                        instanceGuid.ToString(),
                        dataElementId.ToString()
                    ),
                    Created = new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc),
                    LastChanged = new DateTime(2026, 1, 2, 3, 4, 5, DateTimeKind.Utc),
                }
            )
        ).DataElement;
    }

    // deniedDataTypeId names a data type that requires an action the caller is denied, see Authorization.
    private static IApplicationRepository ApplicationRepository(string[]? taskIds, string? deniedDataTypeId)
    {
        var applicationRepository = new Mock<IApplicationRepository>();
        applicationRepository
            .Setup(repository =>
                repository.FindOne(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(
                new Application
                {
                    Id = "ttd/localtest-content-etag-tests",
                    Org = AppOwner,
                    DataTypes =
                    [
                        new DataType
                        {
                            Id = DataTypeId,
                            TaskIds = taskIds?.ToList(),
                            ActionRequiredToWrite = deniedDataTypeId == DataTypeId ? WriteAction : null,
                        },
                        new DataType
                        {
                            Id = UnboundDataTypeId,
                            ActionRequiredToWrite = deniedDataTypeId == UnboundDataTypeId ? WriteAction : null,
                        },
                    ],
                }
            );
        return applicationRepository.Object;
    }

    // Denies the write action and fails on any other authorization call.
    private static IAuthorization Authorization()
    {
        var authorization = new Mock<IAuthorization>(MockBehavior.Strict);
        authorization
            .Setup(service =>
                service.AuthorizeInstanceAction(
                    It.IsAny<Instance>(),
                    WriteAction,
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(false);
        return authorization.Object;
    }

    private static DataController CreateDataController(
        LocalStorageFixture storage,
        string[]? taskIds,
        string? org,
        string? deniedDataTypeId = null
    ) =>
        new(
            storage.DataRepository,
            Mock.Of<IBlobRepository>(),
            storage.InstanceRepository,
            ApplicationRepository(taskIds, deniedDataTypeId),
            Mock.Of<IDataService>(),
            Mock.Of<IInstanceEventService>(),
            Options.Create(new GeneralSettings { Hostname = "localhost" }),
            Mock.Of<IOnDemandClient>(),
            Authorization()
        )
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext { User = User(org) },
            },
        };

    private static InstanceMutationsController CreateMutationsController(
        LocalStorageFixture storage,
        string[]? taskIds,
        InstanceMutationRequest request,
        string? org,
        string? deniedDataTypeId = null
    )
    {
        IOptions<GeneralSettings> settings = Options.Create(new GeneralSettings { Hostname = "localhost" });
        var httpContext = new DefaultHttpContext { User = User(org) };
        string mutationJson = JsonConvert.SerializeObject(request);
        if (request.CreateDataElements is not { Count: > 0 } creates)
        {
            httpContext.Request.ContentType = "application/json";
            httpContext.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(mutationJson));
        }
        else
        {
            using var content = new MultipartFormDataContent();
            content.Add(new StringContent(mutationJson, Encoding.UTF8, "application/json"), "mutation");
            foreach (InstanceMutationCreateDataElement create in creates)
            {
                content.Add(new StringContent("content", Encoding.UTF8, create.ContentType), create.ContentPartName, "file.txt");
            }

            var body = new MemoryStream();
            content.CopyTo(body, null, CancellationToken.None);
            body.Position = 0;
            httpContext.Request.ContentType = content.Headers.ContentType?.ToString();
            httpContext.Request.Body = body;
        }

        IAuthorization authorization = Authorization();

        return new InstanceMutationsController(
            storage.DataRepository,
            new BlobRepository(Options.Create(storage.Settings)),
            storage.InstanceRepository,
            storage.MutationRepository,
            ApplicationRepository(taskIds, deniedDataTypeId),
            Mock.Of<IDataService>(),
            Mock.Of<IInstanceEventService>(service =>
                service.BuildInstanceEvent(
                    It.IsAny<InstanceEventType>(),
                    It.IsAny<Instance>(),
                    It.IsAny<DataElement>()
                ) == new InstanceEvent()
            ),
            settings,
            authorization,
            Mock.Of<IAuthorizationService>(),
            new ProcessAuthorizer(
                authorization,
                Mock.Of<IClaimsPrincipalProvider>(provider => provider.GetUser() == httpContext.User),
                settings
            )
        )
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext },
        };
    }
}
