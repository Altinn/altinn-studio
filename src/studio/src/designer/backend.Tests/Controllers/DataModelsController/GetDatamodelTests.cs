using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Manatee.Json;
using Manatee.Json.Schema;
using Manatee.Json.Serialization;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;
using static Designer.Tests.Controllers.DataModelsController.Utils.MockUtils;

namespace Designer.Tests.Controllers.DataModelsController;

public class GetDatamodelTests : ApiTestsBase<DatamodelsController, GetDatamodelTests>
{
    private const string VersionPrefix = "/designer/api";
    private readonly Mock<IRepository> _repositoryMock;

    public GetDatamodelTests(WebApplicationFactory<DatamodelsController> factory) : base(factory)
    {
        _repositoryMock = new Mock<IRepository>();
        MockRepositoryCalls(_repositoryMock, TestRepositoriesLocation, "testUser");
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.Configure<ServiceRepositorySettings>(c =>
            c.RepositoryLocation = TestRepositoriesLocation);
        services.AddSingleton<IGitea, IGiteaMock>();
        services.AddSingleton(_repositoryMock.Object);
    }

    [Fact]
    public async Task Get_Datamodel_Ok()
    {
        string dataPathWithData = $"{VersionPrefix}/ttd/ttd-datamodels/Datamodels/GetDatamodel?modelName=41111";

        HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
        string responsestring = await response.Content.ReadAsStringAsync();
        TextReader textReader = new StringReader(responsestring);
        JsonValue jsonValue = await JsonValue.ParseAsync(textReader);

        new JsonSerializer().Deserialize<JsonSchema>(jsonValue);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetDatamodel_InvalidFilePath_ReturnsBadRequest()
    {
        // Arrange
        string dataPathWithData =
            $"{VersionPrefix}/ttd/ttd-datamodels/Datamodels/GetDatamodel?modelName=../App/models/41111";

        HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

        // Act
        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
        string responsestring = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.Equal("Invalid model name value.", responsestring);
    }

    [Fact]
    public async Task Get_Datamodel_onlyXsd_Ok()
    {
        string dataPathWithData = $"{VersionPrefix}/ttd/ttd-datamodels/Datamodels/GetDatamodel?modelName=35721";

        HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
        string responsestring = await response.Content.ReadAsStringAsync();
        TextReader textReader = new StringReader(responsestring);
        JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
        JsonSchema jsonSchema = new JsonSerializer().Deserialize<JsonSchema>(jsonValue);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(5, jsonSchema.Count);
    }
}
