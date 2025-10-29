#nullable disable
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
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
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/datamodels";
    private const string Org = "ttd";
    private const string Repo = "empty-app";
    private const string Developer = "testUser";

    public PostTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("ServiceA", true, "empty-app", "ttd", "testUser")]
    [InlineData("", false, "xyz-datamodels", "ttd", "testUser")]
    [InlineData("relative/folder", false, "xyz-datamodels", "ttd", "testUser")]
    public async Task PostDatamodel_FromFormPost_ShouldReturnCreatedFromTemplate(string relativeDirectory, bool altinn2Compatible, string sourceRepository, string org, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        await CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
        string url = $"{VersionPrefix(org, targetRepository)}/new";

        var createViewModel = new CreateModelViewModel()
        { ModelName = "test", RelativeDirectory = relativeDirectory, Altinn2Compatible = altinn2Compatible };

        using var postRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(createViewModel, null, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
        };

        using var postResponse = await HttpClient.SendAsync(postRequestMessage);
        Assert.Equal(HttpStatusCode.Created, postResponse.StatusCode);

        Assert.Equal("application/json", postResponse.Content.Headers.ContentType.MediaType);

        string postContent = await postResponse.Content.ReadAsStringAsync();
        JsonSchema postJsonSchema = JsonSchema.FromText(postContent);
        Assert.NotNull(postJsonSchema);

        // Try to read back the created schema to verify it's stored
        // at the location provided in the post response
        var location = postResponse.Headers.Location;
        using var getRequestMessage = new HttpRequestMessage(HttpMethod.Get, location);
        using var getResponse = await HttpClient.SendAsync(getRequestMessage);
        string getContent = await getResponse.Content.ReadAsStringAsync();
        var getJsonSchema = JsonSchema.FromText(getContent);
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
        { ModelName = modelAndSchemaName, RelativeDirectory = "", Altinn2Compatible = false };

        using var postRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(createViewModel, null, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
        };

        using var postResponse = await HttpClient.SendAsync(postRequestMessage);
        Assert.Equal(HttpStatusCode.Created, postResponse.StatusCode);

        var applicationMetadata =
            TestDataHelper.GetFileFromRepo(Org, targetRepository, Developer, "App/config/applicationmetadata.json");
        ApplicationMetadata deserializedApplicationMetadata = JsonSerializer.Deserialize<ApplicationMetadata>(applicationMetadata, JsonSerializerOptions);
        Assert.True(deserializedApplicationMetadata.DataTypes.Exists(dataType => dataType.Id == modelAndSchemaName));
    }

    [Theory]
    [InlineData("", "ServiceA", true)]
    [InlineData("test<", "", false)]
    [InlineData("test>", "", false)]
    [InlineData("test|", "", false)]
    [InlineData("test\\\"", "", false)]
    [InlineData("test/", "", false)]
    public async Task PostDatamodel_InvalidFormPost_ShouldReturnBadRequest(string modelName, string relativeDirectory, bool altinn2Compatible)
    {
        string url = $"{VersionPrefix("xyz", "dummyrepo")}/new";

        var createViewModel = new CreateModelViewModel()
        { ModelName = modelName, RelativeDirectory = relativeDirectory, Altinn2Compatible = altinn2Compatible };
        using var postRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(createViewModel, null, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
        };

        var postResponse = await HttpClient.SendAsync(postRequestMessage);

        Assert.Equal(HttpStatusCode.BadRequest, postResponse.StatusCode);
    }
}
