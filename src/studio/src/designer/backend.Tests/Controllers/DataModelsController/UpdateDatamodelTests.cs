using System.IO;
using System.Net;
using System.Net.Http;
using System.Text;
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

public class UpdateDatamodelTests : ApiTestsBase<DatamodelsController, UpdateDatamodelTests>
{
    private const string VersionPrefix = "/designer/api";
    private readonly Mock<IRepository> _repositoryMock;

    public UpdateDatamodelTests(WebApplicationFactory<DatamodelsController> factory) : base(factory)
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

    /// <summary>
    /// Scenario: Post a Json Schema
    /// </summary>
    [Theory]
    [InlineData("RA-0678_M.xsd", "0678")]
    [InlineData("schema_4581_100_forms_5245_41111.xsd", "41111")]
    [InlineData("schema_2978_1_forms_3478_32578.xsd", "32578")]
    public async Task Get_Put_UpdatemodelCommon(string xsdSchema, string modelName)
    {
        var testDataLocation = Path.Combine(UnitTestsFolder, "..", "..", "..", "_TestData");
        if (File.Exists(testDataLocation + $"/Repositories/testuser/ttd/ttd-datamodels/App/models/{modelName}.schema.json"))
        {
            File.Delete(testDataLocation + $"/Repositories/testuser/ttd/ttd-datamodels/App/models/{modelName}.schema.json");
        }

        File.Copy(testDataLocation + $"/Model/Xsd/{xsdSchema}", testDataLocation + $"/Repositories/testUser/ttd/ttd-datamodels/App/models/{modelName}.xsd", true);

        string dataPathWithData = $"{VersionPrefix}/ttd/ttd-datamodels/Datamodels/GetDatamodel?modelName={modelName}";

        HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
        string responsestring = await response.Content.ReadAsStringAsync();
        TextReader textReader = new StringReader(responsestring);
        JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
        JsonSchema jsonSchema = new JsonSerializer().Deserialize<JsonSchema>(jsonValue);

        dataPathWithData = $"{VersionPrefix}/ttd/ttd-datamodels/Datamodels/UpdateDatamodel?modelName={modelName}";

        var serializer = new JsonSerializer();
        JsonValue toar = serializer.Serialize(jsonSchema);

        string requestBody = toar.ToString();
        HttpRequestMessage httpRequestMessagePut = new HttpRequestMessage(HttpMethod.Put, dataPathWithData)
        {
            Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
        };

        HttpResponseMessage responsePut = await HttpClient.Value.SendAsync(httpRequestMessagePut);
        Assert.Equal(HttpStatusCode.OK, responsePut.StatusCode);
    }

    /// <summary>
    /// Scenario: Attempt to update a JSON Schema to an invalid path.
    /// </summary>
    [Fact]
    public async Task UpdateDatamodel_FilePathIsInvalid_ReturnsBadRequest()
    {
        // Arrange
        string dataPathWithData = $"{VersionPrefix}/ttd/ttd-datamodels/Datamodels/GetDatamodel?modelName=0678";

        HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, dataPathWithData);

        HttpResponseMessage response = await HttpClient.Value.SendAsync(httpRequestMessage);
        string responsestring = await response.Content.ReadAsStringAsync();
        TextReader textReader = new StringReader(responsestring);
        JsonValue jsonValue = await JsonValue.ParseAsync(textReader);
        JsonSchema jsonSchema = new JsonSerializer().Deserialize<JsonSchema>(jsonValue);

        dataPathWithData = $"{VersionPrefix}/ttd/ttd-datamodels/Datamodels/UpdateDatamodel?modelName=../../0678";

        var serializer = new JsonSerializer();
        JsonValue toar = serializer.Serialize(jsonSchema);

        string requestBody = toar.ToString();
        HttpRequestMessage httpRequestMessagePut = new HttpRequestMessage(HttpMethod.Put, dataPathWithData)
        {
            Content = new StringContent(requestBody, Encoding.UTF8, "application/json")
        };

        // Act
        HttpResponseMessage responsePut = await HttpClient.Value.SendAsync(httpRequestMessagePut);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, responsePut.StatusCode);
        string responsestringPut = await responsePut.Content.ReadAsStringAsync();
        Assert.Equal("Invalid model name value.", responsestringPut);
    }
}
