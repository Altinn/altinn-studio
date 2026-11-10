using System.Security.Claims;
using Altinn.Authorization.ABAC.Xacml.JsonProfile;
using Altinn.Platform.Storage.Authorization;
using Altinn.Platform.Storage.Clients;
using Altinn.Platform.Storage.Configuration;
using Altinn.Platform.Storage.Controllers;
using Altinn.Platform.Storage.Helpers;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Platform.Storage.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using Xunit;

namespace LocalTest.Tests.Storage;

public sealed class InstancesControllerPostTests
{
    [Fact]
    public async Task Post_WithPresentationTexts_StoresNonEmptyTexts()
    {
        await using LocalStorageFixture storage = new();
        InstancesController controller = CreateController(storage);
        Instance template = new()
        {
            InstanceOwner = new InstanceOwner { PartyId = "501337" },
            PresentationTexts = new Dictionary<string, string>
            {
                ["name"] = "Ola Olsen",
                ["empty"] = string.Empty,
                ["missing"] = null!,
            },
        };

        ActionResult<Instance> result = await controller.Post(
            "ttd/presentation-texts",
            template,
            CancellationToken.None
        );

        CreatedResult created = Assert.IsType<CreatedResult>(result.Result);
        Instance createdInstance = Assert.IsType<Instance>(created.Value);
        Dictionary<string, string> expected = new() { ["name"] = "Ola Olsen" };
        Assert.Equal(expected, createdInstance.PresentationTexts);
        (Instance storedInstance, _) = await storage.InstanceRepository.GetOne(
            Guid.Parse(createdInstance.Id.Split('/')[1]),
            false,
            CancellationToken.None
        );
        Assert.Equal(expected, storedInstance.PresentationTexts);
    }

    private static InstancesController CreateController(LocalStorageFixture storage)
    {
        var applicationService = new Mock<IApplicationService>();
        applicationService
            .Setup(service => service.GetApplicationOrErrorAsync("ttd/presentation-texts"))
            .ReturnsAsync((new Application { Id = "ttd/presentation-texts", Org = "ttd" }, null!));
        var authorization = new Mock<IAuthorization>();
        authorization
            .Setup(service =>
                service.GetDecisionForRequest(
                    It.IsAny<XacmlJsonRequestRoot>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new XacmlJsonResponse { Response = [new XacmlJsonResult { Decision = "Permit" }] }
            );

        return new InstancesController(
            storage.InstanceRepository,
            Mock.Of<IPartiesWithInstancesClient>(),
            NullLogger<InstancesController>.Instance,
            authorization.Object,
            Mock.Of<IInstanceEventService>(),
            Mock.Of<IRegisterService>(),
            applicationService.Object,
            Options.Create(new GeneralSettings { Hostname = "localhost" }),
            Mock.Of<IProcessAuthorizer>()
        )
        {
            ControllerContext = new ControllerContext
            {
                HttpContext = new DefaultHttpContext
                {
                    User = new ClaimsPrincipal(new ClaimsIdentity()),
                },
            },
        };
    }
}
