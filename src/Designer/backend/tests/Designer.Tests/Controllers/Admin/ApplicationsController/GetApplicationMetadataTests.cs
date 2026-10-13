using System.Net;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.Admin.ApplicationsController;

public class GetApplicationMetadataTests
    : DesignerEndpointsTestsBase<GetApplicationMetadataTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string Env = "tt02";
    private const string App = "test-app";

    private readonly Mock<IAppResourcesService> _appResourcesServiceMock = new();

    public GetApplicationMetadataTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_appResourcesServiceMock.Object);
    }

    [Fact]
    public async Task GetApplicationMetadata_PassesOnTheAppLibrariesVersionTheRunningAppReports()
    {
        // The admin panel shows the workflow engine's views only for an app on v9 or later of the
        // app libraries, and reads the version from this field.
        _appResourcesServiceMock
            .Setup(s => s.GetApplicationMetadata(Org, Env, App, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ApplicationMetadata($"{Org}/{App}") { AltinnNugetVersion = "8.5.1.0" });

        using var response = await HttpClient.GetAsync(
            $"designer/api/v1/admin/applications/{Org}/{Env}/{App}/application-metadata"
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using JsonDocument body = JsonDocument.Parse(await response.Content.ReadAsStringAsync());
        Assert.Equal("8.5.1.0", body.RootElement.GetProperty("altinnNugetVersion").GetString());
    }
}
