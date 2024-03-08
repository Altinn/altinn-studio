using System;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.App.Core.Models;
using Altinn.Studio.DataModeling.Templates;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class PutDatamodel_CsharpNamespaceTests : DisagnerEndpointsTestsBase<PutDatamodel_CsharpNamespaceTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/datamodels";

    public PutDatamodel_CsharpNamespaceTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("App/models/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.schema.json", "ttd", "hvem-er-hvem", "testUser", "HvemErHvem_M", "App/models/Kursdomene_HvemErHvem_M_2021-04-08_5742_34627_SERES.cs", "Altinn.App.Models", "Altinn.App.Models.HvemErHvem_M")]
    [InlineData("App/models/newmodel.schema.json", "ttd", "empty-app", "testUser", "newmodel", "App/models/newmodel.cs", "Altinn.App.Models.newmodel", "Altinn.App.Models")]
    public async Task GivenApp_ShouldProduce_CorrectNamespace(string modelPath, string org, string repo, string developer, string expectedModelName, string expectedModelPath, string expectedNamespace, string notExpectedNamespace)
    {
        string targetRepo = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, repo, developer, targetRepo);
        string url = $"{VersionPrefix(org, targetRepo)}/datamodel?modelPath={modelPath}";

        string schema = new GeneralJsonTemplate(new Uri("http://altinn-testschema.json"), expectedModelName).GetJsonString();

        using var request = new HttpRequestMessage(HttpMethod.Put, url)
        {
            Content = new StringContent(schema, Encoding.UTF8, MediaTypeNames.Application.Json)
        };

        using var response = await HttpClient.SendAsync(request);
        response.StatusCode.Should().Be(HttpStatusCode.NoContent);
        // get the csharp model from repo
        string csharpModel = TestDataHelper.GetFileFromRepo(org, targetRepo, developer, expectedModelPath);
        csharpModel.Should().Contain($"namespace {expectedNamespace}{Environment.NewLine}{{");

        string applicationMetadataContent = TestDataHelper.GetFileFromRepo(org, targetRepo, developer, "App/config/applicationmetadata.json");
        var applicationMetadata = JsonSerializer.Deserialize<ApplicationMetadata>(applicationMetadataContent, JsonSerializerOptions);

        applicationMetadata.DataTypes.Should().Contain(x => x.AppLogic != null && x.AppLogic.ClassRef ==
            $"{expectedNamespace}.{expectedModelName}");

        applicationMetadata.DataTypes.Should().NotContain(x => x.AppLogic != null && x.AppLogic.ClassRef ==
            $"{notExpectedNamespace}.{expectedModelName}");
    }
}
