using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Web;
using System.Xml;
using System.Xml.Schema;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Converter.Metadata;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Controllers.DataModelsController.Utils;
using Designer.Tests.Utils;
using FluentAssertions;
using Json.Schema;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class PutDatamodelTests : DatamodelsControllerTestsBase<PutDatamodelTests>
{
    private string TargetTestRepository { get; }
    private string CreatedTestRepoPath { get; set; }

    private const string MinimumValidJsonSchema = "{\"$schema\":\"https://json-schema.org/draft/2020-12/schema\",\"$id\":\"schema.json\",\"type\":\"object\",\"properties\":{\"root\":{\"$ref\":\"#/$defs/rootType\"}},\"$defs\":{\"rootType\":{\"properties\":{\"keyword\":{\"type\":\"string\"}}}}}";

    private const string OneOfAndPropertiesSchema =
        "{\"$schema\":\"https://json-schema.org/draft/2020-12/schema\",\"$id\":\"schema.json\",\"type\":\"object\",\"oneOf\":[{\"$ref\":\"#/$defs/otherType\"}],\"properties\":{\"root\":{\"$ref\":\"#/$defs/rootType\"}},\"$defs\":{\"rootType\":{\"properties\":{\"keyword\":{\"type\":\"string\"}}},\"otherType\":{\"properties\":{\"keyword\":{\"type\":\"string\"}}}}}";

    public PutDatamodelTests(WebApplicationFactory<DatamodelsController> factory) : base(factory)
    {
        TargetTestRepository = TestDataHelper.GenerateTestRepoName();
    }

    [Theory]
    [InlineData("testModel.schema.json", "ttd", "hvem-er-hvem", "testUser")]
    [InlineData("App/models/testModel.schema.json", "ttd", "hvem-er-hvem", "testUser")]
    [InlineData("/App/models/testModel.schema.json", "ttd", "hvem-er-hvem", "testUser")]
    [InlineData("App%2Fmodels%2FtestModel.schema.json", "ttd", "hvem-er-hvem", "testUser")]
    public async Task ValidInput_ShouldReturn_NoContent_And_Create_Files(string modelPath, string org, string repo, string user)
    {
        string url = $"{VersionPrefix(org, TargetTestRepository)}/datamodel?modelPath={modelPath}";
        string fileName = Path.GetFileName(HttpUtility.UrlDecode(modelPath));
        string modelName = fileName!.Remove(fileName.Length - ".schema.json".Length);

        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(org, repo, user, TargetTestRepository);

        using var request = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(MinimumValidJsonSchema, Encoding.UTF8, MediaTypeNames.Application.Json)
        };

        var response = await HttpClient.Value.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        await FilesWithCorrectNameAndContentShouldBeCreated(modelName);
    }

    [Theory]
    [InlineData("testModel.schema.json", OneOfAndPropertiesSchema, DatamodelingErrorCodes.JsonSchemaConvertError, "ttd", "hvem-er-hvem", "testUser")]
    public async Task ValidInput_ShouldReturn_NoContent_And_Create_Files2(string modelPath, string schema, string expectedErrorCode, string org, string repo, string user)
    {
        string url = $"{VersionPrefix(org, TargetTestRepository)}/datamodel?modelPath={modelPath}";
        CreatedTestRepoPath = await TestDataHelper.CopyRepositoryForTest(org, repo, user, TargetTestRepository);

        using var request = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(schema, Encoding.UTF8, MediaTypeNames.Application.Json)
        };

        var response = await HttpClient.Value.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.InternalServerError);
        var errorResponse = await response.Content.ReadAsAsync<ApiError>();
        errorResponse.ErrorCode.Should().Be(expectedErrorCode);
    }

    private async Task FilesWithCorrectNameAndContentShouldBeCreated(string modelName)
    {
        var location = Path.GetFullPath(Path.Combine(CreatedTestRepoPath, "App", "models"));
        var jsonSchemaLocation = Path.Combine(location, $"{modelName}.schema.json");
        var xsdSchemaLocation = Path.Combine(location, $"{modelName}.xsd");
        var metamodelLocation = Path.Combine(location, $"{modelName}.metadata.json");

        Assert.True(File.Exists(xsdSchemaLocation));
        Assert.True(File.Exists(metamodelLocation));
        Assert.True(File.Exists(jsonSchemaLocation));

        await VerifyXsdFileContent(xsdSchemaLocation);
        FileContentVerifier.VerifyJsonFileContent(jsonSchemaLocation, MinimumValidJsonSchema);
        VerifyMetadataContent(metamodelLocation);
    }

    private static async Task VerifyXsdFileContent(string path)
    {
        async Task<string> SerializeXml(XmlSchema schema)
        {
            await using var sw = new Utf8StringWriter();
            await using var xw = XmlWriter.Create(sw, new XmlWriterSettings { Indent = true, Async = true });
            schema.Write(xw);
            return sw.ToString();
        }

        var jsonSchema = JsonSchema.FromText(MinimumValidJsonSchema);
        var converter = new JsonSchemaToXmlSchemaConverter(new JsonSchemaNormalizer());
        var xsd = converter.Convert(jsonSchema);
        var xsdContent = await SerializeXml(xsd);
        VerifyFileContent(path, xsdContent);
    }

    private static void VerifyMetadataContent(string path)
    {
        var jsonSchemaConverterStrategy = JsonSchemaConverterStrategyFactory.SelectStrategy(JsonSchema.FromText(MinimumValidJsonSchema));
        var metamodelConverter = new JsonSchemaToMetamodelConverter(jsonSchemaConverterStrategy.GetAnalyzer());
        var modelMetadata = metamodelConverter.Convert(MinimumValidJsonSchema);
        FileContentVerifier.VerifyJsonFileContent(path, JsonSerializer.Serialize(modelMetadata));
    }

    private static void VerifyFileContent(string path, string expectedContent)
    {
        var fileContent = File.ReadAllText(path);
        expectedContent.Should().Be(fileContent);
    }
}
