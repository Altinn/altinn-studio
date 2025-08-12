using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Text.RegularExpressions;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;
using Match = System.Text.RegularExpressions.Match;

namespace Designer.Tests.Controllers.OptionsController;

public class ImportOptionsListFromOrgTests : DesignerEndpointsTestsBase<ImportOptionsListFromOrgTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IGiteaContentLibraryService> _giteaContentLibraryServiceMock;
    private const string OrgName = "ttd";
    private const string Username = "testUser";
    private const string CodeListFolderPath = "CodeLists/";
    private const string TextResourceFolderPath = "Texts/";

    public ImportOptionsListFromOrgTests(WebApplicationFactory<Program> fixture) : base(fixture)
    {
        _giteaContentLibraryServiceMock = new Mock<IGiteaContentLibraryService>();
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_giteaContentLibraryServiceMock.Object);
    }


    [Fact]
    public async Task Post_Returns200OK_WhenImportingCodeListFromOrg()
    {
        // Arrange
        const string OrgRepoName = "org-content";
        const string AppRepoName = "empty-app";
        const string OptionListId = "codeListString";
        const string StringCodeList = @"[
            {""value"": ""norway"",""label"": ""Norge""},
            {""value"": ""denmark"",""label"": ""Danmark""},
            {""value"": ""sweden"",""label"": ""country.label.sweden""}
        ]";
        List<Option> expectedOptionList = JsonSerializer.Deserialize<List<Option>>(StringCodeList);

        (string targetOrgName, string targetAppRepoName) = await SetupTestOrgAndRepo(OrgRepoName, AppRepoName);
        SetupGiteaMocks(targetOrgName, OrgRepoName, OptionListId);

        string apiUrl = ApiUrl(targetOrgName, targetAppRepoName, OptionListId);
        using HttpRequestMessage message = new(HttpMethod.Post, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(message);
        string responseContent = await response.Content.ReadAsStringAsync();
        ImportOptionListResponse importedResponse = JsonSerializer.Deserialize<ImportOptionListResponse>(responseContent, s_jsonOptions);
        List<OptionListData> optionListDataList = importedResponse.OptionLists;
        List<Option> optionList = optionListDataList.Single(e => e.Title == OptionListId).Data!;

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(optionList.Count, expectedOptionList.Count);

        for (int i = 0; i < expectedOptionList.Count; i++)
        {
            Assert.Equal(expectedOptionList[i].Value, optionList[i].Value);
            Assert.Equal(expectedOptionList[i].Label, optionList[i].Label);
            Assert.Equal(expectedOptionList[i].Description, optionList[i].Description);
            Assert.Equal(expectedOptionList[i].HelpText, optionList[i].HelpText);
        }
    }

    [Fact]
    public async Task Post_ImportsTextResourcesWithoutOverwriting_WhenOverwriteParameterIsNotGiven()
    {
        // Arrange
        const string OrgRepoName = "org-content";
        const string AppRepoName = "hvem-er-hvem";
        const string OptionListId = "codeListWithTextResources";
        const string LanguageCode = "nb";
        const string TextResourceRelativePath = $"App/config/texts/resource.{LanguageCode}.json";
        TextResourceElement textResourceElementWithCommonId = new() { Id = "Navn", Value = "Navn" };
        TextResourceElement textResourceElementWithUniqueId = new() { Id = "someId", Value = "someValue" };

        (string targetOrgName, string targetAppRepoName) = await SetupTestOrgAndRepo(OrgRepoName, AppRepoName);
        SetupGiteaMocks(targetOrgName, OrgRepoName, OptionListId);

        string apiUrl = ApiUrl(targetOrgName, targetAppRepoName, OptionListId);
        using HttpRequestMessage message = new(HttpMethod.Post, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(message);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string actualTextResourceFileContent = TestDataHelper.GetFileFromRepo(targetOrgName, targetAppRepoName, Username, TextResourceRelativePath);
        TextResource actualTextResource = JsonSerializer.Deserialize<TextResource>(actualTextResourceFileContent, s_jsonOptions);
        TextResourceElement actualTextResourceElement = actualTextResource.Resources.Single(element => element.Id == textResourceElementWithCommonId.Id);

        Assert.Equal(LanguageCode, actualTextResource.Language);
        Assert.Equal(textResourceElementWithCommonId.Id, actualTextResourceElement.Id);
        Assert.Equal(textResourceElementWithCommonId.Value, actualTextResourceElement.Value);

        actualTextResourceElement = actualTextResource.Resources.Single(element => element.Id == textResourceElementWithUniqueId.Id);
        Assert.Equal(textResourceElementWithUniqueId.Id, actualTextResourceElement.Id);
        Assert.Equal(textResourceElementWithUniqueId.Value, actualTextResourceElement.Value);
    }

    [Fact]
    public async Task Post_ImportsTextResourcesAndOverwrites_WhenOverwriteParameterIsTrue()
    {
        // Arrange
        const string OrgRepoName = "org-content";
        const string AppRepoName = "hvem-er-hvem";
        const string OptionListId = "codeListWithTextResources";
        const string LanguageCode = "nb";
        const string TextResourceRelativePath = $"App/config/texts/resource.{LanguageCode}.json";
        TextResourceElement textResourceElementWithCommonId = new() { Id = "Navn", Value = "New name" };

        (string targetOrgName, string targetAppRepoName) = await SetupTestOrgAndRepo(OrgRepoName, AppRepoName);
        SetupGiteaMocks(targetOrgName, OrgRepoName, OptionListId);

        string sourceTextResourceFileContent = TestDataHelper.GetFileFromRepo(targetOrgName, targetAppRepoName, Username, TextResourceRelativePath);
        TextResource sourceTextResource = JsonSerializer.Deserialize<TextResource>(sourceTextResourceFileContent, s_jsonOptions);

        string apiUrl = ApiUrl(targetOrgName, targetAppRepoName, OptionListId);
        apiUrl = $"{apiUrl}?overwriteTextResources=true";
        using HttpRequestMessage message = new(HttpMethod.Post, apiUrl);

        // Act
        using HttpResponseMessage response = await HttpClient.SendAsync(message);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        string actualTextResourceFileContent = TestDataHelper.GetFileFromRepo(targetOrgName, targetAppRepoName, Username, TextResourceRelativePath);
        TextResource actualTextResource = JsonSerializer.Deserialize<TextResource>(actualTextResourceFileContent, s_jsonOptions);
        TextResourceElement actualTextResourceElement = actualTextResource.Resources.Single(element => element.Id == textResourceElementWithCommonId.Id);

        Assert.Equal(LanguageCode, actualTextResource.Language);
        Assert.Equal(sourceTextResource.Resources.Count + 1, actualTextResource.Resources.Count);
        Assert.Equal(textResourceElementWithCommonId.Id, actualTextResourceElement.Id);
        Assert.Equal(textResourceElementWithCommonId.Value, actualTextResourceElement.Value);
    }

    [Fact]
    public async Task Post_Returns404NotFound_WhenCodeListDoesNotExist()
    {
        // Arrange
        const string OrgRepoName = "org-content";
        const string AppRepoName = "empty-app";
        const string OptionListId = "nonExistentCodeList";

        (string targetOrgName, string targetAppRepoName) = await SetupTestOrgAndRepo(OrgRepoName, AppRepoName);

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

        (string targetOrgName, string targetAppRepoName) = await SetupTestOrgAndRepo(OrgRepoName, AppRepoName);
        _giteaContentLibraryServiceMock
            .Setup(service => service.CodeListExists(targetOrgName, OptionListId))
            .ReturnsAsync(true);

        const string CodeList = @"[{ ""label"": ""label1"", ""value"": ""value1""}, { ""label"": ""label2"", ""value"": ""value2""}]";
        string repoPath = TestDataHelper.GetTestDataRepositoryDirectory(targetOrgName, targetAppRepoName, Username);
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
        _giteaContentLibraryServiceMock
            .Verify(service => service.CodeListExists(targetOrgName, OptionListId), Times.Once);
    }

    private async Task<(string targetOrgName, string targetAppRepoName)> SetupTestOrgAndRepo(string orgRepoName, string appRepoName)
    {
        string targetOrgName = TestDataHelper.GenerateTestOrgName();
        string targetOrgRepoName = TestDataHelper.GetOrgContentRepoName(targetOrgName);
        await CopyOrgRepositoryForTest(Username, OrgName, orgRepoName, targetOrgName, targetOrgRepoName);

        string targetAppRepoName = TestDataHelper.GenerateTestRepoName();
        await AddRepositoryToTestOrg(Username, OrgName, appRepoName, targetOrgName, targetAppRepoName);

        return (targetOrgName, targetAppRepoName);
    }

    private void SetupGiteaMocks(string targetOrgName, string sourceRepoName, string codeListId)
    {
        SetupCodeListGiteaMock(targetOrgName, sourceRepoName, codeListId);
        SetupTextResourceGiteaMocks(targetOrgName, sourceRepoName);
    }

    private void SetupCodeListGiteaMock(string targetOrgName, string sourceRepoName, string codeListId)
    {
        string codeListRelativePath = Path.Join(CodeListFolderPath, $"{codeListId}.json");
        string fileContent = TestDataHelper.GetFileFromRepo(OrgName, sourceRepoName, Username, codeListRelativePath);
        List<Option> codeList = JsonSerializer.Deserialize<List<Option>>(fileContent, s_jsonOptions);

        _giteaContentLibraryServiceMock
            .Setup(service => service.GetCodeList(targetOrgName, codeListId))
            .ReturnsAsync(codeList);
        _giteaContentLibraryServiceMock
            .Setup(service => service.CodeListExists(targetOrgName, codeListId))
            .ReturnsAsync(true);
    }

    private void SetupTextResourceGiteaMocks(string targetOrgName, string sourceRepoName)
    {
        string searchPattern = Path.Join(TextResourceFolderPath, "resource.*.json");
        string[] fileNames = TestDataHelper.GetRepositoryFileNames(Username, OrgName, sourceRepoName, searchPattern);
        HashSet<string> languages = [];

        foreach (string languageCode in fileNames
            .Select(Path.GetFileNameWithoutExtension)
            .Select(MatchTextResourceFileName)
            .Where(m => m.Success)
            .Select(m => m.Groups["lang"].Value)
            .Distinct())
        {
            languages.Add(languageCode);
            SetupGetTextResourceMock(targetOrgName, sourceRepoName, languageCode);
        }

        SetupGetLanguagesMock(targetOrgName, languages);
    }

    private static Match MatchTextResourceFileName(string fileName)
    {
        var textResourceFilenameRegex = new Regex(@"^resource\.(?<lang>[A-Za-z]{2,3})");
        return textResourceFilenameRegex.Match(fileName);
    }

    private void SetupGetTextResourceMock(string targetOrgName, string sourceRepoName, string languageCode)
    {
        string textResourcePath = Path.Join(TextResourceFolderPath, TextResourcePath(languageCode));
        string fileContent = TestDataHelper.GetFileFromRepo(OrgName, sourceRepoName, Username, textResourcePath);
        TextResource textResource = JsonSerializer.Deserialize<TextResource>(fileContent, s_jsonOptions);

        _giteaContentLibraryServiceMock
            .Setup(service => service.GetTextResource(targetOrgName, languageCode))
            .ReturnsAsync(textResource);
    }

    private void SetupGetLanguagesMock(string targetOrgName, HashSet<string> languages)
    {
        _giteaContentLibraryServiceMock
            .Setup(service => service.GetLanguages(targetOrgName))
            .ReturnsAsync(languages.ToList());
    }

    private static string TextResourcePath(string languageCode)
    {
        return $"resource.{languageCode}.json";
    }

    private static string ApiUrl(string org, string app, string optionListId) => $"/designer/api/{org}/{app}/options/import/{optionListId}";

    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };
}
