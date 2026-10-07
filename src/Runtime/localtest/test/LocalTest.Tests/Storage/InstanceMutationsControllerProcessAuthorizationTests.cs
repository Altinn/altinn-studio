using System.Globalization;
using System.Security.Claims;
using System.Text;
using Altinn.Platform.Storage.Authorization;
using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Controllers;
using Altinn.Platform.Storage.Helpers;
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

public sealed class InstanceMutationsControllerProcessAuthorizationTests
{
    private const string CurrentTaskId = "Task_1";
    private const string NextTaskId = "Task_2";

    [Fact]
    public async Task CommitMutation_ProcessStateWithoutTaskAction_ReturnsForbidAndKeepsProcess()
    {
        await using LocalStorageFixture storage = new();
        Instance instance = await CreateInstanceInTask(storage, CurrentTaskId);
        var authorization = new Mock<IAuthorization>();
        InstanceMutationsController controller = CreateController(
            storage,
            authorization.Object,
            CreateMoveToNextTaskRequest()
        );

        ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
            501337,
            InstanceGuid(instance),
            CancellationToken.None
        );

        Assert.IsType<ForbidResult>(result.Result);
        authorization.Verify(
            service =>
                service.AuthorizeInstanceAction(It.IsAny<Instance>(), "write", CurrentTaskId),
            Times.Once
        );
        Instance stored = await GetStoredInstance(storage, instance);
        Assert.Equal(CurrentTaskId, stored.Process.CurrentTask.ElementId);
    }

    [Fact]
    public async Task CommitMutation_ProcessStateWithTaskAction_MovesProcess()
    {
        await using LocalStorageFixture storage = new();
        Instance instance = await CreateInstanceInTask(storage, CurrentTaskId);
        var authorization = new Mock<IAuthorization>();
        authorization
            .Setup(service =>
                service.AuthorizeInstanceAction(It.IsAny<Instance>(), "write", CurrentTaskId)
            )
            .ReturnsAsync(true);
        InstanceMutationsController controller = CreateController(
            storage,
            authorization.Object,
            CreateMoveToNextTaskRequest()
        );

        ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
            501337,
            InstanceGuid(instance),
            CancellationToken.None
        );

        Assert.IsType<OkObjectResult>(result.Result);
        Instance stored = await GetStoredInstance(storage, instance);
        Assert.Equal(NextTaskId, stored.Process.CurrentTask.ElementId);
    }

    [Fact]
    public async Task CommitMutation_ProcessStateWhenProcessHasEnded_ReturnsForbid()
    {
        await using LocalStorageFixture storage = new();
        Instance instance = await CreateInstanceInTask(storage, currentTaskId: null);
        var authorization = new Mock<IAuthorization>();
        authorization
            .Setup(service =>
                service.AuthorizeInstanceAction(
                    It.IsAny<Instance>(),
                    It.IsAny<string>(),
                    It.IsAny<string>()
                )
            )
            .ReturnsAsync(true);
        InstanceMutationsController controller = CreateController(
            storage,
            authorization.Object,
            CreateMoveToNextTaskRequest()
        );

        ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
            501337,
            InstanceGuid(instance),
            CancellationToken.None
        );

        Assert.IsType<ForbidResult>(result.Result);
        Instance stored = await GetStoredInstance(storage, instance);
        Assert.Null(stored.Process.CurrentTask);
    }

    [Theory]
    [InlineData("reject", true)]
    [InlineData("write", false)]
    public async Task CommitMutation_AbandonFlow_RequiresRejectOnCurrentTask(
        string permittedAction,
        bool expectCommitted
    )
    {
        await using LocalStorageFixture storage = new();
        Instance instance = await CreateInstanceInTask(storage, CurrentTaskId);
        var authorization = new Mock<IAuthorization>();
        authorization
            .Setup(service =>
                service.AuthorizeInstanceAction(
                    It.IsAny<Instance>(),
                    permittedAction,
                    CurrentTaskId
                )
            )
            .ReturnsAsync(true);
        InstanceMutationsController controller = CreateController(
            storage,
            authorization.Object,
            CreateMoveToNextTaskRequest("AbandonCurrentMoveToNext")
        );

        ActionResult<InstanceMutationResponse> result = await controller.CommitMutation(
            501337,
            InstanceGuid(instance),
            CancellationToken.None
        );

        Instance stored = await GetStoredInstance(storage, instance);
        if (expectCommitted)
        {
            Assert.IsType<OkObjectResult>(result.Result);
            Assert.Equal(NextTaskId, stored.Process.CurrentTask.ElementId);
        }
        else
        {
            Assert.IsType<ForbidResult>(result.Result);
            Assert.Equal(CurrentTaskId, stored.Process.CurrentTask.ElementId);
        }
    }

    [Fact]
    public async Task CommitMutation_RetryOfProcessEndingMutation_ReplaysWithoutAuthorizing()
    {
        await using LocalStorageFixture storage = new();
        Instance instance = await CreateInstanceInTask(storage, CurrentTaskId);
        InstanceVersionResult versions = await storage.InstanceRepository.ReadVersions(
            InstanceGuid(instance),
            CancellationToken.None
        );
        Dictionary<string, string> headers = new()
        {
            [StorageHeaders.IdempotencyKey] = Guid.NewGuid().ToString(),
            [StorageHeaders.IfInstanceVersionMatch] = versions.InstanceVersion.ToString(
                CultureInfo.InvariantCulture
            ),
        };
        InstanceMutationRequest endProcess = new()
        {
            ProcessState = new ProcessStateUpdate
            {
                State = new ProcessState
                {
                    Started = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    Ended = new DateTime(2026, 1, 1, 1, 0, 0, DateTimeKind.Utc),
                    EndEvent = "EndEvent_1",
                },
            },
        };
        var permitWrite = new Mock<IAuthorization>();
        permitWrite
            .Setup(service =>
                service.AuthorizeInstanceAction(It.IsAny<Instance>(), "write", CurrentTaskId)
            )
            .ReturnsAsync(true);
        ActionResult<InstanceMutationResponse> first = await CreateController(
                storage,
                permitWrite.Object,
                endProcess,
                headers
            )
            .CommitMutation(501337, InstanceGuid(instance), CancellationToken.None);
        Assert.IsType<OkObjectResult>(first.Result);

        ActionResult<InstanceMutationResponse> retry = await CreateController(
                storage,
                new Mock<IAuthorization>().Object,
                endProcess,
                headers
            )
            .CommitMutation(501337, InstanceGuid(instance), CancellationToken.None);

        OkObjectResult replayed = Assert.IsType<OkObjectResult>(retry.Result);
        Assert.True(Assert.IsType<InstanceMutationResponse>(replayed.Value).Replayed);
    }

    private static InstanceMutationRequest CreateMoveToNextTaskRequest(
        string flowType = "CompleteCurrentMoveToNext"
    ) =>
        new()
        {
            ProcessState = new ProcessStateUpdate
            {
                State = new ProcessState
                {
                    Started = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                    CurrentTask = new ProcessElementInfo
                    {
                        ElementId = NextTaskId,
                        AltinnTaskType = "data",
                        Flow = 3,
                        FlowType = flowType,
                    },
                },
            },
        };

    private static async Task<Instance> CreateInstanceInTask(
        LocalStorageFixture storage,
        string? currentTaskId
    )
    {
        Instance instance = await storage.CreateInstance();
        instance.Process = new ProcessState
        {
            Started = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
            CurrentTask = currentTaskId is null
                ? null
                : new ProcessElementInfo
                {
                    ElementId = currentTaskId,
                    AltinnTaskType = "data",
                    Flow = 2,
                },
        };
        return await storage.InstanceRepository.Update(
            instance,
            [nameof(Instance.Process)],
            CancellationToken.None
        );
    }

    private static Guid InstanceGuid(Instance instance) => Guid.Parse(instance.Id.Split('/')[1]);

    private static async Task<Instance> GetStoredInstance(
        LocalStorageFixture storage,
        Instance instance
    )
    {
        (Instance stored, _) = await storage.InstanceRepository.GetOne(
            InstanceGuid(instance),
            false,
            CancellationToken.None
        );
        return stored;
    }

    private static InstanceMutationsController CreateController(
        LocalStorageFixture storage,
        IAuthorization authorization,
        InstanceMutationRequest request,
        Dictionary<string, string>? headers = null
    )
    {
        var applicationRepository = new Mock<IApplicationRepository>();
        applicationRepository
            .Setup(repository =>
                repository.FindOne(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new Application { Id = "ttd/localtest-content-etag-tests", Org = "ttd" });
        IOptions<GeneralSettings> settings = Options.Create(
            new GeneralSettings { Hostname = "localhost" }
        );

        byte[] body = Encoding.UTF8.GetBytes(JsonConvert.SerializeObject(request));
        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(
                new ClaimsIdentity([new Claim(AltinnCoreClaimTypes.UserId, "1337")], "test")
            ),
        };
        httpContext.Request.ContentType = "application/json";
        httpContext.Request.Body = new MemoryStream(body);
        foreach ((string name, string value) in headers ?? [])
        {
            httpContext.Request.Headers[name] = value;
        }

        return new InstanceMutationsController(
            storage.DataRepository,
            Mock.Of<IBlobRepository>(),
            storage.InstanceRepository,
            storage.MutationRepository,
            applicationRepository.Object,
            Mock.Of<IDataService>(),
            Mock.Of<IInstanceEventService>(),
            settings,
            authorization,
            Mock.Of<IAuthorizationService>(),
            new ProcessAuthorizer(authorization, settings)
        )
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext },
        };
    }
}
