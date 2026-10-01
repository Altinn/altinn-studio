using System.Net;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.App;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.ApplicationMetadataController;

public class UpdateApplicationMetadataTests
    : DesignerEndpointsTestsBase<UpdateApplicationMetadataTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/metadata";

    public UpdateApplicationMetadataTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    [Theory]
    [InlineData("ttd", "hvem-er-hvem", "testUser", "App/config/applicationmetadata.json")]
    public async Task UpdateApplicationMetadata_WhenExists_ShouldReturnConflict(
        string org,
        string app,
        string developer,
        string metadataToUpdate
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string metadata = SharedResourcesHelper.LoadTestDataAsString(metadataToUpdate);
        string expectedMetadataJson = JsonSerializer.Serialize(
            JsonSerializer.Deserialize<ApplicationMetadata>(metadata, JsonSerializerOptions),
            JsonSerializerOptions
        );

        string url = VersionPrefix(org, targetRepository);

        using var response = await HttpClient.PutAsync(
            url,
            new StringContent(metadata, Encoding.UTF8, MediaTypeNames.Application.Json)
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Null(response.Headers.ETag);
        string responseContent = await response.Content.ReadAsStringAsync();
        Assert.True(JsonUtils.DeepEquals(expectedMetadataJson, responseContent));
        string fileFromRepo = TestDataHelper.GetFileFromRepo(
            org,
            targetRepository,
            developer,
            "App/config/applicationmetadata.json"
        );
        Assert.True(JsonUtils.DeepEquals(expectedMetadataJson, fileFromRepo));
    }

    [Fact]
    public async Task UpdateV9ApplicationMetadata_RejectsMissingOrStaleEntityTags()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest("ttd", "app-with-layoutsets-v9", "testUser", targetRepository);
        string url = VersionPrefix("ttd", targetRepository);
        using HttpResponseMessage loaded = await HttpClient.GetAsync(url);
        EntityTagHeaderValue loadedEntityTag = loaded.Headers.ETag;
        Assert.NotNull(loadedEntityTag);
        JsonObject draft = await loaded.Content.ReadFromJsonAsync<JsonObject>();
        string originalFile = ReadMetadataFile(targetRepository);
        draft["title"]["nb"] = "Updated title";

        using HttpResponseMessage withoutPrecondition = await SendMetadata(url, draft, null);
        Assert.Equal(HttpStatusCode.PreconditionRequired, withoutPrecondition.StatusCode);
        Assert.Equal(originalFile, ReadMetadataFile(targetRepository));

        using HttpResponseMessage accepted = await SendMetadata(url, draft, loadedEntityTag);
        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
        EntityTagHeaderValue savedEntityTag = accepted.Headers.ETag;
        Assert.NotNull(savedEntityTag);
        Assert.NotEqual(loadedEntityTag, savedEntityTag);
        JsonObject saved = await accepted.Content.ReadFromJsonAsync<JsonObject>();
        Assert.Equal("Updated title", saved["title"]["nb"].GetValue<string>());
        Assert.False(saved.ContainsKey("revision"));
        using HttpResponseMessage reloaded = await HttpClient.GetAsync(url);
        Assert.Equal(savedEntityTag, reloaded.Headers.ETag);

        draft["title"]["nb"] = "An old draft";
        using HttpResponseMessage rejected = await SendMetadata(url, draft, loadedEntityTag);
        Assert.Equal(HttpStatusCode.PreconditionFailed, rejected.StatusCode);
        JsonObject file = JsonNode.Parse(ReadMetadataFile(targetRepository)).AsObject();
        Assert.Equal("Updated title", file["title"]["nb"].GetValue<string>());
        Assert.False(file.ContainsKey("revision"));
    }

    [Fact]
    public async Task UpdateV9ApplicationMetadata_WithExtensionChanges_UpdatesTheEntityTag()
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest("ttd", "app-with-layoutsets-v9", "testUser", targetRepository);
        string url = VersionPrefix("ttd", targetRepository);
        using HttpResponseMessage loaded = await HttpClient.GetAsync(url);
        JsonObject draft = await loaded.Content.ReadFromJsonAsync<JsonObject>();
        draft["customSetting"] = "Preserved extension data";

        using HttpResponseMessage accepted = await SendMetadata(url, draft, loaded.Headers.ETag);

        Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
        Assert.NotEqual(loaded.Headers.ETag, accepted.Headers.ETag);
        JsonObject file = JsonNode.Parse(ReadMetadataFile(targetRepository)).AsObject();
        Assert.Equal("Preserved extension data", file["customSetting"].GetValue<string>());
    }

    private async Task<HttpResponseMessage> SendMetadata(string url, JsonObject metadata, EntityTagHeaderValue ifMatch)
    {
        using var request = new HttpRequestMessage(HttpMethod.Put, url) { Content = JsonContent.Create(metadata) };
        if (ifMatch is not null)
        {
            request.Headers.IfMatch.Add(ifMatch);
        }
        return await HttpClient.SendAsync(request);
    }

    private static string ReadMetadataFile(string repository) =>
        TestDataHelper.GetFileFromRepo("ttd", repository, "testUser", "App/config/applicationmetadata.json");
}
