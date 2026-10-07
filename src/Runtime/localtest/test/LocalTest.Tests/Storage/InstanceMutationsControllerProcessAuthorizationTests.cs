using System.Security.Claims;
using System.Text;
using Altinn.Platform.Storage.Authorization;
using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Controllers;
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

    private static InstanceMutationRequest CreateMoveToNextTaskRequest() =>
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
                        FlowType = "CompleteCurrentMoveToNext",
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
        InstanceMutationRequest request
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
