using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.AppDist;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.AppDistController;

public class GetVersionsTests
    : DesignerEndpointsTestsBase<GetVersionsTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string VersionsUrl = "designer/app-dist/versions";

    private readonly Mock<IAppDistProvider> _appDistProviderMock = new();

    public GetVersionsTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_appDistProviderMock.Object);
    }

    [Fact]
    public async Task GetVersions_ReturnsPublishedVersions()
    {
        _appDistProviderMock
            .Setup(p => p.ListVersions(It.IsAny<CancellationToken>()))
            .ReturnsAsync(["9.0.0-preview.1", "9.0.0"]);

        using var request = new HttpRequestMessage(HttpMethod.Get, VersionsUrl);
        using HttpResponseMessage response = await HttpClient.SendAsync(request);
        string responseBody = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(["9.0.0-preview.1", "9.0.0"], JsonSerializer.Deserialize<List<string>>(responseBody));
    }

    [Fact]
    public async Task GetVersions_AnonymousCaller_ReturnsPublishedVersions()
    {
        _appDistProviderMock.Setup(p => p.ListVersions(It.IsAny<CancellationToken>())).ReturnsAsync(["9.0.0"]);
        using HttpClient anonymousClient = CreateTestClientWithAuthHandler<UnauthenticatedTestAuthHandler>();

        using HttpResponseMessage response = await anonymousClient.GetAsync(VersionsUrl);
        string responseBody = await response.Content.ReadAsStringAsync();

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(["9.0.0"], JsonSerializer.Deserialize<List<string>>(responseBody));
    }

    [Fact]
    public async Task GetVersions_ApiKeyCaller_ReturnsPublishedVersions()
    {
        _appDistProviderMock.Setup(p => p.ListVersions(It.IsAny<CancellationToken>())).ReturnsAsync(["9.0.0"]);
        using HttpClient apiKeyClient = CreateTestClientWithAuthHandler<ApiKeyTestAuthHandler>();

        using HttpResponseMessage response = await apiKeyClient.GetAsync(VersionsUrl);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetVersions_WhenRegistryIsUnavailable_ReturnsBadGateway()
    {
        _appDistProviderMock
            .Setup(p => p.ListVersions(It.IsAny<CancellationToken>()))
            .ThrowsAsync(new AppDistSourceUnavailableException("registry down"));

        using var request = new HttpRequestMessage(HttpMethod.Get, VersionsUrl);
        using HttpResponseMessage response = await HttpClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.BadGateway, response.StatusCode);
    }
}
