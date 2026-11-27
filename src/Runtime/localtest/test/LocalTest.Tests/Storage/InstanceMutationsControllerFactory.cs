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

namespace LocalTest.Tests.Storage;

internal static class InstanceMutationsControllerFactory
{
    internal static InstanceMutationsController CreateController(
        LocalStorageFixture storage,
        IAuthorization authorization,
        InstanceMutationRequest request,
        Dictionary<string, string>? headers = null,
        IInstanceMutationRepository? mutationRepository = null,
        string? org = null
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
                new ClaimsIdentity(
                    org is null
                        ? [new Claim(AltinnCoreClaimTypes.UserId, "1337")]
                        :
                        [
                            new Claim(AltinnCoreClaimTypes.Org, org),
                            new Claim(AltinnCoreClaimTypes.OrgNumber, "991825827"),
                        ],
                    "test"
                )
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
            mutationRepository ?? storage.MutationRepository,
            applicationRepository.Object,
            Mock.Of<IDataService>(),
            Mock.Of<IInstanceEventService>(),
            settings,
            authorization,
            Mock.Of<IAuthorizationService>(),
            new ProcessAuthorizer(
                authorization,
                Mock.Of<IClaimsPrincipalProvider>(provider =>
                    provider.GetUser() == httpContext.User
                ),
                settings
            )
        )
        {
            ControllerContext = new ControllerContext { HttpContext = httpContext },
        };
    }
}
