using System.Security.Claims;
using System.Text;
using Altinn.Platform.Storage.Authorization;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Controllers;
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
using Xunit;

namespace LocalTest.Tests.Storage;

public sealed class InstanceMutationsControllerSubstatusTests
{
    private const string AppOwner = "ttd";

    [Fact]
    public async Task CommitMutation_SubstatusFromTheAppOwner_SetsItAndRecordsSubstatusUpdated()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();

        ActionResult<InstanceMutationResponse> result = await CreateController(
                storage,
                """{"substatus":{"label":"substatus.received","description":"substatus.received.description"}}""",
                AppOwner
            )
            .CommitMutation(PartyId(instance), InstanceGuid(instance), CancellationToken.None);

        Assert.IsType<OkObjectResult>(result.Result);
        Instance stored = await GetStoredInstance(storage, instance);
        Assert.Equal("substatus.received", stored.Status.Substatus.Label);
        Assert.Equal("substatus.received.description", stored.Status.Substatus.Description);
        InstanceEvent instanceEvent = Assert.Single(
            await storage.InstanceEventRepository.ListInstanceEvents(instance.Id, null, null, null)
        );
        Assert.Equal(InstanceEventType.SubstatusUpdated.ToString(), instanceEvent.EventType);
    }

    [Fact]
    public async Task CommitMutation_SubstatusWithProcessEnd_KeepsTheArchiveStatus()
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();
        DateTime processEnded = new(2026, 6, 7, 8, 9, 10, DateTimeKind.Utc);

        ActionResult<InstanceMutationResponse> result = await CreateController(
                storage,
                $$"""
                {
                  "processState": {
                    "state": {
                      "started": "2026-06-07T08:00:00Z",
                      "startEvent": "StartEvent_1",
                      "ended": "{{processEnded:O}}",
                      "endEvent": "EndEvent_1"
                    }
                  },
                  "substatus": { "label": "substatus.received" }
                }
                """,
                AppOwner
            )
            .CommitMutation(PartyId(instance), InstanceGuid(instance), CancellationToken.None);

        Assert.IsType<OkObjectResult>(result.Result);
        Instance stored = await GetStoredInstance(storage, instance);
        Assert.True(stored.Status.IsArchived);
        Assert.Equal(processEnded, stored.Status.Archived);
        Assert.Equal("substatus.received", stored.Status.Substatus.Label);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("other-org")]
    public async Task CommitMutation_SubstatusFromAUserOrAnotherOrg_ReturnsForbid(string? org)
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();

        ActionResult<InstanceMutationResponse> result = await CreateController(
                storage,
                """{"substatus":{"label":"substatus.received"}}""",
                org
            )
            .CommitMutation(PartyId(instance), InstanceGuid(instance), CancellationToken.None);

        Assert.IsType<ForbidResult>(result.Result);
        Assert.Null((await GetStoredInstance(storage, instance)).Status.Substatus);
    }

    [Theory]
    [InlineData("""{"substatus":{"label":""}}""", "substatus.label is required.")]
    [InlineData("""{"substatus":{"description":"no label"}}""", "substatus.label is required.")]
    [InlineData(
        """{"deleteInstance":{"hard":true},"substatus":{"label":"deleted"}}""",
        "deleteInstance cannot be combined with other aggregate mutation operations."
    )]
    public async Task CommitMutation_InvalidSubstatusRequest_ReturnsBadRequest(string mutationJson, string message)
    {
        await using var storage = new LocalStorageFixture();
        Instance instance = await storage.CreateInstance();

        ActionResult<InstanceMutationResponse> result = await CreateController(storage, mutationJson, AppOwner)
            .CommitMutation(PartyId(instance), InstanceGuid(instance), CancellationToken.None);

        Assert.Equal(message, Assert.IsType<BadRequestObjectResult>(result.Result).Value);
        Instance stored = await GetStoredInstance(storage, instance);
        Assert.Null(stored.Status.Substatus);
        Assert.False(stored.Status.IsHardDeleted);
    }

    private static int PartyId(Instance instance) => int.Parse(instance.InstanceOwner.PartyId);

    private static Guid InstanceGuid(Instance instance) => Guid.Parse(instance.Id.Split('/')[1]);

    private static async Task<Instance> GetStoredInstance(LocalStorageFixture storage, Instance instance)
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
        string mutationJson,
        string? org
    )
    {
        var applicationRepository = new Mock<IApplicationRepository>();
        applicationRepository
            .Setup(repository =>
                repository.FindOne(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>())
            )
            .ReturnsAsync(new Application { Id = "ttd/localtest-content-etag-tests", Org = AppOwner });
        IOptions<GeneralSettings> settings = Options.Create(new GeneralSettings { Hostname = "localhost" });
        var httpContext = new DefaultHttpContext
        {
            User = new ClaimsPrincipal(
                new ClaimsIdentity(
                    org is null
                        ? [new Claim(AltinnCoreClaimTypes.UserId, "1337")]
                        : [new Claim(AltinnCoreClaimTypes.Org, org), new Claim(AltinnCoreClaimTypes.OrgNumber, "991825827")],
                    "test"
                )
            ),
        };
        httpContext.Request.ContentType = "application/json";
        httpContext.Request.Body = new MemoryStream(Encoding.UTF8.GetBytes(mutationJson));

        var authorization = new Mock<IAuthorization>(MockBehavior.Strict);
        return new InstanceMutationsController(
            storage.DataRepository,
            Mock.Of<IBlobRepository>(),
            storage.InstanceRepository,
            storage.MutationRepository,
            applicationRepository.Object,
            Mock.Of<IDataService>(),
            new InstanceEventService(
                storage.InstanceEventRepository,
                new HttpContextAccessor { HttpContext = httpContext }
            ),
            settings,
            authorization.Object,
            Mock.Of<IAuthorizationService>(),
            new ProcessAuthorizer(
                authorization.Object,
                Mock.Of<IClaimsPrincipalProvider>(provider => provider.GetUser() == httpContext.User),
                settings
            )
        )
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext },
        };
    }
}
