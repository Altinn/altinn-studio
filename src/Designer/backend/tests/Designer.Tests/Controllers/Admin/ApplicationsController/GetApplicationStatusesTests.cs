using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway.Models;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.Admin.ApplicationsController;

public class GetApplicationStatusesTests
    : DesignerEndpointsTestsBase<GetApplicationStatusesTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string Env = "tt02";

    private readonly Mock<IRuntimeGatewayClient> _runtimeGatewayClientMock = new();
    private readonly Mock<IAppLibVersionService> _appLibVersionServiceMock = new();

    public GetApplicationStatusesTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_runtimeGatewayClientMock.Object);
        services.AddSingleton(_appLibVersionServiceMock.Object);
    }

    [Fact]
    public async Task GetApplicationStatuses_ReturnsEachRunningAppsStatusAndAppLibVersion()
    {
        _runtimeGatewayClientMock
            .Setup(c =>
                c.GetRunningAppDeployments(
                    Org,
                    It.Is<AltinnEnvironment>(e => e.Name == Env),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new Dictionary<string, RunningAppDeployment>
                {
                    ["app-one"] = new("12", "1", "tt02", "ready", null),
                    ["app-two"] = new("7", "2", "tt02", "unavailable", null),
                    ["app-three"] = new("3", "3", "tt02", "updating", null),
                }
            );
        _appLibVersionServiceMock
            .Setup(s =>
                s.GetAppLibVersions(
                    Org,
                    Env,
                    It.Is<IEnumerable<AppImage>>(apps =>
                        // Only an app that is ready surely answers from the image it reports.
                        apps.SequenceEqual(
                            new[]
                            {
                                new AppImage("app-one", "12"),
                                new AppImage("app-two", null),
                                new AppImage("app-three", null),
                            }
                        )
                    ),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(
                new Dictionary<string, string>
                {
                    ["app-one"] = "8.7.2",
                    ["app-two"] = null,
                    ["app-three"] = "8.6.0",
                }
            );

        using var response = await HttpClient.GetAsync($"designer/api/v1/admin/applications/{Org}/{Env}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            """[{"app":"app-one","status":"ready","appLibVersion":"8.7.2"},{"app":"app-two","status":"unavailable","appLibVersion":null},{"app":"app-three","status":"updating","appLibVersion":"8.6.0"}]""",
            await response.Content.ReadAsStringAsync()
        );
        _runtimeGatewayClientMock.Verify(
            c => c.GetAppDeployments(It.IsAny<string>(), It.IsAny<AltinnEnvironment>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task GetApplicationStatuses_WhenTheGatewayPredatesTheList_ReturnsTheVersionsOfThePublishedApps()
    {
        _runtimeGatewayClientMock
            .Setup(c => c.GetRunningAppDeployments(Org, It.IsAny<AltinnEnvironment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyDictionary<string, RunningAppDeployment>)null);
        _runtimeGatewayClientMock
            .Setup(c => c.GetAppDeployments(Org, It.IsAny<AltinnEnvironment>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([new AppDeployment(Org, Env, "app-one", "tt02", "1", "12")]);
        _appLibVersionServiceMock
            .Setup(s =>
                s.GetAppLibVersions(
                    Org,
                    Env,
                    // Without a status, the app may be in a rollout, so its version is not kept under its image's tag.
                    It.Is<IEnumerable<AppImage>>(apps => apps.SequenceEqual(new[] { new AppImage("app-one", null) })),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(new Dictionary<string, string> { ["app-one"] = "8.7.2" });

        using var response = await HttpClient.GetAsync($"designer/api/v1/admin/applications/{Org}/{Env}");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            """[{"app":"app-one","status":null,"appLibVersion":"8.7.2"}]""",
            await response.Content.ReadAsStringAsync()
        );
    }

    [Fact]
    public async Task GetApplicationStatuses_WhenTheGatewayCannotBeReached_ReturnsBadGateway()
    {
        _runtimeGatewayClientMock
            .Setup(c => c.GetRunningAppDeployments(Org, It.IsAny<AltinnEnvironment>(), It.IsAny<CancellationToken>()))
            .ThrowsAsync(new HttpRequestException("gateway is down"));

        using var response = await HttpClient.GetAsync($"designer/api/v1/admin/applications/{Org}/{Env}");

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }
}
