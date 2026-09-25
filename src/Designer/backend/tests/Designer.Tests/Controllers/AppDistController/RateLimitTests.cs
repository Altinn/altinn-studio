using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.AppDist;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.AppDistController;

public class RateLimitTests : DesignerEndpointsTestsBase<RateLimitTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private const string VersionsUrl = "designer/app-dist/versions";
    private const int AnonymousRequestLimit = 2;

    private readonly Mock<IAppDistProvider> _appDistProviderMock = new();

    public RateLimitTests(WebApplicationFactory<Program> factory)
        : base(factory)
    {
        JsonConfigOverrides.Add(
            $$"""
              {
                "AppDistSettings": {
                  "AnonymousRequestLimitPerMinute": {{AnonymousRequestLimit}}
                }
              }
            """
        );
        _appDistProviderMock.Setup(p => p.ListVersions(It.IsAny<CancellationToken>())).ReturnsAsync(["9.0.0"]);
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_appDistProviderMock.Object);
    }

    [Fact]
    public async Task AnonymousCaller_OverLimit_ReturnsTooManyRequestsWithRetryAfter()
    {
        using HttpClient anonymousClient = CreateTestClientWithAuthHandler<UnauthenticatedTestAuthHandler>();
        var statusCodes = new List<HttpStatusCode>();
        for (int i = 0; i < AnonymousRequestLimit; i++)
        {
            using HttpResponseMessage allowed = await anonymousClient.GetAsync(VersionsUrl);
            statusCodes.Add(allowed.StatusCode);
        }

        using HttpResponseMessage rejected = await anonymousClient.GetAsync(VersionsUrl);

        Assert.All(statusCodes, statusCode => Assert.Equal(HttpStatusCode.OK, statusCode));
        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
        Assert.NotNull(rejected.Headers.RetryAfter?.Delta);
    }

    [Fact]
    public async Task AuthenticatedCaller_IsNotLimited()
    {
        for (int i = 0; i <= AnonymousRequestLimit; i++)
        {
            using HttpResponseMessage response = await HttpClient.GetAsync(VersionsUrl);
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        }
    }
}
