using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.OptionsController;

public class ImportOptionsListFromOrgTests
    : DesignerEndpointsTestsBase<ImportOptionsListFromOrgTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    public ImportOptionsListFromOrgTests(WebApplicationFactory<Program> fixture)
        : base(fixture) { }

    private const string OrgName = "ttd";
    private const string Username = "testUser";

    [Fact]
    public async Task Post_Returns200OK_WhenImportingCodeListFromOrg()
    {
        // Arrange
        const string OrgRepoName = "org-content";
        const string AppRepoName = "empty-app";
        const string OptionListId = "codeListString";
        const string StringCodeList =
            @"[
            {""value"": ""norway"",""label"": ""Norge""},
            {""value"": ""denmark"",""label"": ""Danmark""},
            {""value"": ""sweden"",""label"": ""country.label.sweden""}
        ]";
        List<Option> expectedOptionList = JsonSerializer.Deserialize<List<Option>>(StringCodeList);

        (string targetOrgName, string targetAppRepoName) = await SetupTestOrgAndRepo(
            OrgRepoName,
            AppRepoName
        );

        string apiUrl = ApiUrl(targetOrgName, targetAppRepoName, OptionListId);
        using HttpRequestMessage message = new(HttpMethod.Post, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(message);
        string responseContent = await response.Content.ReadAsStringAsync();
        List<Option> importedOptionList = JsonSerializer.Deserialize<List<Option>>(responseContent);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(importedOptionList.Count, expectedOptionList.Count);

        for (int i = 0; i < expectedOptionList.Count; i++)
        {
            Assert.Equal(expectedOptionList[i].Value, importedOptionList[i].Value);
            Assert.Equal(expectedOptionList[i].Label, importedOptionList[i].Label);
            Assert.Equal(expectedOptionList[i].Description, importedOptionList[i].Description);
            Assert.Equal(expectedOptionList[i].HelpText, importedOptionList[i].HelpText);
        }
    }

    [Fact]
    public async Task Post_Returns404NotFound_WhenCodeListDoesNotExist()
    {
        // Arrange
        const string OrgRepoName = "org-content";
        const string AppRepoName = "empty-app";
        const string OptionListId = "nonExistentCodeList";

        (string targetOrgName, string targetAppRepoName) = await SetupTestOrgAndRepo(
            OrgRepoName,
            AppRepoName
        );

        string apiUrl = ApiUrl(targetOrgName, targetAppRepoName, OptionListId);
        using HttpRequestMessage message = new(HttpMethod.Post, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(message);
        string responseContent = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        Assert.Equal($"The code list file {OptionListId}.json does not exist.", responseContent);
    }

    [Fact]
    public async Task Post_Returns409Conflict_WhenOptionListAlreadyExists()
    {
        // Arrange
        const string OrgRepoName = "org-content";
        const string AppRepoName = "app-with-options";
        const string OptionListId = "codeListString";

        (string targetOrgName, string targetAppRepoName) = await SetupTestOrgAndRepo(
            OrgRepoName,
            AppRepoName
        );

        const string CodeList =
            @"[{ ""label"": ""label1"", ""value"": ""value1""}, { ""label"": ""label2"", ""value"": ""value2""}]";
        string repoPath = TestDataHelper.GetTestDataRepositoryDirectory(
            targetOrgName,
            targetAppRepoName,
            Username
        );
        string filePath = Path.Combine(repoPath, "App/options");
        await File.WriteAllTextAsync(Path.Combine(filePath, $"{OptionListId}.json"), CodeList);

        string apiUrl = ApiUrl(targetOrgName, targetAppRepoName, OptionListId);
        using HttpRequestMessage message = new(HttpMethod.Post, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(message);
        string responseContent = await response.Content.ReadAsStringAsync();

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        Assert.Equal($"The options file {OptionListId}.json already exists.", responseContent);
    }

    private async Task<(string targetOrgName, string targetAppRepoName)> SetupTestOrgAndRepo(
        string orgRepoName,
        string appRepoName
    )
    {
        string targetOrgName = TestDataHelper.GenerateTestOrgName();
        string targetOrgRepoName = TestDataHelper.GetOrgContentRepoName(targetOrgName);
        await CopyOrgRepositoryForTest(
            Username,
            OrgName,
            orgRepoName,
            targetOrgName,
            targetOrgRepoName
        );

        string targetAppRepoName = TestDataHelper.GenerateTestRepoName();
        await AddRepositoryToTestOrg(
            Username,
            OrgName,
            appRepoName,
            targetOrgName,
            targetAppRepoName
        );

        return (targetOrgName, targetAppRepoName);
    }

    private static string ApiUrl(string org, string app, string optionListId) =>
        $"/designer/api/{org}/{app}/options/import/{optionListId}";
}
