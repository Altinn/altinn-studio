using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class GetDatamodelsTests : ApiTestsBase<DatamodelsController, GetDatamodelsTests>
{
    private const string VersionPrefix = "/designer/api";

    public GetDatamodelsTests(WebApplicationFactory<DatamodelsController> factory) : base(factory)
    {
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.Configure<ServiceRepositorySettings>(c =>
            c.RepositoryLocation = TestRepositoriesLocation);
        services.AddSingleton<IGitea, IGiteaMock>();
    }

    [Fact]
    public async Task GetDatamodels_NoInput_ShouldReturnAllModels()
    {
        var url = $"{VersionPrefix}/ttd/hvem-er-hvem/Datamodels/";

        var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        var response = await HttpClient.Value.SendAsync(httpRequestMessage);
        var json = await response.Content.ReadAsStringAsync();
        var altinnCoreFiles = JsonSerializer.Deserialize<List<AltinnCoreFile>>(json);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(7, altinnCoreFiles.Count);
    }
}
