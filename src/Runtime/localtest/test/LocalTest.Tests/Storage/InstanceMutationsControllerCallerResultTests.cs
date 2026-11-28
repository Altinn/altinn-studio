using System.Globalization;
using Altinn.Platform.Storage.Authorization;
using Altinn.Platform.Storage.Controllers;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Repository;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;
using Xunit;
using static LocalTest.Tests.Storage.InstanceMutationsControllerFactory;

namespace LocalTest.Tests.Storage;

public sealed class InstanceMutationsControllerCallerResultTests
{
    private const string AppOrg = "ttd";
    private const string CallerResult = """{"kind":"success","action":"confirm"}""";

    public static TheoryData<string, bool, string> InvalidCallerResults =>
        new()
        {
            { CallerResult, false, "callerResult requires Idempotency-Key." },
            { "", true, "callerResult must be 1 to 4096 characters long." },
            { new string('x', 4097), true, "callerResult must be 1 to 4096 characters long." },
            { "{\"kind\":\0}", true, "callerResult must not contain a NUL character." },
        };

    [Theory]
    [MemberData(nameof(InvalidCallerResults))]
    public async Task CommitMutation_InvalidCallerResult_ReturnsBadRequest(
        string callerResult,
        bool withIdempotencyKey,
        string expectedDetail
    )
    {
        await using LocalStorageFixture storage = new();
        Instance instance = await storage.CreateInstance();

        ActionResult<InstanceMutationResponse> result = await CreateController(
                storage,
                new Mock<IAuthorization>(MockBehavior.Strict).Object,
                new InstanceMutationRequest { CallerResult = callerResult },
                withIdempotencyKey
                    ? await IdempotencyHeaders(storage, instance, Guid.NewGuid())
                    : [],
                org: AppOrg
            )
            .CommitMutation(501337, InstanceGuid(instance), CancellationToken.None);

        ObjectResult badRequest = Assert.IsType<ObjectResult>(result.Result);
        Assert.Equal(StatusCodes.Status400BadRequest, badRequest.StatusCode);
        Assert.Equal(expectedDetail, Assert.IsType<ProblemDetails>(badRequest.Value).Detail);
    }

    [Fact]
    public async Task CommitMutation_CallerResultOf4096Characters_IsAccepted()
    {
        await using LocalStorageFixture storage = new();
        Instance instance = await storage.CreateInstance();

        ActionResult<InstanceMutationResponse> result = await CreateController(
                storage,
                new Mock<IAuthorization>(MockBehavior.Strict).Object,
                new InstanceMutationRequest { CallerResult = new string('x', 4096) },
                await IdempotencyHeaders(storage, instance, Guid.NewGuid()),
                org: AppOrg
            )
            .CommitMutation(501337, InstanceGuid(instance), CancellationToken.None);

        Assert.IsType<OkObjectResult>(result.Result);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("skd")]
    public async Task CommitMutation_CallerResultFromAnyoneButTheInstancesOwnOrganization_ReturnsForbid(
        string? org
    )
    {
        await using LocalStorageFixture storage = new();
        Instance instance = await storage.CreateInstance();

        ActionResult<InstanceMutationResponse> result = await CreateController(
                storage,
                new Mock<IAuthorization>(MockBehavior.Strict).Object,
                new InstanceMutationRequest { CallerResult = CallerResult },
                await IdempotencyHeaders(storage, instance, Guid.NewGuid()),
                org: org
            )
            .CommitMutation(501337, InstanceGuid(instance), CancellationToken.None);

        Assert.IsType<ForbidResult>(result.Result);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task CommitMutation_WithoutInstanceChanges_LeavesVersionsAndLastChanged(
        bool processEventsOnly
    )
    {
        await using LocalStorageFixture storage = new();
        Instance instance = await storage.CreateInstance();
        InstanceVersionResult before = await storage.InstanceRepository.ReadVersions(
            InstanceGuid(instance),
            CancellationToken.None
        );
        InstanceMutationRequest request = processEventsOnly
            ? new InstanceMutationRequest
            {
                ProcessState = new ProcessStateUpdate
                {
                    Events =
                    [
                        new InstanceEvent
                        {
                            EventType = "process_StartTask",
                            User = new PlatformUser { OrgId = AppOrg },
                        },
                    ],
                },
            }
            : new InstanceMutationRequest { CallerResult = CallerResult };

        ActionResult<InstanceMutationResponse> result = await CreateController(
                storage,
                new Mock<IAuthorization>(MockBehavior.Strict).Object,
                request,
                await IdempotencyHeaders(storage, instance, Guid.NewGuid()),
                org: AppOrg
            )
            .CommitMutation(501337, InstanceGuid(instance), CancellationToken.None);

        InstanceMutationResponse response = Answer(result);
        Assert.False(response.Replayed);
        Assert.Equal(request.CallerResult, response.CallerResult);
        Assert.Equal(
            before,
            await storage.InstanceRepository.ReadVersions(
                InstanceGuid(instance),
                CancellationToken.None
            )
        );
        (Instance stored, _) = await storage.InstanceRepository.GetOne(
            InstanceGuid(instance),
            false,
            CancellationToken.None
        );
        Assert.Equal(instance.LastChanged, stored.LastChanged);
        Assert.Equal(instance.LastChangedBy, stored.LastChangedBy);
        List<InstanceEvent> events = await storage.InstanceEventRepository.ListInstanceEvents(
            instance.Id,
            null,
            null,
            null
        );
        Assert.Equal(processEventsOnly ? 1 : 0, events.Count);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task CommitMutation_Retry_AnswersWithTheCommittedCallerResultNotItsOwn(
        bool committedMutationMovesTheProcess
    )
    {
        await using LocalStorageFixture storage = new();
        Instance instance = await storage.CreateInstance();
        Dictionary<string, string> headers = await IdempotencyHeaders(
            storage,
            instance,
            Guid.NewGuid()
        );
        ProcessStateUpdate? processState = committedMutationMovesTheProcess
            ? MoveToTask("Task_2")
            : null;
        InstanceMutationResponse committed = Answer(
            await CreateController(
                    storage,
                    new Mock<IAuthorization>(MockBehavior.Strict).Object,
                    new InstanceMutationRequest
                    {
                        ProcessState = processState,
                        CallerResult = CallerResult,
                    },
                    headers,
                    org: AppOrg
                )
                .CommitMutation(501337, InstanceGuid(instance), CancellationToken.None)
        );

        InstanceMutationResponse retry = Answer(
            await CreateController(
                    storage,
                    new Mock<IAuthorization>(MockBehavior.Strict).Object,
                    new InstanceMutationRequest
                    {
                        ProcessState = processState,
                        CallerResult = """{"kind":"awaitNextReply"}""",
                    },
                    headers,
                    org: AppOrg
                )
                .CommitMutation(501337, InstanceGuid(instance), CancellationToken.None)
        );

        Assert.False(committed.Replayed);
        Assert.True(retry.Replayed);
        Assert.Equal(CallerResult, retry.CallerResult);
    }

    [Fact]
    public async Task CommitMutation_RetryOfAMutationWithoutCallerResult_AnswersWithNone()
    {
        await using LocalStorageFixture storage = new();
        Instance instance = await storage.CreateInstance();
        Dictionary<string, string> headers = await IdempotencyHeaders(
            storage,
            instance,
            Guid.NewGuid()
        );
        Answer(
            await CreateController(
                    storage,
                    new Mock<IAuthorization>(MockBehavior.Strict).Object,
                    new InstanceMutationRequest { ProcessState = MoveToTask("Task_2") },
                    headers,
                    org: AppOrg
                )
                .CommitMutation(501337, InstanceGuid(instance), CancellationToken.None)
        );

        InstanceMutationResponse retry = Answer(
            await CreateController(
                    storage,
                    new Mock<IAuthorization>(MockBehavior.Strict).Object,
                    new InstanceMutationRequest
                    {
                        ProcessState = MoveToTask("Task_2"),
                        CallerResult = CallerResult,
                    },
                    headers,
                    org: AppOrg
                )
                .CommitMutation(501337, InstanceGuid(instance), CancellationToken.None)
        );

        Assert.True(retry.Replayed);
        Assert.Null(retry.CallerResult);
    }

    private static ProcessStateUpdate MoveToTask(string taskId) =>
        new()
        {
            State = new ProcessState
            {
                Started = new DateTime(2026, 1, 1, 0, 0, 0, DateTimeKind.Utc),
                CurrentTask = new ProcessElementInfo
                {
                    ElementId = taskId,
                    AltinnTaskType = "data",
                    Flow = 2,
                },
            },
        };

    private static InstanceMutationResponse Answer(ActionResult<InstanceMutationResponse> result) =>
        Assert.IsType<InstanceMutationResponse>(Assert.IsType<OkObjectResult>(result.Result).Value);

    private static async Task<Dictionary<string, string>> IdempotencyHeaders(
        LocalStorageFixture storage,
        Instance instance,
        Guid idempotencyKey
    )
    {
        InstanceVersionResult versions = await storage.InstanceRepository.ReadVersions(
            InstanceGuid(instance),
            CancellationToken.None
        );
        return new()
        {
            [StorageHeaders.IdempotencyKey] = idempotencyKey.ToString(),
            [StorageHeaders.IfInstanceVersionMatch] = versions.InstanceVersion.ToString(
                CultureInfo.InvariantCulture
            ),
        };
    }

    private static Guid InstanceGuid(Instance instance) => Guid.Parse(instance.Id.Split('/')[1]);
}
