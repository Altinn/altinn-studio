using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OrgTextController;

public class GetLanguagesTests : DesignerEndpointsTestsBase<GetLanguagesTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public GetLanguagesTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    private const string DeveloperName = "testUser";
    private const string OrgName = "ttd";

    [Fact]
    public async Task GetLanguages_ReturnsOk_WithAllLanguages()
    {
        // Arrange
        const string repoName = "org-content";
        string targetOrgName = TestDataHelper.GenerateTestOrgName();
        string targetRepoName = TestDataHelper.GetOrgContentRepoName(targetOrgName);
        await CopyOrgRepositoryForTest(DeveloperName, OrgName, repoName, targetOrgName, targetRepoName);

        string apiUrl = ApiUrl(targetOrgName);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        List<string> languages = await response.Content.ReadAsAsync<List<string>>();
        Assert.Equal(2, languages.Count);
        Assert.Contains("nb", languages);
        Assert.Contains("en", languages);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task GetLanguages_ReturnsNoContent_WhenThereAreNoLanguages()
    {
        // Arrange
        const string repoName = "org-content-empty";
        string targetOrgName = TestDataHelper.GenerateTestOrgName();
        string targetRepoName = TestDataHelper.GetOrgContentRepoName(targetOrgName);
        await CopyOrgRepositoryForTest(DeveloperName, OrgName, repoName, targetOrgName, targetRepoName);

        string apiUrl = ApiUrl(targetOrgName);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Get, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    private static string ApiUrl(string org) => $"/designer/api/{org}/text/languages";
}
