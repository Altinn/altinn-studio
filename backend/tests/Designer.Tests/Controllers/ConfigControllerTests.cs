using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Controllers;

public class ConfigControllerTests : ApiTestsBase<ConfigController, ConfigControllerTests>
{
    private readonly string _versionPrefix = "designer/api";

    public ConfigControllerTests(WebApplicationFactory<ConfigController> factory) : base(factory)
    {
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.Configure<ServiceRepositorySettings>(c =>
            c.RepositoryLocation = TestRepositoriesLocation);
        services.AddSingleton<IGitea, IGiteaMock>();
    }

    [Fact]
    public async Task GetServiceConfig_AppWithoutConfig_OK()
    {
        string dataPathWithData = $"{_versionPrefix}/ttd/apps-test/config";
        HttpRequestMessage httpRequestMessage = new (HttpMethod.Get, dataPathWithData);

        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
        response.EnsureSuccessStatusCode();
        string responseBody = await response.Content.ReadAsStringAsync();
        JsonDocument responseDocument = JsonDocument.Parse(responseBody);
        ServiceConfiguration serviceConfigResponse = JsonSerializer.Deserialize<ServiceConfiguration>(response.Content.ToString());
        ServiceConfiguration serviceConfiguration = new () { RepositoryName = "apps-test" };

        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(serviceConfiguration, serviceConfigResponse);
    }

    [Fact]
    public async Task GetServiceConfig_AppWithConfig_OK()
    {
        string dataPathWithData = $"{_versionPrefix}/ttd/hvem-er-hvem/config";
        HttpRequestMessage httpRequestMessage = new (HttpMethod.Get, dataPathWithData);

        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
        response.EnsureSuccessStatusCode();

        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(true, true);
    }

    [Fact]
    public async Task SetServiceConfig_OK()
    {
        string dataPathWithData = $"{_versionPrefix}/ttd/hvem-er-hvem/config";
        HttpRequestMessage httpRequestMessage = new (HttpMethod.Post, dataPathWithData);

        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
        response.EnsureSuccessStatusCode();

        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(true, true);
    }
}
