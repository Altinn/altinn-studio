﻿using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
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
using Altinn.Studio.DataModeling.Validator.Json;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Controllers.DataModelsController.Utils;
using Designer.Tests.Utils;
using FluentAssertions;
using Json.Pointer;
using Json.Schema;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class PutDatamodelTests : DisagnerEndpointsTestsBase<PutDatamodelTests>, IClassFixture<WebApplicationFactory<Program>>
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
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
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
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var problemDetailsJson = await response.Content.ReadAsStringAsync();
        var problemDetails = JsonSerializer.Deserialize<ProblemDetails>(problemDetailsJson);

        problemDetails.Should().NotBeNull();
        problemDetails.Extensions.Should().ContainKey("customErrorMessages");

        var customErrorMessages = problemDetails.Extensions["customErrorMessages"];
        customErrorMessages.Should().NotBeNull();
        var customErrorMessagesElement = (JsonElement)customErrorMessages;
        var firstErrorMessage = customErrorMessagesElement.EnumerateArray().FirstOrDefault().GetString();
        firstErrorMessage.Should().Contain("'root': member names cannot be the same as their enclosing type");
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
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
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
        response.StatusCode.Should().Be(HttpStatusCode.UnprocessableEntity);
        string content = await response.Content.ReadAsStringAsync();

        var errorResponse = JsonSerializer.Deserialize<ValidationProblemDetails>(content, new JsonSerializerOptions()
        {
            PropertyNameCaseInsensitive = true
        });

        foreach ((string pointer, string errorCode) in expectedValidationIssues)
        {
            var pointerObject = JsonPointer.Parse(pointer);
            Assert.Single(errorResponse.Errors.Keys.Where(p => JsonPointer.Parse(p) == pointerObject));
            errorResponse.Errors[pointerObject.ToString(JsonPointerStyle.UriEncoded)].Contains(errorCode).Should().BeTrue();
        }
    }

    private async Task FilesWithCorrectNameAndContentShouldBeCreated(string modelName)
    {
        var location = Path.GetFullPath(Path.Combine(TestRepoPath, "App", "models"));
        var jsonSchemaLocation = Path.Combine(location, $"{modelName}.schema.json");
        var xsdSchemaLocation = Path.Combine(location, $"{modelName}.xsd");
        var metamodelLocation = Path.Combine(location, $"{modelName}.metadata.json");

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
        expectedContent.Should().Be(fileContent);
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
