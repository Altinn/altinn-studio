using System;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.ViewModels.Request;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Json.Schema;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Controllers.DataModelsController;

public class PostTests : ApiTestsBase<DatamodelsController, PostTests>
{
    private const string VersionPrefix = "/designer/api";

    public PostTests(WebApplicationFactory<DatamodelsController> factory) : base(factory)
    {
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.Configure<ServiceRepositorySettings>(c =>
            c.RepositoryLocation = TestRepositoriesLocation);
        services.AddSingleton<IGitea, IGiteaMock>();
    }

    [Theory]
    [InlineData("ServiceA", true, "empty-app")]
    [InlineData("", false, "xyz-datamodels")]
    [InlineData("relative/folder", false, "xyz-datamodels")]
    public async Task PostDatamodel_FromFormPost_ShouldReturnCreatedFromTemplate(string relativeDirectory, bool altinn2Compatible, string sourceRepository)
    {
        // Arrange
        var org = "ttd";
        var developer = "testUser";
        var targetRepository = Guid.NewGuid().ToString();

        await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);
        var url = $"{VersionPrefix}/{org}/{targetRepository}/Datamodels/Post";

        var createViewModel = new CreateModelViewModel()
            { ModelName = "test", RelativeDirectory = relativeDirectory, Altinn2Compatible = altinn2Compatible };
        var postRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(createViewModel, null, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
        };

        // Act / Assert
        try
        {
            var postResponse = await HttpClient.Value.SendAsync(postRequestMessage);
            Assert.Equal(HttpStatusCode.Created, postResponse.StatusCode);

            Assert.Equal("application/json", postResponse.Content.Headers.ContentType.MediaType);

            var postContent = await postResponse.Content.ReadAsStringAsync();
            JsonSchema postJsonSchema = JsonSchema.FromText(postContent);
            Assert.NotNull(postJsonSchema);

            // Try to read back the created schema to verify it's stored
            // at the location provided in the post response
            var location = postResponse.Headers.Location;
            var getRequestMessage = new HttpRequestMessage(HttpMethod.Get, location);
            var getResponse = await HttpClient.Value.SendAsync(getRequestMessage);
            var getContent = await getResponse.Content.ReadAsStringAsync();
            var getJsonSchema = JsonSchema.FromText(getContent);
            Assert.NotNull(getJsonSchema);
            Assert.Equal(postContent, getContent);
        }
        finally
        {
            TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
        }
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
        var url = $"{VersionPrefix}/xyz/dummyRepo/Datamodels/Post";

        var createViewModel = new CreateModelViewModel()
            { ModelName = modelName, RelativeDirectory = relativeDirectory, Altinn2Compatible = altinn2Compatible };
        var postRequestMessage = new HttpRequestMessage(HttpMethod.Post, url)
        {
            Content = JsonContent.Create(createViewModel, null, new JsonSerializerOptions() { PropertyNamingPolicy = JsonNamingPolicy.CamelCase })
        };

        var postResponse = await HttpClient.Value.SendAsync(postRequestMessage);

        Assert.Equal(HttpStatusCode.BadRequest, postResponse.StatusCode);
    }
}
