#nullable enable
using System.Net;
using System.Net.Http;
using System.Text.Json.Nodes;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.DeploymentsController;

public class GetWarnings : DesignerEndpointsTestsBase<GetWarnings>, IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string App = "issue-6094";

    private readonly Mock<IDeployWarningsService> _deployWarningsService = new();

    public GetWarnings(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.RemoveAll<IDeployWarningsService>();
        services.AddSingleton(_deployWarningsService.Object);
    }

    [Fact]
    public async Task GetWarnings_ReturnsTheCodesTheFrontendTurnsIntoText()
    {
        _deployWarningsService
            .Setup(service => service.Get(Org, App, "2.0", "production", It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new DeployWarnings
                {
                    Warnings = [DeployWarning.UpgradeToV9, DeployWarning.PrereleaseToProduction],
                    ReleaseAppLibVersion = "9.0.0-preview.10",
                    EnvironmentAppLibVersion = "8.7.2",
                }
            );

        using HttpResponseMessage response = await HttpClient.GetAsync(Uri("2.0", "production"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        JsonNode? body = JsonNode.Parse(await response.Content.ReadAsStringAsync());
        Assert.True(
            JsonNode.DeepEquals(
                JsonNode.Parse(
                    """
                    {
                      "warnings": ["upgradeToV9", "prereleaseToProduction"],
                      "releaseAppLibVersion": "9.0.0-preview.10",
                      "environmentAppLibVersion": "8.7.2"
                    }
                    """
                ),
                body
            ),
            body?.ToJsonString()
        );
    }

    [Fact]
    public async Task GetWarnings_UnknownReleaseOrEnvironment_ReturnsNotFound()
    {
        _deployWarningsService
            .Setup(service => service.Get(Org, App, "9.9", "tt02", It.IsAny<CancellationToken>()))
            .ReturnsAsync((DeployWarnings?)null);

        using HttpResponseMessage response = await HttpClient.GetAsync(Uri("9.9", "tt02"));

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    private static string Uri(string tagName, string envName) =>
        $"/designer/api/{Org}/{App}/deployments/warnings?tagName={tagName}&envName={envName}";
}
