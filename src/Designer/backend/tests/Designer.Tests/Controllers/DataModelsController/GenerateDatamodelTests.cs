using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Filters.DataModeling;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class GenerateDatamodelTests
    : DesignerEndpointsTestsBase<GenerateDatamodelTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    // The endpoint reads no repository, so this app does not exist.
    private const string GenerateUrl = "/designer/api/ttd/my-app/datamodels/datamodel/generate";

    private const string NewModelName = "model";

    // Like the data model in the app template.
    private const string NewModelJsonSchema = """
        {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "$id": "model.schema.json",
          "type": "object",
          "@xsdRootElement": "model",
          "properties": { "name": { "type": "string" }, "age": { "type": "integer" } },
          "required": ["name"]
        }
        """;

    // An existing data model of an older app, whose class is not in a namespace of its own.
    private const string ExistingModelName = "skjema";
    private const string ExistingModelClassRef = "Altinn.App.Models.Skjema";

    private const string ExistingModelJsonSchema = """
        {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "$id": "skjema.schema.json",
          "type": "object",
          "@xsdRootElement": "Skjema",
          "properties": { "navn": { "type": "string" } }
        }
        """;

    private const string AttachmentDataTypeId = "ref-data-as-pdf";

    private const string ApplicationMetadata = $$"""
        {
          "id": "ttd/my-app",
          "org": "ttd",
          "dataTypes": [
            { "id": "{{AttachmentDataTypeId}}", "allowedContentTypes": ["application/pdf"] },
            {
              "id": "{{ExistingModelName}}",
              "allowedContentTypes": ["application/xml"],
              "appLogic": { "autoCreate": true, "classRef": "{{ExistingModelClassRef}}" }
            }
          ]
        }
        """;

    private const string JsonSchemaThatWillNotCompile = """
        {
          "$schema": "https://json-schema.org/draft/2020-12/schema",
          "$id": "schema.json",
          "type": "object",
          "properties": { "root": { "$ref": "#/$defs/rootType" } },
          "$defs": { "rootType": { "properties": { "keyword": { "type": "string" } } } }
        }
        """;

    public GenerateDatamodelTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    [Fact]
    public async Task GenerateDatamodel_NewModel_ReturnsItsSchemaClassAndXsd()
    {
        using HttpResponseMessage response = await PostGenerate(NewModelName, NewModelJsonSchema);

        GeneratedDatamodel generatedDatamodel = await ReadGeneratedDatamodel(response);
        Assert.True(
            JsonNode.DeepEquals(JsonNode.Parse(NewModelJsonSchema), JsonNode.Parse(generatedDatamodel.JsonSchema))
        );
        Assert.Contains("namespace Altinn.App.Models.model", generatedDatamodel.CsharpClasses);
        Assert.Contains("[XmlRoot(ElementName=\"model\")]", generatedDatamodel.CsharpClasses);
        Assert.Contains("public class model", generatedDatamodel.CsharpClasses);
        Assert.Contains("<xs:element name=\"model\"", generatedDatamodel.Xsd);
    }

    [Fact]
    public async Task GenerateDatamodel_NewModel_AddsItsDataTypeWithItsClass()
    {
        using HttpResponseMessage response = await PostGenerate(NewModelName, NewModelJsonSchema);

        JsonNode dataType = FindDataType(await ReadGeneratedDatamodel(response), NewModelName);
        Assert.Equal("Altinn.App.Models.model.model", dataType?["appLogic"]?["classRef"]?.GetValue<string>());
        Assert.Equal("application/xml", dataType?["allowedContentTypes"]?[0]?.GetValue<string>());
    }

    [Theory]
    [InlineData(true, "#nullable enable")]
    [InlineData(false, "#nullable disable")]
    public async Task GenerateDatamodel_UseNullableReferenceTypes_SetsTheNullableContextOfTheClass(
        bool useNullableReferenceTypes,
        string expectedDirective
    )
    {
        using HttpResponseMessage response = await PostGenerate(
            NewModelName,
            NewModelJsonSchema,
            useNullableReferenceTypes: useNullableReferenceTypes
        );

        Assert.Contains(expectedDirective, (await ReadGeneratedDatamodel(response)).CsharpClasses);
    }

    [Theory]
    [InlineData(false, false)]
    [InlineData(true, null)]
    public async Task GenerateDatamodel_NewModel_TurnsOffPdfCreationOnlyBeforeV9(
        bool isV9OrNewer,
        bool? expectedEnablePdfCreation
    )
    {
        using HttpResponseMessage response = await PostGenerate(
            NewModelName,
            NewModelJsonSchema,
            isV9OrNewer: isV9OrNewer
        );

        JsonNode dataType = FindDataType(await ReadGeneratedDatamodel(response), NewModelName);
        Assert.Equal(expectedEnablePdfCreation, dataType?["enablePdfCreation"]?.GetValue<bool>());
    }

    [Fact]
    public async Task GenerateDatamodel_ExistingModelOutsideANamespaceOfItsOwn_KeepsItsClass()
    {
        using HttpResponseMessage response = await PostGenerate(ExistingModelName, ExistingModelJsonSchema);

        GeneratedDatamodel generatedDatamodel = await ReadGeneratedDatamodel(response);
        Assert.Contains("namespace Altinn.App.Models\n", generatedDatamodel.CsharpClasses.ReplaceLineEndings("\n"));
        Assert.Contains("public class Skjema", generatedDatamodel.CsharpClasses);
        JsonNode dataType = FindDataType(generatedDatamodel, ExistingModelName);
        Assert.Equal(ExistingModelClassRef, dataType?["appLogic"]?["classRef"]?.GetValue<string>());
    }

    [Fact]
    public async Task GenerateDatamodel_RootThatRefersToAType_NamesTheClassAfterTheType()
    {
        const string jsonSchema = """
            {
              "$schema": "https://json-schema.org/draft/2020-12/schema",
              "$id": "soknad.schema.json",
              "type": "object",
              "@xsdRootElement": "melding",
              "oneOf": [{ "$ref": "#/$defs/Soknad" }],
              "$defs": { "Soknad": { "type": "object", "properties": { "navn": { "type": "string" } } } }
            }
            """;

        using HttpResponseMessage response = await PostGenerate("soknad", jsonSchema);

        GeneratedDatamodel generatedDatamodel = await ReadGeneratedDatamodel(response);
        Assert.Contains("[XmlRoot(ElementName=\"melding\")]", generatedDatamodel.CsharpClasses);
        Assert.Contains("public class Soknad", generatedDatamodel.CsharpClasses);
        JsonNode dataType = FindDataType(generatedDatamodel, "soknad");
        Assert.Equal("Altinn.App.Models.Soknad.Soknad", dataType?["appLogic"]?["classRef"]?.GetValue<string>());
    }

    [Fact]
    public async Task GenerateDatamodel_NewModelWithTheClassOfAnotherDataType_ReturnsUnprocessableEntity()
    {
        // The root element of the existing data model gives the new data model the same class.
        using HttpResponseMessage response = await PostGenerate("kunde", ExistingModelJsonSchema);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal(DataModelingErrorCodes.ModelWithTheSameTypeNameExists, await ReadErrorCode(response));
    }

    [Theory]
    [InlineData(AttachmentDataTypeId)]
    [InlineData("SKJEMA")]
    public async Task GenerateDatamodel_NewModelWithTheNameOfAnotherDataType_ReturnsUnprocessableEntity(
        string modelName
    )
    {
        using HttpResponseMessage response = await PostGenerate(modelName, NewModelJsonSchema);

        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);
        Assert.Equal(DataModelingErrorCodes.DataTypeWithTheSameNameExists, await ReadErrorCode(response));
    }

    [Fact]
    public async Task GenerateDatamodel_ApplicationMetadataWithoutDataTypes_AddsTheDataType()
    {
        JsonObject applicationMetadata = JsonNode.Parse(ApplicationMetadata).AsObject();
        applicationMetadata.Remove("dataTypes");

        using HttpResponseMessage response = await PostGenerate(
            NewModelName,
            NewModelJsonSchema,
            applicationMetadata: applicationMetadata
        );

        GeneratedDatamodel generatedDatamodel = await ReadGeneratedDatamodel(response);
        JsonArray dataTypes = JsonNode.Parse(generatedDatamodel.ApplicationMetadata)?["dataTypes"]?.AsArray();
        Assert.NotNull(dataTypes);
        JsonNode dataType = Assert.Single(dataTypes);
        Assert.Equal(NewModelName, dataType?["id"]?.GetValue<string>());
    }

    [Fact]
    public async Task GenerateDatamodel_ApiKeyCaller_ReturnsTheGeneratedFiles()
    {
        using HttpClient apiKeyClient = CreateTestClientWithAuthHandler<ApiKeyTestAuthHandler>();

        using HttpResponseMessage response = await PostGenerate(NewModelName, NewModelJsonSchema, client: apiKeyClient);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GenerateDatamodel_SignedInCallerWithoutAntiforgeryToken_IsRejected()
    {
        using HttpClient clientWithoutAntiforgeryToken = CreateTestClientWithAuthHandler<TestAuthHandler>();

        using HttpResponseMessage response = await PostGenerate(
            NewModelName,
            NewModelJsonSchema,
            client: clientWithoutAntiforgeryToken
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GenerateDatamodel_SchemaThatWillNotCompile_ReturnsBadRequestWithTheCompilerErrors()
    {
        using HttpResponseMessage response = await PostGenerate("testModel", JsonSchemaThatWillNotCompile);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        ProblemDetails problemDetails = JsonSerializer.Deserialize<ProblemDetails>(
            await response.Content.ReadAsStringAsync()
        );
        Assert.NotNull(problemDetails);
        Assert.Contains("customErrorMessages", problemDetails.Extensions.Keys);
    }

    private Task<HttpResponseMessage> PostGenerate(
        string modelName,
        string jsonSchema,
        bool useNullableReferenceTypes = false,
        bool isV9OrNewer = false,
        HttpClient client = null,
        JsonNode applicationMetadata = null
    ) =>
        (client ?? HttpClient).PostAsJsonAsync(
            GenerateUrl,
            new
            {
                modelName,
                schema = JsonNode.Parse(jsonSchema),
                applicationMetadata = applicationMetadata ?? JsonNode.Parse(ApplicationMetadata),
                useNullableReferenceTypes,
                isV9OrNewer,
            },
            JsonSerializerOptions
        );

    private async Task<GeneratedDatamodel> ReadGeneratedDatamodel(HttpResponseMessage response)
    {
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        GeneratedDatamodel generatedDatamodel = await response.Content.ReadFromJsonAsync<GeneratedDatamodel>(
            JsonSerializerOptions
        );
        Assert.NotNull(generatedDatamodel);
        return generatedDatamodel;
    }

    private static JsonNode FindDataType(GeneratedDatamodel generatedDatamodel, string dataTypeId) =>
        JsonNode
            .Parse(generatedDatamodel.ApplicationMetadata)
            ?["dataTypes"]?.AsArray()
            .SingleOrDefault(dataType => dataType?["id"]?.GetValue<string>() == dataTypeId);

    private static async Task<string> ReadErrorCode(HttpResponseMessage response)
    {
        ProblemDetails problemDetails = JsonSerializer.Deserialize<ProblemDetails>(
            await response.Content.ReadAsStringAsync()
        );
        Assert.NotNull(problemDetails);
        return ((JsonElement)problemDetails.Extensions[ProblemDetailsExtensionsCodes.ErrorCode]).ToString();
    }
}
