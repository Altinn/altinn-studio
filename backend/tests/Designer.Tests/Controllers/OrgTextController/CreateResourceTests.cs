using System.Net;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Controllers.OrgTextController;

public class CreateResourceTests : DesignerEndpointsTestsBase<CreateResourceTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public CreateResourceTests(WebApplicationFactory<Program> factory) : base(factory)
    {
    }

    [Theory]
    [InlineData("ttd", "testUser", "org-content-empty", "nb", "{\"language\": \"sr\",\"resources\": [{\"id\": \"ServiceName\",\"value\": \"ko-je-ko\"}]}")]
    public async Task CreateResource_Returns200Ok_WithValidInput(string org, string developer, string repo, string lang, string payload)
    {
        // Arrange
        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(developer, org, repo, targetOrg, targetRepository);

        string apiUrl = ApiUrl(targetOrg, lang);
        using HttpRequestMessage httpRequestMessage = new(HttpMethod.Post, apiUrl);
        httpRequestMessage.Content = new StringContent(payload, Encoding.UTF8, "application/json");

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.True(TestDataHelper.FileExistsInRepo(targetOrg, targetRepository, developer, RelativePath(lang)));
        Assert.True(JsonUtils.DeepEquals(payload, TestDataHelper.GetFileFromRepo(targetOrg, targetRepository, developer, RelativePath(lang))));
    }

    private static string ApiUrl(string org, string languageCode) => $"/designer/api/{org}/text/language/{languageCode}";

    private static string RelativePath(string language) => $"Texts/resource.{language}.json";
}
