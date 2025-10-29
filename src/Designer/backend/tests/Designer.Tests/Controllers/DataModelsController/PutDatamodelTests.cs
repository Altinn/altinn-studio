#nullable disable
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Web;
using System.Xml;
using System.Xml.Schema;
using Altinn.AccessManagement.Tests.Utils;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.DataModeling.Converter.Json;
using Altinn.Studio.DataModeling.Converter.Json.Strategy;
using Altinn.Studio.DataModeling.Converter.Metadata;
using Altinn.Studio.DataModeling.Json;
using Altinn.Studio.DataModeling.Validator.Json;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Controllers.DataModelsController.Utils;
using Designer.Tests.Utils;
using Json.Pointer;
using Json.Schema;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class PutDatamodelTests : DesignerEndpointsTestsBase<PutDatamodelTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/datamodels";
    private string TargetTestRepository { get; }

    private const string MinimumValidJsonSchema = "{\"$schema\":\"https://json-schema.org/draft/2020-12/schema\",\"$id\":\"schema.json\",\"type\":\"object\",\"properties\":{\"rootType\":{\"$ref\":\"#/$defs/rootType\"}},\"$defs\":{\"rootType\":{\"properties\":{\"keyword\":{\"type\":\"string\"}}}}}";

    private const string JsonSchemaThatWillNotCompile = "{\"$schema\":\"https://json-schema.org/draft/2020-12/schema\",\"$id\":\"schema.json\",\"type\":\"object\",\"properties\":{\"root\":{\"$ref\":\"#/$defs/rootType\"}},\"$defs\":{\"rootType\":{\"properties\":{\"keyword\":{\"type\":\"string\"}}}}}";

    public PutDatamodelTests(WebApplicationFactory<Program> factory) : base(factory)
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

        await CopyRepositoryForTest(org, repo, user, TargetTestRepository);

        using var request = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(MinimumValidJsonSchema, Encoding.UTF8, MediaTypeNames.Application.Json)
        };

        var response = await HttpClient.SendAsync(request);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        await FilesWithCorrectNameAndContentShouldBeCreated(modelName);
    }

    [Theory]
    [InlineData("testModel.schema.json", "ttd", "hvem-er-hvem", "testUser")]
    public async Task InvalidInput_ShouldReturn_BadRequest_And_CustomErrorMessages(string modelPath, string org, string repo, string user)
    {
        string url = $"{VersionPrefix(org, TargetTestRepository)}/datamodel?modelPath={modelPath}";

        await CopyRepositoryForTest(org, repo, user, TargetTestRepository);

        using var request = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(JsonSchemaThatWillNotCompile, Encoding.UTF8, MediaTypeNames.Application.Json)
        };

        var response = await HttpClient.SendAsync(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var problemDetailsJson = await response.Content.ReadAsStringAsync();
        var problemDetails = JsonSerializer.Deserialize<ProblemDetails>(problemDetailsJson);

        Assert.NotNull(problemDetails);
        Assert.Contains("customErrorMessages", problemDetails.Extensions.Keys);

        var customErrorMessages = problemDetails.Extensions["customErrorMessages"];
        Assert.NotNull(customErrorMessages);
        var customErrorMessagesElement = (JsonElement)customErrorMessages;
        var firstErrorMessage = customErrorMessagesElement.EnumerateArray().FirstOrDefault().GetString();
        Assert.Contains("'root': member names cannot be the same as their enclosing type", firstErrorMessage);
    }

    [Theory]
    [InlineData("testModel.schema.json", "ttd", "hvem-er-hvem", "testUser", "Model/JsonSchema/General/NonXsdContextSchema.json")]
    public async Task ValidSchema_ShouldReturn_NoContent_And_Create_Files(string modelPath, string org, string repo, string user, string schemaPath)
    {
        string url = $"{VersionPrefix(org, TargetTestRepository)}/datamodel?modelPath={modelPath}";
        await CopyRepositoryForTest(org, repo, user, TargetTestRepository);

        string schema = SharedResourcesHelper.LoadTestDataAsString(schemaPath);

        using var request = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(schema, Encoding.UTF8, MediaTypeNames.Application.Json)
        };

        var response = await HttpClient.SendAsync(request);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    [Theory(Skip = "Validator is excluded from put method for now.")]
    [MemberData(nameof(IncompatibleSchemasTestData))]
    public async Task IncompatibleSchema_ShouldReturn422(string modelPath, string schemaPath, string org, string repo, string user, params Tuple<string, string>[] expectedValidationIssues)
    {
        string url = $"{VersionPrefix(org, TargetTestRepository)}/datamodel?modelPath={modelPath}";
        await CopyRepositoryForTest(org, repo, user, TargetTestRepository);

        string schema = SharedResourcesHelper.LoadTestDataAsString(schemaPath);

        using var request = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(schema, Encoding.UTF8, MediaTypeNames.Application.Json)
        };

        var response = await HttpClient.SendAsync(request);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        string content = await response.Content.ReadAsStringAsync();

        var errorResponse = JsonSerializer.Deserialize<ValidationProblemDetails>(content, new JsonSerializerOptions()
        {
            PropertyNameCaseInsensitive = true
        });

        foreach ((string pointer, string errorCode) in expectedValidationIssues)
        {
            var pointerObject = JsonPointer.Parse(pointer);
            Assert.Single(errorResponse.Errors.Keys, p => JsonPointer.Parse(p) == pointerObject);
            Assert.Contains(errorCode, errorResponse.Errors[pointerObject.ToString(JsonPointerStyle.UriEncoded)]);
        }
    }

    [Theory]
    [InlineData("testmodelname", "ttd", "hvem-er-hvem")]
    public async Task PutDatamodelDataType_ShouldReturnWithoutErrors(string datamodelName, string org, string repo)
    {
        string url = $"{VersionPrefix(org, TargetTestRepository)}/datamodel/{datamodelName}/dataType";
        await CopyRepositoryForTest(org, repo, "testUser", TargetTestRepository);

        DataType dataType = new()
        {
            Id = datamodelName,
            MaxCount = 1,
            MinCount = 1,
        };
        using var putRequest = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = JsonContent.Create(dataType)
        };

        HttpResponseMessage response = await HttpClient.SendAsync(putRequest);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        DataType dataTypeResponse = await response.Content.ReadFromJsonAsync<DataType>();
        Assert.NotNull(dataTypeResponse);
        AssertionUtil.AssertEqualTo(dataType, dataTypeResponse);
    }

    [Theory]
    [InlineData("testmodelname", "ttd", "hvem-er-hvem")]
    public async Task PutDatamodelDataType_FailsIfDatamodelNameMismatchesObjectId(string datamodelName, string org, string repo)
    {
        string url = $"{VersionPrefix(org, TargetTestRepository)}/datamodel/{datamodelName}/dataType";
        await CopyRepositoryForTest(org, repo, "testUser", TargetTestRepository);

        DataType dataType = new()
        {
            Id = "wrongId",
            MaxCount = 1,
            MinCount = 1,
        };
        using var putRequest = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = JsonContent.Create(dataType)
        };

        HttpResponseMessage response = await HttpClient.SendAsync(putRequest);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }


    private async Task FilesWithCorrectNameAndContentShouldBeCreated(string modelName)
    {
        var location = Path.GetFullPath(Path.Combine(TestRepoPath, "App", "models"));
        var jsonSchemaLocation = Path.Combine(location, $"{modelName}.schema.json");
        var xsdSchemaLocation = Path.Combine(location, $"{modelName}.xsd");

        Assert.True(File.Exists(xsdSchemaLocation));
        Assert.True(File.Exists(jsonSchemaLocation));

        await VerifyXsdFileContent(xsdSchemaLocation);
        FileContentVerifier.VerifyJsonFileContent(jsonSchemaLocation, MinimumValidJsonSchema);
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
        Assert.Equal(expectedContent, fileContent);
    }

    public static IEnumerable<object[]> IncompatibleSchemasTestData => new List<object[]>
    {
        new object[]
        {
            "testModel.schema.json", "Model/JsonSchema/Incompatible/OneOfAndPropertiesSchema.json", "ttd", "hvem-er-hvem", "testUser",
            new Tuple<string,string>("#", JsonSchemaValidationErrorCodes.BothPropertiesAndCompositionSchema)
        },
        new object[]
        {
            "testModel.schema.json", "Model/JsonSchema/Incompatible/SchemaWithEmptyObjects.json", "ttd", "hvem-er-hvem", "testUser",
            new Tuple<string, string>("#/properties/emptyObjectField", JsonSchemaValidationErrorCodes.ObjectNodeWithoutProperties),
            new Tuple<string, string>("#/properties/emptyObjectArray/items", JsonSchemaValidationErrorCodes.ObjectNodeWithoutProperties),
            new Tuple<string, string>("#/properties/objectField/properties/emptySubobject", JsonSchemaValidationErrorCodes.ObjectNodeWithoutProperties),
            new Tuple<string, string>("#/$defs/emptyObjectType", JsonSchemaValidationErrorCodes.ObjectNodeWithoutProperties),
        },
        new object[]
        {
            "testModel.schema.json", "Model/JsonSchema/Incompatible/InvalidReferenceSchema.json", "ttd", "hvem-er-hvem", "testUser",
            new Tuple<string,string>("#/properties/property1", JsonSchemaValidationErrorCodes.InvalidReference)
        }
    };
}
