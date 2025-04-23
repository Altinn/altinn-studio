using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.OrgTextController;

public class GetResourcesTests : DesignerEndpointsTestsBase<GetResourcesTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public GetResourcesTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("ttd", "testUser", "org-content", "nb")]
    public async Task GetResources_Returns200OK_WithValidInput(string org, string developer, string repo, string lang)
    {
        // Arrange
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(developer, org, repo, targetOrg, targetRepository);

        string expectedContent = TestDataHelper.GetFileFromRepo(targetOrg, targetRepository, developer, RelativePath(lang));

        string apiUrl = ApiUrl(targetOrg, lang);
        using HttpRequestMessage requestMessage = new(HttpMethod.Get, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(requestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(JsonUtils.DeepEquals(expectedContent, await response.Content.ReadAsStringAsync()));
    }

    [Theory]
    [InlineData("ttd", "testUser", "org-content-empty", "sr")]
    public async Task GetResources_Returns204NoContent_WithNonExistingLang(string org, string developer, string repo, string languageCode)
    {
        // Arrange
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(developer, org, repo, targetOrg, targetRepository);

        string apiUrl = ApiUrl(targetOrg, languageCode);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    private static string ApiUrl(string org, string languageCode) => $"/designer/api/{org}/text/language/{languageCode}";

    private static string RelativePath(string language) => $"Texts/resource.{language}.json";
}
