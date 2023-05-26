using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.ViewModels.Request;
using Designer.Tests.Utils;
using Json.Schema;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class PostTests : DatamodelsControllerTestsBase<PostTests>
{
    public PostTests(WebApplicationFactory<DatamodelsController> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("ServiceA", true, "empty-app", "ttd", "testUser")]
    [InlineData("", false, "xyz-datamodels", "ttd", "testUser")]
    [InlineData("relative/folder", false, "xyz-datamodels", "ttd", "testUser")]
    public async Task PostDatamodel_FromFormPost_ShouldReturnCreatedFromTemplate(string relativeDirectory, bool altinn2Compatible, string sourceRepository, string org, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();

        CreatedFolderPath = await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
        string url = $"{VersionPrefix(org, targetRepository)}/new";

        var createViewModel = new CreateModelViewModel()
        { ModelName = "test", RelativeDirectory = relativeDirectory, Altinn2Compatible = altinn2Compatible };

        using var postRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(createViewModel, null, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
        };

        using var postResponse = await HttpClient.Value.SendAsync(postRequestMessage);
        Assert.Equal(HttpStatusCode.Created, postResponse.StatusCode);

        Assert.Equal("application/json", postResponse.Content.Headers.ContentType.MediaType);

        string postContent = await postResponse.Content.ReadAsStringAsync();
        JsonSchema postJsonSchema = JsonSchema.FromText(postContent);
        Assert.NotNull(postJsonSchema);

        // Try to read back the created schema to verify it's stored
        // at the location provided in the post response
        var location = postResponse.Headers.Location;
        using var getRequestMessage = new HttpRequestMessage(HttpMethod.Get, location);
        using var getResponse = await HttpClient.Value.SendAsync(getRequestMessage);
        string getContent = await getResponse.Content.ReadAsStringAsync();
        var getJsonSchema = JsonSchema.FromText(getContent);
        Assert.NotNull(getJsonSchema);
        Assert.Equal(postContent, getContent);
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
        string url = $"{VersionPrefix("xyz", "dummyRepo")}/new";

        var createViewModel = new CreateModelViewModel()
        { ModelName = modelName, RelativeDirectory = relativeDirectory, Altinn2Compatible = altinn2Compatible };
        using var postRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(createViewModel, null, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
        };

        var postResponse = await HttpClient.Value.SendAsync(postRequestMessage);

        Assert.Equal(HttpStatusCode.BadRequest, postResponse.StatusCode);
    }
}
