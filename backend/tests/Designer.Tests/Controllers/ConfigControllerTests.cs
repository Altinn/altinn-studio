using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Controllers;

public class ConfigControllerTests : ApiTestsBase<ConfigController, ConfigControllerTests>, IDisposable
{
    private readonly string _versionPrefix = "designer/api";
    private readonly JsonSerializerOptions _options;
    private string CreatedFolderPath { get; set; }

    public void Dispose()
    {
        if (!string.IsNullOrWhiteSpace(CreatedFolderPath))
        {
            TestDataHelper.DeleteDirectory(CreatedFolderPath);
        }
    }

    public ConfigControllerTests(WebApplicationFactory<ConfigController> factory) : base(factory)
    {
        _options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };
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
        ServiceConfiguration serviceConfigResponse = await response.Content.ReadAsAsync<ServiceConfiguration>();
        ServiceConfiguration serviceConfiguration = new () { RepositoryName = "apps-test", ServiceDescription = null, ServiceId = null, ServiceName = null};

        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(serviceConfiguration.RepositoryName, serviceConfigResponse.RepositoryName);
    }

    [Fact]
    public async Task GetServiceConfig_AppWithConfig_OK()
    {
        string dataPathWithData = $"{_versionPrefix}/ttd/hvem-er-hvem/config";
        HttpRequestMessage httpRequestMessage = new (HttpMethod.Get, dataPathWithData);

        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
        response.EnsureSuccessStatusCode();
        ServiceConfiguration serviceConfigResponse = await response.Content.ReadAsAsync<ServiceConfiguration>();
        ServiceConfiguration serviceConfiguration = GetServiceConfiguration("ttd", "hvem-er-hvem");

        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal(serviceConfiguration.RepositoryName, serviceConfigResponse.RepositoryName);
        Assert.Equal(serviceConfiguration.ServiceDescription, serviceConfigResponse.ServiceDescription);
        Assert.Equal(serviceConfiguration.ServiceId, serviceConfigResponse.ServiceId);
        Assert.Equal(serviceConfiguration.ServiceName, serviceConfigResponse.ServiceName);
    }

    [Fact]
    public async Task SetServiceConfig_OK()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest("ttd", "hvem-er-hvem", "testUser", targetRepository);

        string dataPathWithData = $"{_versionPrefix}/ttd/{targetRepository}/config";
        HttpRequestMessage httpRequestMessage = new (HttpMethod.Post, dataPathWithData);
        httpRequestMessage.Content = JsonContent.Create( new { serviceName = "Alternative-form-name", serviceDescription = "", serviceId = "" });

        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
        response.EnsureSuccessStatusCode();
        ServiceConfiguration serviceConfiguration = GetServiceConfiguration("ttd",targetRepository);

        Assert.Equal(StatusCodes.Status200OK, (int)response.StatusCode);
        Assert.Equal("Alternative-form-name", serviceConfiguration.ServiceName);
    }

    private ServiceConfiguration GetServiceConfiguration(string org, string app)
    {
        string path = Path.Combine(TestRepositoriesLocation, "testUser", org, app, "config.json");
        string config = File.ReadAllText(path);
        return JsonSerializer.Deserialize<ServiceConfiguration>(config, _options);
    }
}
