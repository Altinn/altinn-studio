using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class GetTests : ApiTestsBase<DatamodelsController, GetTests>
{
    private const string VersionPrefix = "/designer/api";

    public GetTests(WebApplicationFactory<DatamodelsController> factory) : base(factory)
    {
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.Configure<ServiceRepositorySettings>(c =>
            c.RepositoryLocation = TestRepositoriesLocation);
        services.AddSingleton<IGitea, IGiteaMock>();
    }

    [Theory]
    [InlineData("App/models/HvemErHvem_SERES.schema.json")]
    [InlineData("App%2Fmodels%2FHvemErHvem_SERES.schema.json")]
    public async Task GetDatamodel_ValidPath_ShouldReturnContent(string modelPath)
    {
        var org = "ttd";
        var repository = "hvem-er-hvem";

        var url = $"{VersionPrefix}/{org}/{repository}/datamodels/{modelPath}";
        var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        var response = await HttpClient.Value.SendAsync(httpRequestMessage);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }
}
