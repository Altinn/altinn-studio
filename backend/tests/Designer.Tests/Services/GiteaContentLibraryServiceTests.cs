using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using Moq;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Services;

public class GiteaContentLibraryServiceTests
{
    private readonly Mock<IGitea> _giteaApiWrapperMock;
    private readonly GiteaContentLibraryService _giteaContentLibraryService;
    private const string Developer = "testUser";
    private const string OrgName = "ttd";
    private const string RepoName = "org-content";
    private const string CodeListFolderPath = "CodeLists/";
    private const string TextResourceFolderPath = "Texts/";

    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
    };

    public GiteaContentLibraryServiceTests()
    {
        _giteaApiWrapperMock = new Mock<IGitea>();
        _giteaContentLibraryService = new GiteaContentLibraryService(_giteaApiWrapperMock.Object);
    }


    [Fact]
    public async Task GetCodeListIds_ReturnsAllIds()
    {
        // Arrange
        string[] codeListFileNames = TestDataHelper.GetRepositoryFileNames(Developer, OrgName, RepoName, CodeListFolderPath);
        List<FileSystemObject> listOfFiles = [];
        listOfFiles.AddRange(codeListFileNames.Select(fileName => new FileSystemObject { Name = fileName }));

        _giteaApiWrapperMock
            .Setup(service => service.GetDirectoryAsync(OrgName, GetContentRepoName(), CodeListFolderPath, It.IsAny<string>()))
            .ReturnsAsync(listOfFiles);

        // Act
        List<string> result = await _giteaContentLibraryService.GetCodeListIds(OrgName);

        // Assert
        Assert.Equal(7, result.Count);
        _giteaApiWrapperMock.Verify(
            service => service.GetDirectoryAsync(OrgName, GetContentRepoName(), CodeListFolderPath,
                It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task GetCodeList_ShouldReturnCodeList()
    {
        // Arrange
        const string CodeListId = "codeListString";
        string filePath = CodeListFilePath(CodeListId);
        byte[] codeListAsBytes = TestDataHelper.GetFileAsByteArrayFromRepo(OrgName, RepoName, Developer, filePath);
        FileSystemObject codeListFileObject = new ()
        {
            Name = CodeListId,
            Content = Convert.ToBase64String(codeListAsBytes)
        };
        _giteaApiWrapperMock
            .Setup(service => service.GetFileAsync(OrgName, GetContentRepoName(), filePath, It.IsAny<string>()))
            .ReturnsAsync(codeListFileObject);

        // Act
        List<Option> actualCodeList = await _giteaContentLibraryService.GetCodeList(OrgName, CodeListId);

        // Assert
        string expectedCodeListString = TestDataHelper.GetFileFromRepo(OrgName, RepoName, Developer, filePath);
        string actualCodeListString = JsonSerializer.Serialize(actualCodeList, s_jsonOptions);
        Assert.True(JsonUtils.DeepEquals(expectedCodeListString, actualCodeListString));
        _giteaApiWrapperMock.Verify(
            service => service.GetFileAsync(OrgName, GetContentRepoName(), filePath, It.IsAny<string>()),
            Times.Once);
    }

    [Fact]
    public async Task GetTextIds_ReturnsAllIds()
    {
        // Arrange
        string[] textResourceFileNames = TestDataHelper.GetRepositoryFileNames(Developer, OrgName, RepoName, TextResourceFolderPath);
        List<FileSystemObject> listOfFiles = [];
        listOfFiles.AddRange(textResourceFileNames.Select(fileName => new FileSystemObject { Name = fileName }));

        const string EnLanguageCode = "en";
        FileSystemObject enResourceFile = listOfFiles.Find(elem => elem.Name.Contains(EnLanguageCode));
        byte[] enResourceFileAsBytes = TestDataHelper.GetFileAsByteArrayFromRepo(OrgName, RepoName, Developer, enResourceFile.Name);
        enResourceFile.Content = Convert.ToBase64String(enResourceFileAsBytes);

        const string NoLanguageCode = "nb";
        FileSystemObject noResourceFile = listOfFiles.Find(elem => elem.Name.Contains(NoLanguageCode));
        byte[] noResourceFileAsBytes = TestDataHelper.GetFileAsByteArrayFromRepo(OrgName, RepoName, Developer, noResourceFile.Name);
        noResourceFile.Content = Convert.ToBase64String(noResourceFileAsBytes);

        _giteaApiWrapperMock
            .Setup(service => service.GetDirectoryAsync(OrgName, GetContentRepoName(), TextResourceFolderPath, It.IsAny<string>()))
            .ReturnsAsync(listOfFiles);
        _giteaApiWrapperMock
            .Setup(service => service.GetFileAsync(OrgName, GetContentRepoName(), TextResourceFilePath(EnLanguageCode), It.IsAny<string>()))
            .ReturnsAsync(enResourceFile);
        _giteaApiWrapperMock
            .Setup(service => service.GetFileAsync(OrgName, GetContentRepoName(), TextResourceFilePath(NoLanguageCode), It.IsAny<string>()))
            .ReturnsAsync(noResourceFile);

        // Act
        List<string> result = await _giteaContentLibraryService.GetTextIds(OrgName);

        // Assert
        Assert.Equal(3, result.Count);
        _giteaApiWrapperMock.Verify(
            service => service.GetDirectoryAsync(OrgName, GetContentRepoName(),
                TextResourceFolderPath, It.IsAny<string>()), Times.Once);
        _giteaApiWrapperMock.Verify(
            service => service.GetFileAsync(OrgName, GetContentRepoName(),
                TextResourceFilePath(EnLanguageCode), It.IsAny<string>()), Times.Once);
        _giteaApiWrapperMock.Verify(
            service => service.GetFileAsync(OrgName, GetContentRepoName(),
                TextResourceFilePath(NoLanguageCode), It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task GetTextResource_ShouldReturnTextResource()
    {
        // Arrange
        const string LanguageCode = "en";
        FileSystemObject resourceFile = new () { Name = TextResourceFilePath(LanguageCode) };
        byte[] resourceFileAsBytes = TestDataHelper.GetFileAsByteArrayFromRepo(OrgName, RepoName, Developer, resourceFile.Name);
        resourceFile.Content = Convert.ToBase64String(resourceFileAsBytes);

        _giteaApiWrapperMock
            .Setup(service => service.GetFileAsync(OrgName, GetContentRepoName(), TextResourceFilePath(LanguageCode),
                It.IsAny<string>()))
            .ReturnsAsync(resourceFile);

        // Act
        TextResource textResource = await _giteaContentLibraryService.GetTextResource(OrgName, LanguageCode);

        // Assert
        string expectedTextResourceString = TestDataHelper.GetFileFromRepo(OrgName, RepoName, Developer, resourceFile.Name);
        string actualTextResourceString = JsonSerializer.Serialize(textResource, s_jsonOptions);
        Assert.True(JsonUtils.DeepEquals(expectedTextResourceString, actualTextResourceString));
        _giteaApiWrapperMock.Verify(
            service => service.GetFileAsync(OrgName, GetContentRepoName(), TextResourceFilePath(LanguageCode),
                It.IsAny<string>()), Times.Once);
    }

    [Fact]
    public async Task GetLanguages_ShouldReturnAllLanguages()
    {
        // Arrange
        string[] textResourceFileNames = TestDataHelper.GetRepositoryFileNames(Developer, OrgName, RepoName, TextResourceFolderPath);
        List<FileSystemObject> listOfFiles = [];
        listOfFiles.AddRange(textResourceFileNames.Select(fileName => new FileSystemObject { Name = fileName }));
        _giteaApiWrapperMock
            .Setup(service => service.GetDirectoryAsync(OrgName, GetContentRepoName(), TextResourceFolderPath, It.IsAny<string>()))
            .ReturnsAsync(listOfFiles);

        // Act
        List<string> languages = await _giteaContentLibraryService.GetLanguages(OrgName);

        // Assert
        List<string> expectedLanguages = ["en", "nb"];
        Assert.Equal(expectedLanguages.Count, languages.Count);
        for (int i = 0; i < languages.Count; i++)
        {
            Assert.Equal(expectedLanguages[i], languages[i]);
        }

        _giteaApiWrapperMock.Verify(
            service => service.GetDirectoryAsync(OrgName, GetContentRepoName(), TextResourceFolderPath,
                It.IsAny<string>()), Times.Once);
    }

    private static string TextResourceFilePath(string languageCode)
    {
        return Path.Join(TextResourceFolderPath, $"resource.{languageCode}.json");
    }

    private static string CodeListFilePath(string optionListId)
    {
        return Path.Join(CodeListFolderPath, $"{optionListId}.json");
    }

    private static string GetContentRepoName()
    {
        return $"{OrgName}-content";
    }
}
