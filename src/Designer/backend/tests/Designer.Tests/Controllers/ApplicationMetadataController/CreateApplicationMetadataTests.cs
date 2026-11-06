using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.ApplicationMetadataController;

public class CreateApplicationMetadataTests
    : DesignerEndpointsTestsBase<CreateApplicationMetadataTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/metadata";

    public CreateApplicationMetadataTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    [Theory]
    [InlineData("ttd", "hvem-er-hvem", "testUser")]
    public async Task CreateApplicationMetadata_WhenExists_ShouldReturnConflict(
        string org,
        string app,
        string developer
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);

        string url = VersionPrefix(org, targetRepository);
        using HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, url);
        using var response = await HttpClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Theory]
    [InlineData("ttd", "hvem-er-hvem", "testUser")]
    public async Task CreateApplicationMetadata_ShouldReturnOK(string org, string app, string developer)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest(org, app, developer, targetRepository);
        string metadataPath = Path.Combine(TestRepoPath, "App", "config", "applicationmetadata.json");
        File.Delete(metadataPath);

        string url = VersionPrefix(org, targetRepository);
        using HttpRequestMessage request = new HttpRequestMessage(HttpMethod.Post, url);
        using var response = await HttpClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        // Check the file text because deserialization cannot distinguish an omitted property from an
        // explicit null.
        string metadataContent = await File.ReadAllTextAsync(metadataPath);
        Assert.DoesNotContain("enablePdfCreation", metadataContent, StringComparison.OrdinalIgnoreCase);
    }

    [Theory]
    [InlineData("9.0.0", null, new[] { "Task_1" })]
    [InlineData("8.12.10", "Task_1", null)]
    public async Task CreateApplicationMetadata_ShouldBindModelWithTaskIdOrTaskIdsByAppLibVersion(
        string appLibVersion,
        string expectedTaskId,
        string[] expectedTaskIds
    )
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await CopyRepositoryForTest("ttd", "hvem-er-hvem", "testUser", targetRepository);
        File.Delete(Path.Combine(TestRepoPath, "App", "config", "applicationmetadata.json"));
        TestDataHelper.WriteAppLibVersion(TestRepoPath, appLibVersion);

        using HttpRequestMessage request = new(HttpMethod.Post, VersionPrefix("ttd", targetRepository));
        using var response = await HttpClient.SendAsync(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        JsonObject model = DataTypeTaskBindingTestHelper.ReadDataType(TestRepoPath, "model");
        Assert.Equal(expectedTaskId, (string)model["taskId"]);
        Assert.Equal(expectedTaskIds, DataTypeTaskBindingTestHelper.ReadTaskIds(model));
    }
}
