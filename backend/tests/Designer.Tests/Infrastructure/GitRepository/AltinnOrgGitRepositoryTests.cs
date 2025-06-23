using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Utils;
using LibGit2Sharp;
using SharedResources.Tests;
using Xunit;

namespace Designer.Tests.Infrastructure.GitRepository;

public class AltinnOrgGitRepositoryTests : IDisposable
{
    private string TargetOrg { get; set; }

    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Theory]
    [InlineData("org-content")]
    public async Task GetLanguages_WithRepoThatHasTextResources_ShouldReturnCorrectLanguages(string repository)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        AltinnOrgGitRepository altinnOrgGitRepository = await PrepareRepositoryForTest(repository);
        List<string> expectedLanguages = ["en", "nb"];

        // Act
        List<string> languages = altinnOrgGitRepository.GetLanguages();

        // Assert
        Assert.Equal(expectedLanguages.Count, languages.Count);

        for (int i = 0; i < expectedLanguages.Count; i++)
        {
            Assert.Equal(expectedLanguages[i], languages[i]);
        }
    }

    [Theory]
    [InlineData("org-content", "nb")]
    public async Task GetText_WithRepoThatHasTextResources_ShouldReturnTexts(string repository, string language)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        AltinnOrgGitRepository altinnOrgGitRepository = await PrepareRepositoryForTest(repository);

        // Act
        TextResource textResource = await altinnOrgGitRepository.GetText(language);

        // Assert
        string fileContent = TestDataHelper.GetFileFromRepo(Org, repository, Developer, RelativePathText(language));
        string textResourceString = JsonSerializer.Serialize(textResource, s_jsonOptions);
        Assert.True(JsonUtils.DeepEquals(fileContent, textResourceString));
    }

    [Theory]
    [InlineData("org-content-empty", "nb")]
    public async Task SaveText_WithEmptyRepo_ShouldSaveTexts(string repository, string language)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        AltinnOrgGitRepository altinnOrgGitRepository = await PrepareRepositoryForTest(repository);
        TextResource textResource = new() { Language = language, Resources = [new() { Id = "someId", Value = "someValue" }] };

        // Act
        await altinnOrgGitRepository.SaveText(language, textResource);

        // Assert
        string fileContent = TestDataHelper.GetFileFromRepo(TargetOrg, targetRepository, Developer, RelativePathText(language));
        Assert.False(string.IsNullOrEmpty(fileContent));
    }

    [Theory]
    [InlineData("org-content-empty", "nb")]
    public async Task TextResourceFileExists_WithEmptyRepo_ShouldReturnFalse(string repository, string language)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        AltinnOrgGitRepository altinnOrgGitRepository = await PrepareRepositoryForTest(repository);

        // Act
        bool result = altinnOrgGitRepository.TextResourceFileExists(language);

        // Assert
        Assert.False(result);
    }

    [Theory]
    [InlineData("org-content", "nb")]
    public async Task TextResourceFileExists_WithRepoThatHasTextResources_ShouldReturnTrue(string repository, string language)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        AltinnOrgGitRepository altinnOrgGitRepository = await PrepareRepositoryForTest(repository);

        // Act
        bool result = altinnOrgGitRepository.TextResourceFileExists(language);

        // Assert
        Assert.True(result);
    }

    [Theory]
    [InlineData("org-content")]
    public async Task GetCodeListIds_WithRepoThatHasCodeLists_ShouldReturnCodeListPathNames(string repository)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        AltinnOrgGitRepository altinnOrgGitRepository = await PrepareRepositoryForTest(repository);

        // Act
        List<string> codeListIds = altinnOrgGitRepository.GetCodeListIds();

        // Assert
        Assert.NotNull(codeListIds);
        Assert.Equal(7, codeListIds.Count);
    }

    [Theory]
    [InlineData("org-content-empty")]
    public async Task GetCodeListIds_WithRepoThatHasNoCodeLists_ShouldReturnEmptyList(string repository)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        AltinnOrgGitRepository altinnOrgGitRepository = await PrepareRepositoryForTest(repository);

        // Act
        List<string> codeListIds = altinnOrgGitRepository.GetCodeListIds();

        // Assert
        Assert.Empty(codeListIds);
    }

    [Theory]
    [InlineData("org-content", "codeListString")]
    public async Task GetCodeList_WithRepoThatHasCodeLists_ShouldReturnACodeListsWithCorrectValues(string repository, string codeListId)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        AltinnOrgGitRepository altinnOrgGitRepository = await PrepareRepositoryForTest(repository);

        // Act
        List<Option> codeLists = await altinnOrgGitRepository.GetCodeList(codeListId);

        // Assert
        Assert.NotNull(codeLists);
        Assert.Equal(3, codeLists.Count);
        Assert.Equal("norway", codeLists[0].Value);
        Assert.Equal("denmark", codeLists[1].Value);
        Assert.Equal("sweden", codeLists[2].Value);
    }

    [Theory]
    [InlineData("org-content", "none-existing-code-list")]
    public async Task GetCodeLists_WithSpecifiedCodeListIdDoesNotExistInOrg_ShouldThrowNotFoundException(string repository, string codeListId)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        AltinnOrgGitRepository altinnOrgGitRepository = await PrepareRepositoryForTest(repository);

        // Act and assert
        await Assert.ThrowsAsync<LibGit2Sharp.NotFoundException>(async () => await altinnOrgGitRepository.GetCodeList(codeListId));
    }

    [Theory]
    [InlineData("org-content-empty", "newId")]
    public async Task CreatCodeList_WithEmptyRepo_ShouldCreateCodeList(string repository, string codeListId)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        AltinnOrgGitRepository altinnOrgGitRepository = await PrepareRepositoryForTest(repository);
        List<Option> newCodeList = [new() { Label = "someLabel", Value = "someValue", }];
        string expectedCodeList = JsonSerializer.Serialize(newCodeList, s_jsonOptions);

        // Act
        await altinnOrgGitRepository.CreateCodeList(codeListId, newCodeList);

        // Assert
        string fileContent = TestDataHelper.GetFileFromRepo(TargetOrg, targetRepository, Developer, RelativePathCodeList(codeListId));
        Assert.True(JsonUtils.DeepEquals(expectedCodeList, fileContent));
    }

    [Theory]
    [InlineData("org-content", "codeListString")]
    public async Task UpdateCodeList_WithExistingCodeList_ShouldUpdateCodeList(string repository, string codeListId)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        AltinnOrgGitRepository altinnOrgGitRepository = await PrepareRepositoryForTest(repository);
        List<Option> updatedCodeList = [new() { Label = "someLabel", Value = "updated Value!", }];
        string expectedCodeList = JsonSerializer.Serialize(updatedCodeList, s_jsonOptions);

        // Act
        await altinnOrgGitRepository.UpdateCodeList(codeListId, updatedCodeList);

        // Assert
        string fileContent = TestDataHelper.GetFileFromRepo(TargetOrg, targetRepository, Developer, RelativePathCodeList(codeListId));
        Assert.True(JsonUtils.DeepEquals(expectedCodeList, fileContent));
    }

    [Theory]
    [InlineData("org-content", "codeListString", "new-id")]
    public async Task UpdateCodeListId_WithExistingCodeList_ShouldUpdateCodeListId(string repository, string codeListId, string newCodeListId)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        AltinnOrgGitRepository altinnOrgGitRepository = await PrepareRepositoryForTest(repository);

        // Act
        altinnOrgGitRepository.UpdateCodeListId(codeListId, newCodeListId);

        // Assert
        string repositoryDir = TestDataHelper.GetTestDataRepositoryDirectory(TargetOrg, targetRepository, Developer);
        string oldCodeListFilePath = Path.Join(repositoryDir, RelativePathCodeList(codeListId));
        string newCodeListFilePath = Path.Join(repositoryDir, RelativePathCodeList(newCodeListId));
        Assert.False(File.Exists(oldCodeListFilePath));
        Assert.True(File.Exists(newCodeListFilePath));
    }

    [Theory]
    [InlineData("org-content", "codeListString", "codeListNumber")]
    public async Task UpdateCodeListId_WithExistingCodeList_ShouldThrowInvalidOperationException_WhenTargetCodeListAlreadyExists(
        string repository,
        string codeListId,
        string newCodeListId
    )
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        AltinnOrgGitRepository altinnOrgGitRepository = await PrepareRepositoryForTest(repository);

        // Act and assert
        Assert.Throws<InvalidOperationException>(() => altinnOrgGitRepository.UpdateCodeListId(codeListId, newCodeListId));
    }

    [Theory]
    [InlineData("org-content", "non-existing-code-list-id", "new-id")]
    public async Task UpdateCodeListId_WithNonExistingCodeList_ShouldThrowNotfoundException(
        string repository,
        string codeListId,
        string newCodeListId
    )
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        AltinnOrgGitRepository altinnOrgGitRepository = await PrepareRepositoryForTest(repository);

        // Act and assert
        Assert.Throws<NotFoundException>(() => altinnOrgGitRepository.UpdateCodeListId(codeListId, newCodeListId));
    }

    [Theory]
    [InlineData("org-content", "codeListTrailingComma")]
    public async Task DeleteCodeList_WithExistingCodeList_ShouldDeleteCodeList(string repository, string codeListId)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        AltinnOrgGitRepository altinnOrgGitRepository = await PrepareRepositoryForTest(repository);

        // Act
        altinnOrgGitRepository.DeleteCodeList(codeListId);

        // Assert
        string repositoryDir = TestDataHelper.GetTestDataRepositoryDirectory(TargetOrg, targetRepository, Developer);
        string codeListFilePath = Path.Join(repositoryDir, RelativePathCodeList(codeListId));
        Assert.False(File.Exists(codeListFilePath));
    }

    private static string RelativePathCodeList(string codeListId) => $"CodeLists/{codeListId}.json";

    private static string RelativePathText(string lang) => $"Texts/resource.{lang}.json";

    private async Task<AltinnOrgGitRepository> PrepareRepositoryForTest(string repository)
    {
        string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
        string targetRepository = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, repository, TargetOrg, targetRepository);
        string repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(TargetOrg, targetRepository, Developer);
        var altinnOrgGitRepository = new AltinnOrgGitRepository(TargetOrg, targetRepository, Developer, repositoriesRootDirectory, repositoryDirectory);

        return altinnOrgGitRepository;
    }

    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public void Dispose()
    {
        if (!string.IsNullOrEmpty(TargetOrg))
        {
            TestDataHelper.DeleteOrgDirectory(Developer, TargetOrg);
        }
    }
}
