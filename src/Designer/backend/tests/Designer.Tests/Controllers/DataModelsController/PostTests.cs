using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.DataModeling.Json.Keywords;
using Altinn.Studio.Designer.Models.App;
using Altinn.Studio.Designer.ViewModels.Request;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Json.Schema;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class PostTests : DesignerEndpointsTestsBase<PostTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/datamodels";

    private const string Org = "ttd";
    private const string Repo = "empty-app";
    private const string Developer = "testUser";

    public PostTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    [Theory]
    [InlineData("ServiceA", true, "empty-app", "ttd", "testUser")]
    [InlineData("", false, "xyz-datamodels", "ttd", "testUser")]
    [InlineData("relative/folder", false, "xyz-datamodels", "ttd", "testUser")]
    public async Task PostDatamodel_FromFormPost_ShouldReturnCreatedFromTemplate(
        string relativeDirectory,
        bool altinn2Compatible,
        string sourceRepository,
        string org,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        await CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
        string url = $"{VersionPrefix(org, targetRepository)}/new";

        var createViewModel = new CreateModelViewModel()
        {
            ModelName = "test",
            RelativeDirectory = relativeDirectory,
            Altinn2Compatible = altinn2Compatible,
        };

        using var postRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(
                createViewModel,
                null,
                new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
            ),
        };

        using var postResponse = await HttpClient.SendAsync(postRequestMessage);
        Assert.Equal(HttpStatusCode.Created, postResponse.StatusCode);

        Assert.Equal("application/json", postResponse.Content.Headers.ContentType.MediaType);

        string postContent = await postResponse.Content.ReadAsStringAsync();
        JsonSchema postJsonSchema = JsonSchemaKeywords.FromText(postContent);
        Assert.NotNull(postJsonSchema);

        // Try to read back the created schema to verify it's stored
        // at the location provided in the post response
        var location = postResponse.Headers.Location;
        using var getRequestMessage = new HttpRequestMessage(HttpMethod.Get, location);
        using var getResponse = await HttpClient.SendAsync(getRequestMessage);
        string getContent = await getResponse.Content.ReadAsStringAsync();
        var getJsonSchema = JsonSchemaKeywords.FromText(getContent);
        Assert.NotNull(getJsonSchema);
        Assert.Equal(postContent, getContent);
    }

    [Fact]
    public async Task PostDatamodel_CreateNew_ShouldAddDataTypeWithModelIdToAppMetadata()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        await CopyRepositoryForTest(Org, Repo, Developer, targetRepository);
        string url = $"{VersionPrefix(Org, targetRepository)}/new";

        string modelAndSchemaName = "modelAndSchemaName";
        var createViewModel = new CreateModelViewModel()
        {
            ModelName = modelAndSchemaName,
            RelativeDirectory = "",
            Altinn2Compatible = false,
        };

        using var postRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(
                createViewModel,
                null,
                new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
            ),
        };

        using var postResponse = await HttpClient.SendAsync(postRequestMessage);
        Assert.Equal(HttpStatusCode.Created, postResponse.StatusCode);

        var applicationMetadata = TestDataHelper.GetFileFromRepo(
            Org,
            targetRepository,
            Developer,
            "App/config/applicationmetadata.json"
        );
        ApplicationMetadata deserializedApplicationMetadata = JsonSerializer.Deserialize<ApplicationMetadata>(
            applicationMetadata,
            JsonSerializerOptions
        );
        Assert.True(deserializedApplicationMetadata.DataTypes.Exists(dataType => dataType.Id == modelAndSchemaName));
    }

    [Theory]
    [InlineData(8)]
    [InlineData(9)]
    public async Task PostDatamodel_CreateNew_DisablesLegacyPdfCreationOnlyForV8(int majorVersion)
    {
        const string modelName = "newModel";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(Org, Repo, Developer, targetRepository);
        await File.WriteAllTextAsync(
            Path.Combine(TestRepoPath, "App", "App.csproj"),
            $"""
            <Project Sdk="Microsoft.NET.Sdk">
              <ItemGroup><PackageReference Include="Altinn.App.Api" Version="{majorVersion}.0.0" /></ItemGroup>
            </Project>
            """
        );

        using var postResponse = await HttpClient.PostAsJsonAsync(
            $"{VersionPrefix(Org, targetRepository)}/new",
            new CreateModelViewModel { ModelName = modelName, RelativeDirectory = "" },
            new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
        );

        Assert.Equal(HttpStatusCode.Created, postResponse.StatusCode);
        using JsonDocument metadata = JsonDocument.Parse(
            TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, "App/config/applicationmetadata.json")
        );
        JsonElement dataType = metadata
            .RootElement.GetProperty("dataTypes")
            .EnumerateArray()
            .Single(type => type.GetProperty("id").GetString() == modelName);
        bool hasLegacyFlag = dataType.TryGetProperty("enablePdfCreation", out JsonElement legacyFlag);
        Assert.Equal(majorVersion == 8, hasLegacyFlag);
        if (hasLegacyFlag)
        {
            Assert.False(legacyFlag.GetBoolean());
        }
    }

    [Theory]
    [InlineData("", "ServiceA", true)]
    [InlineData("test<", "", false)]
    [InlineData("test>", "", false)]
    [InlineData("test|", "", false)]
    [InlineData("test\\\"", "", false)]
    [InlineData("test/", "", false)]
    public async Task PostDatamodel_InvalidFormPost_ShouldReturnBadRequest(
        string modelName,
        string relativeDirectory,
        bool altinn2Compatible
    )
    {
        string url = $"{VersionPrefix("xyz", "dummyrepo")}/new";

        var createViewModel = new CreateModelViewModel()
        {
            ModelName = modelName,
            RelativeDirectory = relativeDirectory,
            Altinn2Compatible = altinn2Compatible,
        };
        using var postRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(
                createViewModel,
                null,
                new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase }
            ),
        };

        var postResponse = await HttpClient.SendAsync(postRequestMessage);

        Assert.Equal(HttpStatusCode.BadRequest, postResponse.StatusCode);
    }
}
