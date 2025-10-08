using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using LibGit2Sharp;
using Moq;
using SharedResources.Tests;
using Xunit;
using Repository = Altinn.Studio.Designer.RepositoryClient.Model.Repository;

namespace Designer.Tests.Services;

public class GiteaContentLibraryServiceTests
{
    private readonly Mock<IGitea> _giteaApiWrapperMock;
    private readonly GiteaContentLibraryService _giteaContentLibraryService;
    private const string Developer = "testUser";
    private const string OrgName = "ttd";
    private const string RepoName = "org-content";
    private const string CodeListFolderPath = "CodeListsWithTextResources/";
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
    public async Task OrgContentRepoExists()
    {
        // Arrange
        Repository repository = new() { Name = $"{OrgName}-content" };
        List<Repository> temp = [repository];
        SearchResults searchResults = new()
        {
            Data = temp
        };
        _giteaApiWrapperMock
            .Setup(service => service.SearchRepo(It.IsAny<SearchOptions>()))
            .ReturnsAsync(searchResults);

        // Act
        bool result = await _giteaContentLibraryService.OrgContentRepoExists(OrgName);

        // Assert
        Assert.True(result);
        _giteaApiWrapperMock.Verify(service => service.SearchRepo(It.IsAny<SearchOptions>()), Times.Once);
    }

    [Fact]
    public async Task GetCodeListIds_ShouldReturnAllIds()
    {
        // Arrange
        string[] codeListFileNames = TestDataHelper.GetRepositoryFileNames(Developer, OrgName, RepoName, CodeListFolderPath);
        List<FileSystemObject> listOfFiles = codeListFileNames.Select(fileName => new FileSystemObject { Name = fileName }).ToList();

        _giteaApiWrapperMock
            .Setup(service => service.GetDirectoryAsync(OrgName, GetContentRepoName(), CodeListFolderPath, string.Empty, It.IsAny<CancellationToken>()))
            .ReturnsAsync(listOfFiles);

        // Act
        List<string> result = await _giteaContentLibraryService.GetCodeListIds(OrgName);

        // Assert
        Assert.Equal(7, result.Count);
        _giteaApiWrapperMock.Verify(
            service => service.GetDirectoryAsync(OrgName, GetContentRepoName(), CodeListFolderPath, string.Empty, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetCodeListIds_ShouldReturnEmptyList_IfNoCodeListFileExists()
    {
        // Arrange
        _giteaApiWrapperMock
            .Setup(service => service.GetDirectoryAsync(OrgName, GetContentRepoName(), CodeListFolderPath, string.Empty, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        // Act
        List<string> result = await _giteaContentLibraryService.GetCodeListIds(OrgName);

        // Assert
        Assert.Empty(result);
        _giteaApiWrapperMock.Verify(
            service => service.GetDirectoryAsync(OrgName, GetContentRepoName(), CodeListFolderPath, string.Empty, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetCodeList_ShouldReturnCodeList()
    {
        // Arrange
        const string CodeListId = "codeListString";
        string filePath = CodeListUtils.FilePathWithTextResources(CodeListId);
        FileSystemObject codeListFileObject = new()
        {
            Name = CodeListId,
            Content = TestDataHelper.GetFileAsBase64StringFromRepo(OrgName, RepoName, Developer, filePath)
        };
        _giteaApiWrapperMock
            .Setup(service => service.GetFileAsync(OrgName, GetContentRepoName(), filePath, string.Empty))
            .ReturnsAsync(codeListFileObject);

        // Act
        List<Option> result = await _giteaContentLibraryService.GetCodeList(OrgName, CodeListId);

        // Assert
        string expectedCodeListString = TestDataHelper.GetFileFromRepo(OrgName, RepoName, Developer, filePath);
        string actualCodeListString = JsonSerializer.Serialize(result, s_jsonOptions);
        Assert.True(JsonUtils.DeepEquals(expectedCodeListString, actualCodeListString));
        _giteaApiWrapperMock.Verify(
            service => service.GetFileAsync(OrgName, GetContentRepoName(), filePath, string.Empty), Times.Once);
    }

    [Fact]
    public async Task GetCodeList_ShouldReturnEmptyList_IfCodeListDoesNotExist()
    {
        // Arrange
        const string CodeListId = "someId";
        string filePath = CodeListUtils.FilePathWithTextResources(CodeListId);
        FileSystemObject fileObject = new() { Name = CodeListId };
        _giteaApiWrapperMock
            .Setup(service => service.GetFileAsync(OrgName, GetContentRepoName(), filePath, string.Empty))
            .ReturnsAsync(fileObject);

        // Act
        List<Option> result = await _giteaContentLibraryService.GetCodeList(OrgName, CodeListId);

        // Assert
        Assert.Empty(result);
        _giteaApiWrapperMock.Verify(
            service => service.GetFileAsync(OrgName, GetContentRepoName(), filePath, string.Empty), Times.Once);
    }

    [Fact]
    public async Task GetTextIds_ReturnsAllIds()
    {
        // Arrange
        string[] textResourceFileNames = TestDataHelper.GetRepositoryFileNames(Developer, OrgName, RepoName, TextResourceFolderPath);
        List<FileSystemObject> listOfFiles = textResourceFileNames.Select(fileName => new FileSystemObject { Name = fileName }).ToList();

        const string EnLanguageCode = "en";
        FileSystemObject enResourceFile = listOfFiles.Find(elem => elem.Name.Contains(EnLanguageCode));
        enResourceFile.Content = TestDataHelper.GetFileAsBase64StringFromRepo(OrgName, RepoName, Developer, enResourceFile.Name);

        const string NbLanguageCode = "nb";
        FileSystemObject nbResourceFile = listOfFiles.Find(elem => elem.Name.Contains(NbLanguageCode));
        nbResourceFile.Content = TestDataHelper.GetFileAsBase64StringFromRepo(OrgName, RepoName, Developer, nbResourceFile.Name);

        _giteaApiWrapperMock
            .Setup(service => service.GetDirectoryAsync(OrgName, GetContentRepoName(), TextResourceFolderPath, string.Empty, It.IsAny<CancellationToken>()))
            .ReturnsAsync(listOfFiles);
        _giteaApiWrapperMock
            .Setup(service => service.GetFileAsync(OrgName, GetContentRepoName(), It.IsAny<string>(), string.Empty))
            .ReturnsAsync((string _, string _, string path, string _) => path.Contains("en") ? enResourceFile : nbResourceFile);

        // Act
        List<string> result = await _giteaContentLibraryService.GetTextIds(OrgName);

        // Assert
        Assert.Equal(3, result.Count);
        _giteaApiWrapperMock.Verify(
            service => service.GetDirectoryAsync(OrgName, GetContentRepoName(), TextResourceFolderPath, string.Empty, It.IsAny<CancellationToken>()), Times.Once);
        _giteaApiWrapperMock.Verify(
            service => service.GetFileAsync(OrgName, GetContentRepoName(), TextResourceFilePath(EnLanguageCode), string.Empty), Times.Once);
        _giteaApiWrapperMock.Verify(
            service => service.GetFileAsync(OrgName, GetContentRepoName(), TextResourceFilePath(NbLanguageCode), string.Empty), Times.Once);
    }

    [Fact]
    public async Task GetTextIds_ShouldReturnEmptyList_IfNoTextResourceFileExists()
    {
        // Arrange
        _giteaApiWrapperMock
            .Setup(service => service.GetDirectoryAsync(OrgName, GetContentRepoName(), TextResourceFolderPath, string.Empty, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        // Act
        List<string> result = await _giteaContentLibraryService.GetTextIds(OrgName);

        // Assert
        Assert.Empty(result);
        _giteaApiWrapperMock.Verify(
            service => service.GetDirectoryAsync(OrgName, GetContentRepoName(), TextResourceFolderPath, string.Empty, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetTextResource_ShouldReturnTextResource()
    {
        // Arrange
        const string LanguageCode = "en";
        FileSystemObject resourceFile = new() { Name = TextResourceFilePath(LanguageCode) };
        resourceFile.Content = TestDataHelper.GetFileAsBase64StringFromRepo(OrgName, RepoName, Developer, resourceFile.Name);

        _giteaApiWrapperMock
            .Setup(service => service.GetFileAsync(OrgName, GetContentRepoName(), TextResourceFilePath(LanguageCode), string.Empty))
            .ReturnsAsync(resourceFile);

        // Act
        TextResource result = await _giteaContentLibraryService.GetTextResource(OrgName, LanguageCode);

        // Assert
        string expectedTextResourceString = TestDataHelper.GetFileFromRepo(OrgName, RepoName, Developer, resourceFile.Name);
        string actualTextResourceString = JsonSerializer.Serialize(result, s_jsonOptions);
        Assert.True(JsonUtils.DeepEquals(expectedTextResourceString, actualTextResourceString));
        _giteaApiWrapperMock.Verify(
            service => service.GetFileAsync(OrgName, GetContentRepoName(), TextResourceFilePath(LanguageCode), string.Empty), Times.Once);
    }

    [Fact]
    public async Task GetTextResource_ShouldThrowException_IfTextResourceFileDoesNotExists()
    {
        // Arrange
        const string LanguageCode = "en";
        _giteaApiWrapperMock
            .Setup(service => service.GetFileAsync(OrgName, GetContentRepoName(), It.IsAny<string>(), string.Empty))
            .ThrowsAsync(new NotFoundException("Text resource file not found."));

        // Act and Assert
        await Assert.ThrowsAsync<NotFoundException>(async () => await _giteaContentLibraryService.GetTextResource(OrgName, LanguageCode));
        _giteaApiWrapperMock.Verify(
            service => service.GetFileAsync(OrgName, GetContentRepoName(), TextResourceFilePath(LanguageCode), string.Empty), Times.Once);
    }

    [Fact]
    public async Task GetLanguages_ShouldReturnAllLanguages()
    {
        // Arrange
        string[] textResourceFileNames = TestDataHelper.GetRepositoryFileNames(Developer, OrgName, RepoName, TextResourceFolderPath);
        List<FileSystemObject> listOfFiles = textResourceFileNames.Select(fileName => new FileSystemObject { Name = fileName }).ToList();

        _giteaApiWrapperMock
            .Setup(service => service.GetDirectoryAsync(OrgName, GetContentRepoName(), TextResourceFolderPath, string.Empty, It.IsAny<CancellationToken>()))
            .ReturnsAsync(listOfFiles);

        // Act
        List<string> result = await _giteaContentLibraryService.GetLanguages(OrgName);

        // Assert
        List<string> expectedLanguages = ["en", "nb"];
        Assert.Equal(expectedLanguages, result);

        _giteaApiWrapperMock.Verify(
            service => service.GetDirectoryAsync(OrgName, GetContentRepoName(), TextResourceFolderPath, string.Empty, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetLanguages_ShouldReturnEmptyList_IfNoTextResourceFileExists()
    {
        // Arrange
        _giteaApiWrapperMock
            .Setup(service => service.GetDirectoryAsync(OrgName, GetContentRepoName(), TextResourceFolderPath, string.Empty, It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);

        // Act
        List<string> result = await _giteaContentLibraryService.GetLanguages(OrgName);

        // Assert
        Assert.Empty(result);
        _giteaApiWrapperMock.Verify(
            service => service.GetDirectoryAsync(OrgName, GetContentRepoName(), TextResourceFolderPath, string.Empty, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task GetShaForCodeListFile_ShouldReturnFileSha()
    {
        // Arrange
        const string CodeListId = "someId";
        const string FileSha = "someShaString";
        string filePath = CodeListUtils.FilePathWithTextResources(CodeListId);
        FileSystemObject fileObject = new() { Sha = FileSha };
        _giteaApiWrapperMock
            .Setup(service => service.GetFileAsync(OrgName, GetContentRepoName(), filePath, string.Empty))
            .ReturnsAsync(fileObject);

        // Act
        string result = await _giteaContentLibraryService.GetShaForCodeListFile(OrgName, CodeListId);

        // Assert
        Assert.Equal(FileSha, result);
        _giteaApiWrapperMock.Verify(
            service => service.GetFileAsync(OrgName, GetContentRepoName(), filePath, string.Empty), Times.Once);
    }

    [Fact]
    public async Task GetShaForCodeListFile_ShouldReturnEmpty_WhenShaIsNull()
    {
        const string CodeListId = "someId";
        string filePath = CodeListUtils.FilePathWithTextResources(CodeListId);
        FileSystemObject fileObject = new() { Sha = null };

        _giteaApiWrapperMock
            .Setup(s => s.GetFileAsync(OrgName, GetContentRepoName(), filePath, string.Empty))
            .ReturnsAsync(fileObject);

        string result = await _giteaContentLibraryService.GetShaForCodeListFile(OrgName, CodeListId);

        Assert.Equal(string.Empty, result);
    }

    private static string TextResourceFilePath(string languageCode)
    {
        return Path.Join(TextResourceFolderPath, $"resource.{languageCode}.json");
    }

    private static string GetContentRepoName()
    {
        return $"{OrgName}-content";
    }
}
