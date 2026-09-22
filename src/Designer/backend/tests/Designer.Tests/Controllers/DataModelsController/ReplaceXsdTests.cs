using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using System.Xml.Linq;
using Altinn.Platform.Storage.Interface.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class ReplaceXsdTests
    : DesignerEndpointsTestsBase<ReplaceXsdTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string ModelName = "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES";
    private const string UploadedFileName = "AnotherModelName.xsd";

    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/datamodels";

    public ReplaceXsdTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    [Theory]
    [InlineData("ttd", "hvem-er-hvem", "testUser")]
    public async Task ReplaceXsd_ShouldReplaceModelFiles_AndKeepModelName(
        string org,
        string sourceRepository,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);

        string uploadedXsd = SharedResourcesHelper.LoadTestDataAsString("Seres/HvemErHvem_Simple.xsd");
        var response = await SendReplaceXsdRequest(org, targetRepository, $"App/models/{ModelName}.schema.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string xsdFromRepo = TestDataHelper.GetFileFromRepo(
            org,
            targetRepository,
            developer,
            $"App/models/{ModelName}.xsd"
        );
        XDocument expectedXsd = XDocument.Parse(uploadedXsd, LoadOptions.PreserveWhitespace);
        GetRootElement(expectedXsd).SetAttributeValue("name", ModelName);
        Assert.True(
            XNode.DeepEquals(expectedXsd, XDocument.Parse(xsdFromRepo, LoadOptions.PreserveWhitespace)),
            "The stored XSD should be the uploaded one with the root element renamed"
        );
        Assert.False(
            TestDataHelper.FileExistsInRepo(org, targetRepository, developer, $"App/models/{UploadedFileName}")
        );
    }

    [Theory]
    [InlineData("ttd", "hvem-er-hvem", "testUser")]
    public async Task ReplaceXsd_ShouldSetRootElementToModelName(string org, string sourceRepository, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);

        var response = await SendReplaceXsdRequest(org, targetRepository, $"App/models/{ModelName}.schema.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        JsonNode jsonSchema = JsonNode.Parse(
            TestDataHelper.GetFileFromRepo(org, targetRepository, developer, $"App/models/{ModelName}.schema.json")
        );
        Assert.Equal(ModelName, jsonSchema!["@xsdRootElement"]!.GetValue<string>());

        XDocument xsd = XDocument.Parse(
            TestDataHelper.GetFileFromRepo(org, targetRepository, developer, $"App/models/{ModelName}.xsd")
        );
        Assert.Equal(ModelName, GetRootElement(xsd).Attribute("name")!.Value);
    }

    [Theory]
    [InlineData("ttd", "hvem-er-hvem", "testUser")]
    public async Task ReplaceXsd_ShouldKeepDataTypeInApplicationMetadata(
        string org,
        string sourceRepository,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);

        var response = await SendReplaceXsdRequest(org, targetRepository, $"App/models/{ModelName}.schema.json");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        Application applicationMetadata = JsonSerializer.Deserialize<Application>(
            TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/applicationmetadata.json"),
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );
        Assert.Equal(2, applicationMetadata.DataTypes.Count);
        DataType dataType = applicationMetadata.DataTypes.Single(dataType => dataType.Id == ModelName);
        Assert.Equal("Task_1", dataType.TaskId);
        Assert.Equal("Altinn.App.Models.HvemErHvem_M", dataType.AppLogic.ClassRef);
    }

    [Theory]
    [InlineData("ttd", "hvem-er-hvem", "testUser")]
    public async Task ReplaceXsd_WithoutModelPath_ShouldReturnBadRequest(
        string org,
        string sourceRepository,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);

        var response = await SendReplaceXsdRequest(org, targetRepository, string.Empty);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private static XElement GetRootElement(XDocument xsd) =>
        Assert.Single(xsd.Root!.Elements(XNamespace.Get("http://www.w3.org/2001/XMLSchema") + "element"));

    private async Task<HttpResponseMessage> SendReplaceXsdRequest(string org, string repository, string modelPath)
    {
        string url = $"{VersionPrefix(org, repository)}/datamodel/xsd?modelPath={modelPath}";

        var streamContent = new StreamContent(SharedResourcesHelper.LoadTestData("Seres/HvemErHvem_Simple.xsd"));
        streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("multipart/form-data");
        var formData = new MultipartFormDataContent { { streamContent, "file", UploadedFileName } };

        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Put, url) { Content = formData };

        return await HttpClient.SendAsync(httpRequestMessage);
    }
}
