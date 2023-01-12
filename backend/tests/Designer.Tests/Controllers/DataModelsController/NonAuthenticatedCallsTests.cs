using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class NonAuthenticatedCallsTests : ApiTestsBase<DatamodelsController, NonAuthenticatedCallsTests>
{
    private const string VersionPrefix = "/designer/api";
    private readonly WebApplicationFactory<DatamodelsController> _factory;

    public NonAuthenticatedCallsTests(WebApplicationFactory<DatamodelsController> factory) : base(factory)
    {
        _factory = factory;
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.Configure<ServiceRepositorySettings>(c =>
            c.RepositoryLocation = TestRepositoriesLocation);
        services.AddSingleton<IGitea, IGiteaMock>();
    }

    [Fact]
    public async Task GetDatamodels_NotAuthenticated_ShouldReturn401()
    {
        const string url = $"{VersionPrefix}/ttd/hvem-er-hvem/Datamodels/";
        var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        var response = await HttpClient.Value.SendAsync(httpRequestMessage);

        Assert.Equal(HttpStatusCode.Found, response.StatusCode);
        Assert.Contains("/login/", response.Headers.Location.AbsoluteUri.ToLower());
    }

    // Using httpclient that doesn't have authorize handler that sets up cookie.
    protected override HttpClient GetTestClient()
    {
        var configPath = GetConfigPath();

        var client = _factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureAppConfiguration((context, conf) => { conf.AddJsonFile(configPath); });

            builder.ConfigureTestServices(ConfigureTestServices);
        }).CreateClient(new WebApplicationFactoryClientOptions() { AllowAutoRedirect = false });
        return client;
    }
}
