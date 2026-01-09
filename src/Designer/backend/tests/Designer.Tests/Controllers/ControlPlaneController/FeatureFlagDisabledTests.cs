using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Mvc.Testing.Handlers;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace Designer.Tests.Controllers.ControlPlaneController;

public class FeatureFlagDisabledTests : DesignerEndpointsTestsBase<FeatureFlagDisabledTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private const string VersionPrefix = "/designer/api/v1/controlplane/health";

    public FeatureFlagDisabledTests(WebApplicationFactory<Program> factory) : base(factory)
    {
        JsonConfigOverrides.Add(
            $$"""
                 {
                       "FeatureManagement": {
                           "{{StudioFeatureFlags.Maskinporten}}": false
                       }
                 }
              """);
    }

    private HttpClient CreateUnauthenticatedClient()
    {
        string configPath = GetConfigPath();
        IConfiguration configuration = new ConfigurationBuilder()
            .AddJsonFile(configPath, false, false)
            .AddJsonStream(GenerateJsonOverrideConfig())
            .AddEnvironmentVariables()
            .Build();

        return Factory.WithWebHostBuilder(builder =>
        {
            builder.UseConfiguration(configuration);
            builder.ConfigureAppConfiguration((_, conf) =>
            {
                conf.AddJsonFile(configPath);
                conf.AddJsonStream(GenerateJsonOverrideConfig());
            });
            builder.ConfigureTestServices(ConfigureTestServices);
        }).CreateDefaultClient(new CookieContainerHandler());
    }

    [Fact]
    public async Task Health_ReturnsNotFound_WhenFeatureFlagDisabled()
    {
        using var client = CreateUnauthenticatedClient();
        using var response = await client.GetAsync(VersionPrefix);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
