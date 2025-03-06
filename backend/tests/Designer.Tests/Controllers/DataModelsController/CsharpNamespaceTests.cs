using System;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Altinn.App.Core.Models;
using Altinn.Studio.DataModeling.Templates;
using Altinn.Studio.Designer.Filters;
using Altinn.Studio.Designer.Filters.DataModeling;
using Altinn.Studio.Designer.ViewModels.Request;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class CsharpNamespaceTests : DesignerEndpointsTestsBase<CsharpNamespaceTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/datamodels";

    public CsharpNamespaceTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("Model/XmlSchema/Gitea/aal-vedlegg.xsd", "ttd", "empty-app", "testUser", "App/models/aal-vedlegg.cs", "Altinn.App.Models.vedlegg", "vedlegg", "Altinn.App.Models")]
    [InlineData("Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.xsd", "ttd", "hvem-er-hvem", "testUser", "App/models/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.cs", "Altinn.App.Models", "HvemErHvem_M", "Altinn.App.Models.HvemErHvem_M")]
    public async Task Given_XsdUploaded_ShouldProduce_CorrectNamespace(string xsdPath, string org, string repo, string developer, string expectedModelPath, string expectedNamespace, string expectedTypeName, string notExpectedNamespace)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, repo, developer, targetRepository);
        string url = $"{VersionPrefix(org, targetRepository)}/upload";

        using var response = await UploadNewXsdSchema(xsdPath, url);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        // get the csharp model from repo
        string csharpModel = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, expectedModelPath);
        Assert.True(Regex.Match(csharpModel.ReplaceLineEndings("\n"), $"^namespace {expectedNamespace}$".Replace(".", "\\."),
            RegexOptions.Multiline).Success);

        string applicationMetadataContent = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/applicationmetadata.json");
        var applicationMetadata = JsonSerializer.Deserialize<ApplicationMetadata>(applicationMetadataContent, JsonSerializerOptions);

        Assert.Contains(applicationMetadata.DataTypes, x => x.AppLogic != null && x.AppLogic.ClassRef == $"{expectedNamespace}.{expectedTypeName}");
        Assert.DoesNotContain(applicationMetadata.DataTypes, x => x.AppLogic != null && x.AppLogic.ClassRef == $"{notExpectedNamespace}.{expectedTypeName}");
    }

    [Theory]
    [InlineData("Model/XmlSchema/Gitea/krt-3221-42265.xsd", "Model/XmlSchema/Gitea/krt-3221-45167.xsd", "ttd", "empty-app", "testUser", DataModelingErrorCodes.ModelWithTheSameTypeNameExists)]
    public async Task Given_XsdUploaded_NewUploadWith_Same_ModelName_ShouldReturnValidateError(string setupXsdPath, string xsdPath, string org, string repo,
        string developer, string expectedErrorCode)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, repo, developer, targetRepository);
        string url = $"{VersionPrefix(org, targetRepository)}/upload";

        using var setupResponse = await UploadNewXsdSchema(setupXsdPath, url);
        Assert.Equal(HttpStatusCode.Created, setupResponse.StatusCode);

        using var response = await UploadNewXsdSchema(xsdPath, url);
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);

        var problemDetails = JsonSerializer.Deserialize<ProblemDetails>(await response.Content.ReadAsStringAsync());

        Assert.NotNull(problemDetails);

        JsonElement errorCode = (JsonElement)problemDetails.Extensions[ProblemDetailsExtensionsCodes.ErrorCode];
        Assert.Equal(expectedErrorCode, errorCode.ToString());
    }

    [Theory]
    [InlineData("Model/XmlSchema/Gitea/krt-3221-42265.xsd", "ttd", "empty-app", "testUser")]
    public async Task Given_XsdUpload_When_ReUploaded_ShouldReturn_201(string xsdPath, string org, string repo, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, repo, developer, targetRepository);
        string url = $"{VersionPrefix(org, targetRepository)}/upload";

        using var setupResponse = await UploadNewXsdSchema(xsdPath, url);
        Assert.Equal(HttpStatusCode.Created, setupResponse.StatusCode);

        using var response = await UploadNewXsdSchema(xsdPath, url);
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }


    [Theory]
    [InlineData("App/models/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.schema.json", "ttd", "hvem-er-hvem", "testUser", "HvemErHvem_M", "App/models/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.cs", "Altinn.App.Models", "Altinn.App.Models.HvemErHvem_M")]
    [InlineData("App/models/newmodel.schema.json", "ttd", "empty-app", "testUser", "newmodel", "App/models/newmodel.cs", "Altinn.App.Models.newmodel", "Altinn.App.Models")]
    public async Task Given_JsonSchemaSent_ShouldProduce_CorrectNamespacePut(string modelPath, string org, string repo, string developer, string expectedModelName, string expectedModelPath, string expectedNamespace, string notExpectedNamespace)
    {
        string targetRepo = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, repo, developer, targetRepo);
        string url = $"{VersionPrefix(org, targetRepo)}/datamodel?modelPath={modelPath}";

        using var response = await GenerateModels(expectedModelName, url);
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        // get the csharp model from repo
        string csharpModel = TestDataHelper.GetFileFromRepo(org, targetRepo, developer, expectedModelPath);
        Assert.True(Regex.Match(csharpModel.ReplaceLineEndings("\n"), $"^namespace {expectedNamespace}$".Replace(".", "\\."),
            RegexOptions.Multiline).Success);

        string applicationMetadataContent = TestDataHelper.GetFileFromRepo(org, targetRepo, developer, "App/config/applicationmetadata.json");
        var applicationMetadata = JsonSerializer.Deserialize<ApplicationMetadata>(applicationMetadataContent, JsonSerializerOptions);

        Assert.Contains(applicationMetadata.DataTypes, x => x.AppLogic != null && x.AppLogic.ClassRef ==
            $"{expectedNamespace}.{expectedModelName}");

        Assert.DoesNotContain(applicationMetadata.DataTypes, x => x.AppLogic != null && x.AppLogic.ClassRef ==
            $"{notExpectedNamespace}.{expectedModelName}");

    }


    [Theory]
    [InlineData("Model/XmlSchema/Gitea/krt-3221-42265.xsd", "ttd", "empty-app", "testUser", "KRT1011_M", DataModelingErrorCodes.ModelWithTheSameTypeNameExists)]
    public async Task Given_RepoPreparedWithXsd_When_JsonSchemaCreated_WithSameModelName_ShouldReturn_422(
        string xsdPath, string org, string repo, string developer, string modelName, string expectedErrorCode)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, repo, developer, targetRepository);
        string url = $"{VersionPrefix(org, targetRepository)}/upload";

        using var setupResponse = await UploadNewXsdSchema(xsdPath, url);
        Assert.Equal(HttpStatusCode.Created, setupResponse.StatusCode);

        var response =
            await GenerateNewJsonSchema(modelName, $"{VersionPrefix(org, targetRepository)}/new");
        Assert.Equal(HttpStatusCode.UnprocessableEntity, response.StatusCode);

        var problemDetails = JsonSerializer.Deserialize<ProblemDetails>(await response.Content.ReadAsStringAsync());

        Assert.NotNull(problemDetails);

        JsonElement errorCode = (JsonElement)problemDetails.Extensions[ProblemDetailsExtensionsCodes.ErrorCode];
        Assert.Equal(expectedErrorCode, errorCode.ToString());
    }


    [Theory]
    [InlineData("ttd", "empty-app", "testUser", "App/models/initmodel.schema.json", "newmodel")]
    public async Task WhenClassRefIsChanged_ShouldUpdateApplicationMetadata(string org, string repos, string developer, string modelPath, string newModelName)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, repos, developer, targetRepository);

        string initModelName = Path.GetFileNameWithoutExtension(modelPath);
        initModelName = Path.GetFileNameWithoutExtension(initModelName);

        var newJsonSchemaResponse = await GenerateNewJsonSchema(initModelName, $"{VersionPrefix(org, targetRepository)}/new");
        Assert.Equal(HttpStatusCode.Created, newJsonSchemaResponse.StatusCode);

        var generateInitModelsResponse = await GenerateModels(initModelName, $"{VersionPrefix(org, targetRepository)}/datamodel?modelPath={modelPath}");
        Assert.Equal(HttpStatusCode.NoContent, generateInitModelsResponse.StatusCode);
        // Check classRef in application metadata
        string applicationMetadataContent = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/applicationmetadata.json");
        var applicationMetadata = JsonSerializer.Deserialize<ApplicationMetadata>(applicationMetadataContent, JsonSerializerOptions);
        Assert.Equal(applicationMetadata.DataTypes.Single(d => d.Id == initModelName).AppLogic.ClassRef, $"Altinn.App.Models.{initModelName}.{initModelName}");

        var generateNewModelsResponse = await GenerateModels(newModelName, $"{VersionPrefix(org, targetRepository)}/datamodel?modelPath={modelPath}");
        Assert.Equal(HttpStatusCode.NoContent, generateNewModelsResponse.StatusCode);

        // Check classRef in application metadata
        applicationMetadataContent = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/applicationmetadata.json");
        applicationMetadata = JsonSerializer.Deserialize<ApplicationMetadata>(applicationMetadataContent, JsonSerializerOptions);
        Assert.Equal(applicationMetadata.DataTypes.Single(d => d.Id == initModelName).AppLogic.ClassRef, $"Altinn.App.Models.{newModelName}.{newModelName}");
    }

    private async Task<HttpResponseMessage> UploadNewXsdSchema(string xsdPath, string url)
    {
        await using var fileStream = SharedResourcesHelper.LoadTestData(xsdPath);
        using var formData = new MultipartFormDataContent();
        using var streamContent = new StreamContent(fileStream);
        streamContent.Headers.ContentType = MediaTypeHeaderValue.Parse("multipart/form-data");
        formData.Add(streamContent, "file", Path.GetFileName(xsdPath));
        return await HttpClient.PostAsync(url, formData);
    }

    private async Task<HttpResponseMessage> GenerateModels(string modelName, string url)
    {
        string schema = new GeneralJsonTemplate(new Uri("http://altinn-testschema.json"), modelName).GetJsonString();
        using var content = new StringContent(schema, Encoding.UTF8, MediaTypeNames.Application.Json);
        return await HttpClient.PutAsync(url, content);
    }

    private async Task<HttpResponseMessage> GenerateNewJsonSchema(string modelName, string url)
    {
        CreateModelViewModel createModel = new()
        {
            ModelName = modelName,
            RelativeDirectory = "App/models",
            Altinn2Compatible = false
        };
        string schema = JsonSerializer.Serialize(createModel, JsonSerializerOptions);
        using var content = new StringContent(schema, Encoding.UTF8, MediaTypeNames.Application.Json);
        return await HttpClient.PostAsync(url, content);
    }

}
