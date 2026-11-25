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
using Microsoft.AspNetCore.Mvc.Infrastructure;
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
            { ["Task_1"], "Task_2", true, false },
            { ["Task_1"], null, true, false },
        };

    public static TheoryData<string[]?> UnboundTaskIds => new() { null, Array.Empty<string>() };

    public static TheoryData<string[]?> BoundAndUnboundTaskIds => new() { null, new[] { "Task_1" } };

    [Theory]
    [MemberData(nameof(WriteCases))]
    public void GetTaskBindingConflict_AllowsWritesOnlyInTheBoundTasks(
        string[]? taskIds,
        string? currentTask,
        bool isDelete,
        bool writable
    )
    {
        var dataType = new DataType { Id = DataTypeId, TaskIds = taskIds?.ToList() };
        var instance = new Instance { Process = Process(currentTask) };

        Assert.Equal(writable, dataType.GetTaskBindingConflict(instance, isDelete) is null);
    }

    [Theory]
    [InlineData(true, true, true, true)]
    [InlineData(false, true, true, false)]
    [InlineData(true, false, true, false)]
    [InlineData(true, true, false, false)]
    public void GetTaskBindingConflict_AllowsOnlyTheDeletionAutoDeleteOnProcessEndAsksForAfterTheProcessEnded(
        bool isDelete,
        bool autoDeleteOnProcessEnd,
        bool ended,
        bool writable
    )
    {
        var dataType = new DataType
        {
            Id = DataTypeId,
            TaskIds = ["Task_1"],
            AppLogic = new ApplicationLogic { AutoDeleteOnProcessEnd = autoDeleteOnProcessEnd },
        };
        var instance = new Instance { Process = Process(currentTask: null, ended: ended) };

        Assert.Equal(writable, dataType.GetTaskBindingConflict(instance, isDelete) is null);
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
            TaskBindingConflict(dataType.GetTaskBindingConflict(instance, isDelete: false)).Detail
        );
    }

    [Theory]
    // Whoever calls them and whatever the process status.
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
                    TaskBindingConflict(result.Result).Detail
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

    [Fact]
    public async Task Update_AllowsAMetadataWriteInABoundTask()
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_1");
        DataController controller = CreateDataController(storage, ["Task_1"], org: null);

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

        ObjectResult badRequest = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
        Assert.Equal(
            "You can't change dataElement.DataType in an update request",
            Assert.IsType<ProblemDetails>(badRequest.Value).Detail
        );
        Assert.False(Assert.Single(await storage.DataRepository.ReadAll(InstanceGuid(instance))).Locked);
    }

    [Theory]
    [InlineData(null, null, null)]
    [InlineData("Task_2", null, null)]
    [InlineData(null, AppOwner, null)]
    [InlineData("Task_2", AppOwner, null)]
    // A process transition: a task start or end in another task, or process end, with no current task.
    [InlineData(null, AppOwner, ProcessStatus.Processing)]
    [InlineData("Task_2", AppOwner, ProcessStatus.Processing)]
    public async Task CommitMutation_RefusesAWriteOutsideTheBoundTasksWithConflict(
        string? currentTask,
        string? org,
        ProcessStatus? status
    )
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, currentTask, status);
        Guid dataGuid = Guid.Parse(dataElement.Id);
        InstanceMutationRequest[] requests =
        [
            // The refused create also refuses the allowed one before it.
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
            request.ExpectedProcessStatus = status;
            InstanceMutationsController controller = CreateMutationsController(storage, ["Task_1"], request, org);

            ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
                int.Parse(instance.InstanceOwner.PartyId),
                InstanceGuid(instance),
                CancellationToken.None
            );

            Assert.StartsWith(
                $"Data element of type {DataTypeId} can only be modified in Task_1 (",
                TaskBindingConflict(result.Result).Detail
            );
        }

        Assert.False(Assert.Single(await storage.DataRepository.ReadAll(InstanceGuid(instance))).Locked);
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
    // With a matching header the write gets 409 for the task binding, 403 for the data type or 409 for the
    // process status.
    [InlineData(null, null)]
    [InlineData(DataTypeId, null)]
    [InlineData(null, ProcessStatus.Processing)]
    public async Task CommitMutation_ChecksAProcessStateVersionHeaderBeforeAuthorizationProcessStatusAndTaskBinding(
        string? deniedDataTypeId,
        ProcessStatus? status
    )
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_1");
        InstanceVersionResult versionsInTask1 = await storage.InstanceRepository.ReadVersions(
            InstanceGuid(instance),
            CancellationToken.None
        );
        await SetProcess(storage, instance, "Task_2", status);

        foreach (InstanceMutationRequest request in SingleWrites(Guid.Parse(dataElement.Id)))
        {
            InstanceMutationsController controller = CreateMutationsController(
                storage,
                ["Task_1"],
                request,
                org: null,
                deniedDataTypeId: deniedDataTypeId
            );
            controller.Request.Headers[StorageHeaders.IfProcessStateVersionMatch] =
                versionsInTask1.ProcessStateVersion.ToString();

            ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
                int.Parse(instance.InstanceOwner.PartyId),
                InstanceGuid(instance),
                CancellationToken.None
            );

            ObjectResult mismatch = Assert.IsType<ObjectResult>(result.Result);
            Assert.Equal(StatusCodes.Status412PreconditionFailed, mismatch.StatusCode);
            Assert.Equal("process_state_version_mismatch", Assert.IsType<ProblemDetails>(mismatch.Value).Type);
        }

        Assert.False(Assert.Single(await storage.DataRepository.ReadAll(InstanceGuid(instance))).Locked);
        Assert.False(HasBlobs(storage, instance));
    }

    [Fact]
    public async Task CommitMutation_RefusesADifferingInstanceVersionHeaderBeforeStagingTheContent()
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, _) = await SeedInTask(storage, "Task_1");
        InstanceVersionResult versions = await storage.InstanceRepository.ReadVersions(
            InstanceGuid(instance),
            CancellationToken.None
        );
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
                        ContentPartName = "created",
                        ContentType = "text/plain",
                    },
                ],
            },
            org: null,
            blobRepository: new Mock<IBlobRepository>(MockBehavior.Strict).Object
        );
        controller.Request.Headers[StorageHeaders.IfInstanceVersionMatch] = (versions.InstanceVersion + 1).ToString();

        ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            CancellationToken.None
        );

        ObjectResult mismatch = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status412PreconditionFailed, mismatch.StatusCode);
        Assert.Equal("instance_version_mismatch", Assert.IsType<ProblemDetails>(mismatch.Value).Type);
    }

    [Theory]
    [InlineData(new[] { "Task_1" }, "Task_1")]
    [InlineData(new string[0], "Task_2")]
    [InlineData(null, "Task_2")]
    public async Task CommitMutation_AllowsAWriteInABoundTaskOrOfAnUnboundDataType(string[]? taskIds, string currentTask)
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
            org: null
        );

        ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            CancellationToken.None
        );

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.Empty(await storage.DataRepository.ReadAll(InstanceGuid(instance)));
    }

    [Fact]
    public async Task CommitMutation_RefusesAWriteInARequestThatSetsTheProcessState()
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_1");

        foreach (InstanceMutationRequest request in SingleWrites(Guid.Parse(dataElement.Id)))
        {
            request.ProcessState = new ProcessStateUpdate { State = Process("Task_2") };
            InstanceMutationsController controller = CreateMutationsController(storage, ["Task_1"], request, AppOwner);

            ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
                int.Parse(instance.InstanceOwner.PartyId),
                InstanceGuid(instance),
                CancellationToken.None
            );

            ObjectResult badRequest = Assert.IsType<ObjectResult>(result.Result);
            Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
            Assert.Equal(
                "processState.state cannot be combined with data element creates, updates or deletes.",
                Assert.IsType<ProblemDetails>(badRequest.Value).Detail
            );
        }

        Assert.False(Assert.Single(await storage.DataRepository.ReadAll(InstanceGuid(instance))).Locked);
        Assert.False(HasBlobs(storage, instance));
    }

    [Fact]
    public async Task CommitMutation_AllowsAWriteInARequestThatOnlyAddsProcessEvents()
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_1");
        InstanceMutationsController controller = CreateMutationsController(
            storage,
            ["Task_1"],
            new InstanceMutationRequest
            {
                UpdateDataElements =
                [
                    new InstanceMutationUpdateDataElement { DataElementId = Guid.Parse(dataElement.Id), Locked = true },
                ],
                ProcessState = new ProcessStateUpdate
                {
                    Events = [new InstanceEvent { EventType = "process_StartTask" }],
                },
            },
            AppOwner
        );

        ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            CancellationToken.None
        );

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.True(Assert.Single(await storage.DataRepository.ReadAll(InstanceGuid(instance))).Locked);
    }

    [Fact]
    public async Task CommitMutation_AllowsTheDeletionAutoDeleteOnProcessEndAsksForAfterTheProcessEnded()
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(
            storage,
            currentTask: null,
            ProcessStatus.Processing,
            ended: true
        );
        InstanceMutationsController controller = CreateMutationsController(
            storage,
            ["Task_1"],
            new InstanceMutationRequest
            {
                ExpectedProcessStatus = ProcessStatus.Processing,
                DeleteDataElements =
                [
                    new InstanceMutationDeleteDataElement { DataElementId = Guid.Parse(dataElement.Id) },
                ],
            },
            AppOwner,
            autoDeleteOnProcessEnd: true
        );

        ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            CancellationToken.None
        );

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.Empty(await storage.DataRepository.ReadAll(InstanceGuid(instance)));
    }

    [Fact]
    public async Task Delete_AllowsTheDeletionAutoDeleteOnProcessEndAsksForAfterTheProcessEnded()
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, currentTask: null, ended: true);
        var dataService = new DataService(
            storage.DataRepository,
            new BlobRepository(Options.Create(storage.Settings)),
            Mock.Of<IInstanceEventService>(service =>
                service.BuildInstanceEvent(
                    It.IsAny<InstanceEventType>(),
                    It.IsAny<Instance>(),
                    It.IsAny<DataElement>()
                ) == new InstanceEvent()
            ),
            storage.MutationRepository,
            storage.InstanceRepository
        );
        DataController controller = CreateDataController(
            storage,
            ["Task_1"],
            AppOwner,
            autoDeleteOnProcessEnd: true,
            dataService: dataService
        );

        ActionResult<DataElement> result = await controller.Delete(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            Guid.Parse(dataElement.Id),
            delay: false,
            CancellationToken.None
        );

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.Empty(await storage.DataRepository.ReadAll(InstanceGuid(instance)));
    }

    [Fact]
    public async Task CommitMutation_ChecksEveryTaskBindingBeforeValidatingTheWrites()
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_2");
        InstanceMutationsController controller = CreateMutationsController(
            storage,
            ["Task_1"],
            // Validated on their own, the update of a missing element gets 404 and the repeated delete 400.
            new InstanceMutationRequest
            {
                UpdateDataElements =
                [
                    new InstanceMutationUpdateDataElement { DataElementId = Guid.NewGuid(), Locked = true },
                ],
                DeleteDataElements =
                [
                    new InstanceMutationDeleteDataElement { DataElementId = Guid.Parse(dataElement.Id) },
                    new InstanceMutationDeleteDataElement { DataElementId = Guid.Parse(dataElement.Id) },
                ],
            },
            org: null
        );

        ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            CancellationToken.None
        );

        TaskBindingConflict(result.Result);
        Assert.Single(await storage.DataRepository.ReadAll(InstanceGuid(instance)));
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public async Task CommitMutation_IgnoresTheLockOnAnUpdateOfATaskBoundDataType(bool contentUpdate)
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_1", locked: true);
        InstanceMutationsController controller = CreateMutationsController(
            storage,
            ["Task_1"],
            new InstanceMutationRequest
            {
                UpdateDataElements = [LockedElementUpdate(Guid.Parse(dataElement.Id), contentUpdate)],
            },
            org: null
        );

        ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            CancellationToken.None
        );

        Assert.IsType<OkObjectResult>(result.Result);
        DataElement stored = Assert.Single(await storage.DataRepository.ReadAll(InstanceGuid(instance)));
        Assert.Equal(["updated"], stored.Tags);
        Assert.Equal(contentUpdate, HasBlobs(storage, instance));
    }

    [Theory]
    [MemberData(nameof(UnboundTaskIds))]
    public async Task CommitMutation_RefusesAContentUpdateOfALockedElementOfAnUnboundDataTypeBeforeStagingIt(
        string[]? taskIds
    )
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_1", locked: true);
        InstanceMutationsController controller = CreateMutationsController(
            storage,
            taskIds,
            new InstanceMutationRequest
            {
                UpdateDataElements = [LockedElementUpdate(Guid.Parse(dataElement.Id), contentUpdate: true)],
            },
            org: null
        );

        ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            CancellationToken.None
        );

        // The commit refuses it too, but only after staging the content and with another message.
        Assert.Equal(
            $"Data element {dataElement.Id} is locked and cannot be updated",
            Assert.IsType<ConflictObjectResult>(result.Result).Value
        );
        Assert.Empty(Assert.Single(await storage.DataRepository.ReadAll(InstanceGuid(instance))).Tags);
    }

    [Theory]
    [MemberData(nameof(UnboundTaskIds))]
    public async Task CommitMutation_RefusesAMetadataUpdateOfALockedElementOfAnUnboundDataType(string[]? taskIds)
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_1", locked: true);
        InstanceMutationsController controller = CreateMutationsController(
            storage,
            taskIds,
            new InstanceMutationRequest
            {
                UpdateDataElements = [LockedElementUpdate(Guid.Parse(dataElement.Id), contentUpdate: false)],
            },
            org: null
        );

        ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            CancellationToken.None
        );

        ObjectResult conflict = Assert.IsAssignableFrom<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
        Assert.StartsWith($"Data element {dataElement.Id} is locked", Assert.IsType<string>(conflict.Value));
        Assert.Empty(Assert.Single(await storage.DataRepository.ReadAll(InstanceGuid(instance))).Tags);
    }

    [Theory]
    [MemberData(nameof(BoundAndUnboundTaskIds))]
    public async Task CommitMutation_DeletesALockedElementWithoutIgnoreLockInTheRequest(string[]? taskIds)
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_1", locked: true);
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
            org: null
        );

        ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            CancellationToken.None
        );

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.Empty(await storage.DataRepository.ReadAll(InstanceGuid(instance)));
    }

    [Fact]
    public async Task OverwriteData_IgnoresTheLockOnATaskBoundDataType()
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_1", locked: true);
        DataController controller = CreateDataController(
            storage,
            ["Task_1"],
            org: null,
            blobRepository: new BlobRepository(Options.Create(storage.Settings))
        );
        WithContent(controller);

        ActionResult<DataElement> result = await controller.OverwriteData(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            Guid.Parse(dataElement.Id),
            CancellationToken.None
        );

        Assert.IsType<OkObjectResult>(result.Result);
        Assert.Equal(7, Assert.Single(await storage.DataRepository.ReadAll(InstanceGuid(instance))).Size);
    }

    [Theory]
    [MemberData(nameof(UnboundTaskIds))]
    public async Task OverwriteData_RefusesALockedElementOfAnUnboundDataTypeBeforeTheUpload(string[]? taskIds)
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_1", locked: true);
        var blobRepository = new Mock<IBlobRepository>(MockBehavior.Strict);
        DataController controller = CreateDataController(
            storage,
            taskIds,
            org: null,
            blobRepository: blobRepository.Object
        );
        WithContent(controller);

        ActionResult<DataElement> result = await controller.OverwriteData(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            Guid.Parse(dataElement.Id),
            CancellationToken.None
        );

        Assert.Equal(
            $"Data element {dataElement.Id} is locked and cannot be updated",
            Assert.IsType<ConflictObjectResult>(result.Result).Value
        );
        Assert.Equal(0, Assert.Single(await storage.DataRepository.ReadAll(InstanceGuid(instance))).Size);
    }

    [Theory]
    [MemberData(nameof(BoundAndUnboundTaskIds))]
    public async Task OverwriteData_RefusesADifferingProcessStateVersionHeaderBeforeTheUpload(string[]? taskIds)
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_1");
        InstanceVersionResult versions = await storage.InstanceRepository.ReadVersions(
            InstanceGuid(instance),
            CancellationToken.None
        );
        var blobRepository = new Mock<IBlobRepository>(MockBehavior.Strict);
        DataController controller = CreateDataController(
            storage,
            taskIds,
            org: null,
            blobRepository: blobRepository.Object
        );
        WithContent(controller);
        controller.Request.Headers[StorageHeaders.IfProcessStateVersionMatch] = (
            versions.ProcessStateVersion + 1
        ).ToString();

        ActionResult<DataElement> result = await controller.OverwriteData(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            Guid.Parse(dataElement.Id),
            CancellationToken.None
        );

        ObjectResult mismatch = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status412PreconditionFailed, mismatch.StatusCode);
        Assert.Equal("process_state_version_mismatch", Assert.IsType<ProblemDetails>(mismatch.Value).Type);
    }

    [Theory]
    [InlineData(new[] { "Task_1" }, StatusCodes.Status412PreconditionFailed)]
    [InlineData(null, StatusCodes.Status200OK)]
    public async Task OverwriteData_WithoutAProcessStateVersionHeader_ExpectsTheVersionItReadOnlyForATaskBoundDataType(
        string[]? taskIds,
        int expectedStatus
    )
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_1");
        // The process moves on to the next task while the content is uploaded.
        var blobRepository = new Mock<IBlobRepository>();
        blobRepository
            .Setup(repository =>
                repository.WriteBlob(It.IsAny<string>(), It.IsAny<Stream>(), It.IsAny<string>(), It.IsAny<int?>())
            )
            .Returns(async () =>
            {
                await SetProcess(storage, instance, "Task_2");
                return (7L, DateTimeOffset.UtcNow);
            });
        DataController controller = CreateDataController(
            storage,
            taskIds,
            org: null,
            blobRepository: blobRepository.Object
        );
        WithContent(controller);

        ActionResult<DataElement> result = await controller.OverwriteData(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            Guid.Parse(dataElement.Id),
            CancellationToken.None
        );

        Assert.Equal(expectedStatus, Assert.IsAssignableFrom<IStatusCodeActionResult>(result.Result).StatusCode);
    }

    [Fact]
    public async Task OverwriteData_RefusesTheUpdateWhenTheProcessMovesOnRightAfterTheInstanceIsRead()
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_1");
        DataController controller = CreateDataController(
            storage,
            ["Task_1"],
            org: null,
            blobRepository: new BlobRepository(Options.Create(storage.Settings)),
            instanceRepository: AfterGetOneInstanceRepository.Create(
                storage.InstanceRepository,
                () => SetProcess(storage, instance, "Task_2")
            )
        );
        WithContent(controller);

        ActionResult<DataElement> result = await controller.OverwriteData(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            Guid.Parse(dataElement.Id),
            CancellationToken.None
        );

        ObjectResult mismatch = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status412PreconditionFailed, mismatch.StatusCode);
        Assert.Equal(0, Assert.Single(await storage.DataRepository.ReadAll(InstanceGuid(instance))).Size);
    }

    [Fact]
    public async Task CommitMutation_RefusesTheUpdateWhenTheProcessMovesOnRightAfterTheInstanceIsRead()
    {
        await using var storage = new LocalStorageFixture();
        (Instance instance, DataElement dataElement) = await SeedInTask(storage, "Task_1");
        InstanceMutationsController controller = CreateMutationsController(
            storage,
            ["Task_1"],
            new InstanceMutationRequest
            {
                UpdateDataElements =
                [
                    new InstanceMutationUpdateDataElement
                    {
                        DataElementId = Guid.Parse(dataElement.Id),
                        ContentPartName = "content",
                        ContentType = "text/plain",
                    },
                ],
            },
            org: null,
            instanceRepository: AfterGetOneInstanceRepository.Create(
                storage.InstanceRepository,
                () => SetProcess(storage, instance, "Task_2")
            )
        );

        ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
            int.Parse(instance.InstanceOwner.PartyId),
            InstanceGuid(instance),
            CancellationToken.None
        );

        ObjectResult mismatch = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status412PreconditionFailed, mismatch.StatusCode);
        Assert.Equal(0, Assert.Single(await storage.DataRepository.ReadAll(InstanceGuid(instance))).Size);
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

    private static ProblemDetails TaskBindingConflict(IActionResult? result)
    {
        JsonResult conflict = Assert.IsType<JsonResult>(result);
        Assert.Equal(StatusCodes.Status409Conflict, conflict.StatusCode);
        Assert.Equal("application/problem+json", conflict.ContentType);
        ProblemDetails problem = Assert.IsType<ProblemDetails>(conflict.Value);
        Assert.Equal("task_binding_conflict", problem.Type);
        Assert.Equal("Task binding conflict", problem.Title);
        Assert.Equal(StatusCodes.Status409Conflict, problem.Status);
        return problem;
    }

    private static InstanceMutationUpdateDataElement LockedElementUpdate(Guid dataElementId, bool contentUpdate) =>
        new()
        {
            DataElementId = dataElementId,
            Tags = ["updated"],
            ContentPartName = contentUpdate ? "content" : null,
            ContentType = contentUpdate ? "text/plain" : null,
        };

    private static void WithContent(DataController controller)
    {
        controller.Request.ContentType = "text/plain";
        controller.Request.Body = new MemoryStream("content"u8.ToArray());
    }

    private static ProcessState Process(string? currentTask, ProcessStatus? status = null, bool ended = false) =>
        new()
        {
            Started = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            Ended = ended ? new DateTime(2026, 1, 3, 0, 0, 0, DateTimeKind.Utc) : null,
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
        ProcessStatus? status = null,
        bool ended = false,
        bool locked = false
    )
    {
        Instance instance = await storage.CreateInstance();
        DataElement dataElement = await AddDataElement(storage, instance, locked);
        return (await SetProcess(storage, instance, currentTask, status, ended), dataElement);
    }

    private static Task<Instance> SetProcess(
        LocalStorageFixture storage,
        Instance instance,
        string? currentTask,
        ProcessStatus? status = null,
        bool ended = false
    )
    {
        instance.Process = Process(currentTask, status, ended);
        return storage.InstanceRepository.Update(instance, [nameof(Instance.Process)], CancellationToken.None);
    }

    private static async Task<DataElement> AddDataElement(LocalStorageFixture storage, Instance instance, bool locked)
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
                    Locked = locked,
                }
            )
        ).DataElement;
    }

    // deniedDataTypeId names a data type that requires an action the caller is denied, see Authorization.
    private static IApplicationRepository ApplicationRepository(
        string[]? taskIds,
        string? deniedDataTypeId,
        bool autoDeleteOnProcessEnd
    )
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
                            AppLogic = autoDeleteOnProcessEnd
                                ? new ApplicationLogic { AutoDeleteOnProcessEnd = true }
                                : null,
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
        string? deniedDataTypeId = null,
        bool autoDeleteOnProcessEnd = false,
        IDataService? dataService = null,
        IBlobRepository? blobRepository = null,
        IInstanceRepository? instanceRepository = null
    ) =>
        new(
            storage.DataRepository,
            blobRepository ?? Mock.Of<IBlobRepository>(),
            instanceRepository ?? storage.InstanceRepository,
            ApplicationRepository(taskIds, deniedDataTypeId, autoDeleteOnProcessEnd),
            dataService ?? Mock.Of<IDataService>(),
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
        string? deniedDataTypeId = null,
        bool autoDeleteOnProcessEnd = false,
        IBlobRepository? blobRepository = null,
        IInstanceRepository? instanceRepository = null
    )
    {
        IOptions<GeneralSettings> settings = Options.Create(new GeneralSettings { Hostname = "localhost" });
        var httpContext = new DefaultHttpContext { User = User(org) };
        string mutationJson = JsonConvert.SerializeObject(request);
        List<(string ContentPartName, string? ContentType)> contentParts =
        [
            .. (request.CreateDataElements ?? []).Select(create => (create.ContentPartName, create.ContentType)),
            .. (request.UpdateDataElements ?? [])
                .Where(update => update.ContentPartName is not null)
                .Select(update => (update.ContentPartName, update.ContentType)),
        ];
        if (contentParts.Count == 0)
        {
            httpContext.Request.ContentType = "application/json";
            httpContext.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(mutationJson));
        }
        else
        {
            using var content = new MultipartFormDataContent();
            content.Add(new StringContent(mutationJson, Encoding.UTF8, "application/json"), "mutation");
            foreach ((string contentPartName, string? contentType) in contentParts)
            {
                content.Add(new StringContent("content", Encoding.UTF8, contentType), contentPartName, "file.txt");
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
            blobRepository ?? new BlobRepository(Options.Create(storage.Settings)),
            instanceRepository ?? storage.InstanceRepository,
            storage.MutationRepository,
            ApplicationRepository(taskIds, deniedDataTypeId, autoDeleteOnProcessEnd),
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
