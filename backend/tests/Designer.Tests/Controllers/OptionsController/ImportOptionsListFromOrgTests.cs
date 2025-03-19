using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OptionsController;

public class ImportOptionsListFromOrgTests : DesignerEndpointsTestsBase<ImportOptionsListFromOrgTests>, IClassFixture<WebApplicationFactory<Program>>
{
    public ImportOptionsListFromOrgTests(WebApplicationFactory<Program> fixture) : base(fixture)
    {
    }

    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Fact]
    public async Task Post_Returns200OK_WhenImportingCodeListFromOrg()
    {
        // Arrange
        const string orgRepo = "org-content";
        const string appRepo = "empty-app";
        const string optionListId = "codeListString";

        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetOrgRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, orgRepo, targetOrg, targetOrgRepository);

        string targetAppRepository = TestDataHelper.GenerateTestRepoName();
        await AddRepositoryToTestOrg(Developer, Org, appRepo, targetOrg, targetAppRepository);

        string apiUrl = $"/designer/api/{targetOrg}/{targetAppRepository}/options/{optionListId}/import";
        using HttpRequestMessage message = new(HttpMethod.Post, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(message);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Post_Returns404NotFound_WhenCodeListDoesNotExist()
    {
        // Arrange
        const string orgRepo = "org-content";
        const string appRepo = "empty-app";
        const string optionListId = "nonExistentCodeList";

        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetOrgRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, orgRepo, targetOrg, targetOrgRepository);

        string targetAppRepository = TestDataHelper.GenerateTestRepoName();
        await AddRepositoryToTestOrg(Developer, Org, appRepo, targetOrg, targetAppRepository);

        string apiUrl = $"/designer/api/{targetOrg}/{targetAppRepository}/options/{optionListId}/import";
        using HttpRequestMessage message = new(HttpMethod.Post, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(message);
        string responseMessage = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal($"The code list file {optionListId}.json does not exist.", responseMessage);
    }

    [Fact]
    public async Task Post_Returns409Conflict_WhenOptionListAlreadyExists()
    {
        // Arrange
        const string orgRepo = "org-content";
        const string appRepo = "app-with-options";
        const string optionListId = "codeListString";

        string targetOrg = TestDataHelper.GenerateTestOrgName();
        string targetOrgRepository = TestDataHelper.GetOrgContentRepoName(targetOrg);
        await CopyOrgRepositoryForTest(Developer, Org, orgRepo, targetOrg, targetOrgRepository);

        string targetAppRepository = TestDataHelper.GenerateTestRepoName();
        await AddRepositoryToTestOrg(Developer, Org, appRepo, targetOrg, targetAppRepository);

        const string codeList = @"[{ ""label"": ""label1"", ""value"": ""value1""}, { ""label"": ""label2"", ""value"": ""value2""}]";
        string repoPath = TestDataHelper.GetTestDataRepositoryDirectory(targetOrg, targetAppRepository, Developer);
        string filePath = Path.Combine(repoPath, "App/options");
        await File.WriteAllTextAsync(Path.Combine(filePath, $"{optionListId}.json"), codeList);

        string apiUrl = $"/designer/api/{targetOrg}/{targetAppRepository}/options/{optionListId}/import";
        using HttpRequestMessage message = new(HttpMethod.Post, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(message);
        string responseMessage = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal($"The options file {optionListId}.json already exists.", responseMessage);
    }

}
