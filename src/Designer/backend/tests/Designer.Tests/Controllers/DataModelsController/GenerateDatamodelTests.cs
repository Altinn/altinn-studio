using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class GenerateDatamodelTests
    : DesignerEndpointsTestsBase<GenerateDatamodelTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string Repo = "hvem-er-hvem";
    private const string Developer = "testUser";
    private const string NewModelName = "model";

    // The data type of this model has the class reference Altinn.App.Models.HvemErHvem_M, without a
    // namespace of its own.
    private const string ExistingModelName = "Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES";

    // A model from the repository, with types under definitions.
    private const string ModelWithTypesName = "HvemErHvem_InternalTypes";

    // The shape of the data model in the app template.
    private const string NewModelJsonSchema =
        "{\"$schema\":\"https://json-schema.org/draft/2020-12/schema\",\"$id\":\"model.schema.json\",\"type\":\"object\",\"@xsdRootElement\":\"model\",\"properties\":{\"name\":{\"type\":\"string\"},\"age\":{\"type\":\"integer\"}},\"required\":[\"name\"]}";

    private const string ExistingModelJsonSchema =
        "{\"$schema\":\"https://json-schema.org/draft/2020-12/schema\",\"$id\":\"schema.json\",\"type\":\"object\",\"@xsdRootElement\":\"HvemErHvem_M\",\"properties\":{\"navn\":{\"type\":\"string\"}}}";

    private const string JsonSchemaThatWillNotCompile =
        "{\"$schema\":\"https://json-schema.org/draft/2020-12/schema\",\"$id\":\"schema.json\",\"type\":\"object\",\"properties\":{\"root\":{\"$ref\":\"#/$defs/rootType\"}},\"$defs\":{\"rootType\":{\"properties\":{\"keyword\":{\"type\":\"string\"}}}}}";

    private string TargetTestRepository { get; }

    public GenerateDatamodelTests(WebApplicationFactory<Program> factory)
        : base(factory)
    {
        TargetTestRepository = TestDataHelper.GenerateTestRepoName();
    }

    private string GenerateUrl => $"/designer/api/{Org}/{TargetTestRepository}/datamodels/datamodel/generate";

    [Theory]
    [InlineData(ExistingModelName, false, false)]
    [InlineData(ModelWithTypesName, false, false)]
    [InlineData(NewModelName, false, false)]
    [InlineData(NewModelName, true, true)]
    public async Task GenerateDatamodel_ReturnsTheFilesThatSavingTheDatamodelWrites(
        string modelName,
        bool useNullableReferenceTypes,
        bool isV9OrNewer
    )
    {
        await CopyRepositoryForTest(Org, Repo, Developer, TargetTestRepository);
        WriteAppSettings(useNullableReferenceTypes, isV9OrNewer);
        string modelPath = $"App/models/{modelName}.schema.json";
        string jsonSchema = modelName switch
        {
            NewModelName => NewModelJsonSchema,
            ExistingModelName => ExistingModelJsonSchema,
            _ => ReadFileFromTestRepository(modelPath),
        };

        using HttpResponseMessage generateResponse = await HttpClient.PostAsJsonAsync(
            GenerateUrl,
            CreateRequest(modelName, jsonSchema, useNullableReferenceTypes, isV9OrNewer),
            JsonSerializerOptions
        );
        Assert.Equal(HttpStatusCode.OK, generateResponse.StatusCode);
        GeneratedDatamodel generatedDatamodel = await generateResponse.Content.ReadFromJsonAsync<GeneratedDatamodel>(
            JsonSerializerOptions
        );

        using var saveRequest = new HttpRequestMessage(
            HttpMethod.Put,
            $"/designer/api/{Org}/{TargetTestRepository}/datamodels/datamodel?modelPath={modelPath}"
        )
        {
            Content = new StringContent(jsonSchema, Encoding.UTF8, MediaTypeNames.Application.Json),
        };
        using HttpResponseMessage saveResponse = await HttpClient.SendAsync(saveRequest);
        Assert.Equal(HttpStatusCode.NoContent, saveResponse.StatusCode);

        Assert.NotNull(generatedDatamodel);
        Assert.Equal(ReadFileFromTestRepository(modelPath), generatedDatamodel.JsonSchema);
        Assert.Equal(ReadFileFromTestRepository($"App/models/{modelName}.cs"), generatedDatamodel.CsharpClasses);
        Assert.Equal(ReadFileFromTestRepository($"App/models/{modelName}.xsd"), generatedDatamodel.Xsd);
        Assert.Equal(
            ReadFileFromTestRepository("App/config/applicationmetadata.json"),
            generatedDatamodel.ApplicationMetadata
        );
    }

    [Fact]
    public async Task GenerateDatamodel_NewModel_AddsItsDataTypeInItsOwnNamespace()
    {
        await CopyRepositoryForTest(Org, Repo, Developer, TargetTestRepository);

        using HttpResponseMessage response = await HttpClient.PostAsJsonAsync(
            GenerateUrl,
            CreateRequest(NewModelName, NewModelJsonSchema, true, true),
            JsonSerializerOptions
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        GeneratedDatamodel generatedDatamodel = await response.Content.ReadFromJsonAsync<GeneratedDatamodel>(
            JsonSerializerOptions
        );
        Assert.NotNull(generatedDatamodel);
        Assert.Contains("namespace Altinn.App.Models.model", generatedDatamodel.CsharpClasses);
        Assert.Contains("#nullable enable", generatedDatamodel.CsharpClasses);
        JsonNode newDataType = JsonNode
            .Parse(generatedDatamodel.ApplicationMetadata)
            ?["dataTypes"]?.AsArray()
            .SingleOrDefault(dataType => dataType?["id"]?.GetValue<string>() == NewModelName);
        Assert.Equal("Altinn.App.Models.model.model", newDataType?["appLogic"]?["classRef"]?.GetValue<string>());
    }

    [Fact]
    public async Task GenerateDatamodel_ApiKeyCaller_ReturnsTheGeneratedFiles()
    {
        await CopyRepositoryForTest(Org, Repo, Developer, TargetTestRepository);
        using HttpClient apiKeyClient = CreateTestClientWithAuthHandler<ApiKeyTestAuthHandler>();

        using HttpResponseMessage response = await apiKeyClient.PostAsJsonAsync(
            GenerateUrl,
            CreateRequest(NewModelName, NewModelJsonSchema, false, false),
            JsonSerializerOptions
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GenerateDatamodel_SignedInCallerWithoutAntiforgeryToken_IsRejected()
    {
        await CopyRepositoryForTest(Org, Repo, Developer, TargetTestRepository);
        using HttpClient clientWithoutAntiforgeryToken = CreateTestClientWithAuthHandler<TestAuthHandler>();

        using HttpResponseMessage response = await clientWithoutAntiforgeryToken.PostAsJsonAsync(
            GenerateUrl,
            CreateRequest(NewModelName, NewModelJsonSchema, false, false),
            JsonSerializerOptions
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task GenerateDatamodel_SchemaThatWillNotCompile_ReturnsBadRequestWithTheCompilerErrors()
    {
        await CopyRepositoryForTest(Org, Repo, Developer, TargetTestRepository);

        using HttpResponseMessage response = await HttpClient.PostAsJsonAsync(
            GenerateUrl,
            CreateRequest("testModel", JsonSchemaThatWillNotCompile, false, false),
            JsonSerializerOptions
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        ProblemDetails problemDetails = JsonSerializer.Deserialize<ProblemDetails>(
            await response.Content.ReadAsStringAsync()
        );
        Assert.NotNull(problemDetails);
        Assert.Contains("customErrorMessages", problemDetails.Extensions.Keys);
    }

    private object CreateRequest(
        string modelName,
        string jsonSchema,
        bool useNullableReferenceTypes,
        bool isV9OrNewer
    ) =>
        new
        {
            modelName,
            schema = JsonNode.Parse(jsonSchema),
            applicationMetadata = JsonNode.Parse(ReadFileFromTestRepository("App/config/applicationmetadata.json")),
            useNullableReferenceTypes,
            isV9OrNewer,
        };

    private void WriteAppSettings(bool useNullableReferenceTypes, bool isV9OrNewer)
    {
        string appLibVersion = isV9OrNewer ? "9.0.0" : "8.0.0";
        Directory.CreateDirectory(Path.Combine(TestRepoPath, ".altinnstudio"));
        File.WriteAllText(
            Path.Combine(TestRepoPath, ".altinnstudio", "settings.json"),
            $"{{\"repoType\":\"App\",\"useNullableReferenceTypes\":{(useNullableReferenceTypes ? "true" : "false")}}}"
        );
        File.WriteAllText(
            Path.Combine(TestRepoPath, "App", "App.csproj"),
            $"<Project Sdk=\"Microsoft.NET.Sdk.Web\"><ItemGroup><PackageReference Include=\"Altinn.App.Api\" Version=\"{appLibVersion}\" /></ItemGroup></Project>"
        );
    }

    private string ReadFileFromTestRepository(string relativePath) =>
        TestDataHelper.GetFileFromRepo(Org, TargetTestRepository, Developer, relativePath);
}
