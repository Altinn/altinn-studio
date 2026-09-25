using System;
using System.IO;
using System.Net;
using System.Net.Http;
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

        // enablePdfCreation is deprecated and must not be written into new application metadata.
        // Asserted on the raw file text rather than the deserialized model, because an explicit
        // "enablePdfCreation": null would satisfy an object-level check while still leaving the
        // property behind in the user's repository.
        string metadataContent = await File.ReadAllTextAsync(metadataPath);
        Assert.DoesNotContain("enablePdfCreation", metadataContent, StringComparison.OrdinalIgnoreCase);
    }
}
