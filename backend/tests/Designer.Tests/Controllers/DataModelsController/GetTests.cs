using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class GetTests : DesignerEndpointsTestsBase<GetTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/datamodels";
    public GetTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("App/models/HvemErHvem_SERES.schema.json", "ttd", "hvem-er-hvem")]
    [InlineData("App%2Fmodels%2FHvemErHvem_SERES.schema.json", "ttd", "hvem-er-hvem")]
    public async Task GetDatamodel_ValidPath_ShouldReturnContent(string modelPath, string org, string repo)
    {
        string url = $"{VersionPrefix(org, repo)}/datamodel?modelPath={modelPath}";
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        using var response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData("Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES", "ttd", "hvem-er-hvem")]
    public async Task GetDatamodelDataType_ShouldReturnContent(string modelName, string org, string repo)
    {
        string url = $"{VersionPrefix(org, repo)}/datamodel/{modelName}/dataType";
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        DataType dataTypeResponse = await response.Content.ReadFromJsonAsync<DataType>();
        Assert.NotNull(dataTypeResponse);
        Assert.True(JsonUtils.DeepEquals(JsonSerializer.Serialize(dataTypeResponse, JsonSerializerOptions),
            JsonSerializer.Serialize(new DataType
            {
                Id = "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES",
                AllowedContentTypes = new List<string> { "application/xml" },
                AppLogic = new ApplicationLogic
                {
                    AutoCreate = true,
                    ClassRef = "Altinn.App.Models.HvemErHvem_M"
                },
                TaskId = "Task_1",
                MaxCount = 1,
                MinCount = 1
            }, JsonSerializerOptions)
            ));
    }

    [Theory]
    [InlineData("notfound", "ttd", "hvem-er-hvem")]
    public async Task GetDatamodelDataType_ShouldNullWhenNotFound(string modelName, string org, string repo)
    {
        string url = $"{VersionPrefix(org, repo)}/datamodel/{modelName}/dataType";
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Get, url);

        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("null", await response.Content.ReadAsStringAsync());
    }
}
