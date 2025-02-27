using System;
using System.Collections.Generic;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation.Organisation;
using Designer.Tests.Utils;
using LibGit2Sharp;
using SharedResources.Tests;
using Xunit;
using TextResource = Altinn.Studio.Designer.Models.TextResource;

namespace Designer.Tests.Services;

public class OrgTextsServiceTests : IDisposable
{
    private string TargetOrg { get; set; }

    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Theory]
    [InlineData("org-content", "nb")]
    public async Task GetText_ShouldReturnAllTexts(string repo, string lang)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepo = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, repo, TargetOrg, targetRepo);
        var service = GetOrgTextsService();

        TextResource expectedTextResource = GetInitialTextResources();
        string expectedTextResourceJson = JsonSerializer.Serialize(expectedTextResource, _jsonOptions);

        // Act
        TextResource fetchedTexts = await service.GetText(TargetOrg, Developer, lang);

        // Assert
        Assert.Equal(lang, fetchedTexts.Language);
        string actualContent = JsonSerializer.Serialize(fetchedTexts, _jsonOptions);
        Assert.True(JsonUtils.DeepEquals(expectedTextResourceJson, actualContent));
    }

    [Theory]
    [InlineData("org-content", "sr")]
    public async Task GetText_ShouldReturnNotFoundException_WhenFileDoesNotExist(string repo, string lang)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepo = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, repo, TargetOrg, targetRepo);
        var service = GetOrgTextsService();

        // Act and assert
        await Assert.ThrowsAsync<NotFoundException>(async () => await service.GetText(TargetOrg, Developer, lang));
    }

    [Theory]
    [InlineData("org-content-empty", "nb")]
    public async Task SaveText_ShouldCreateTextFile(string repo, string lang)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepo = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, repo, TargetOrg, targetRepo);
        var service = GetOrgTextsService();

        List<TextResourceElement> newResourceElements = [new() { Id = "newId", Value = "newValue" }];
        TextResource newTextResource = new() { Language = lang, Resources = newResourceElements };

        // Act
        await service.SaveText(TargetOrg, Developer, newTextResource, lang);

        // Assert
        string actualContent = TestDataHelper.GetFileFromRepo(TargetOrg, targetRepo, Developer, RelativePath(lang));
        TextResource actualResource = JsonSerializer.Deserialize<TextResource>(actualContent, _jsonOptions);
        Assert.Equal(newTextResource.Resources[0].Id, actualResource.Resources[0].Id);
        Assert.Equal(newTextResource.Resources[0].Value, actualResource.Resources[0].Value);
    }

    [Theory]
    [InlineData("org-content", "nb")]
    public async Task UpdateTextsForKeys_ShouldUpdateExistingId(string repo, string lang)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepo = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, repo, TargetOrg, targetRepo);
        var service = GetOrgTextsService();

        const string editedValue = "edited value!";
        const string editedId = "someId";
        Dictionary<string, string> newTextIds = new()
        {
            { editedId, editedValue },
        };
        TextResource expectedTextResources = GetInitialTextResources();
        expectedTextResources.Resources.Find(e => e.Id == editedId).Value = editedValue;

        // Act
        await service.UpdateTextsForKeys(TargetOrg, Developer, newTextIds, lang);

        // Assert
        string actualContent = TestDataHelper.GetFileFromRepo(TargetOrg, targetRepo, Developer, RelativePath(lang));
        TextResource actualResource = JsonSerializer.Deserialize<TextResource>(actualContent, _jsonOptions);
        for (int i = 0; i < actualResource.Resources.Count; i++)
        {
            Assert.Equal(expectedTextResources.Resources[i].Id, actualResource.Resources[i].Id);
            Assert.Equal(expectedTextResources.Resources[i].Value, actualResource.Resources[i].Value);
        }
    }

    [Theory]
    [InlineData("org-content", "nb")]
    public async Task UpdateTextsForKeys_ShouldCreateNewIdWhenTextResourceDoesNotExit(string repo, string lang)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepo = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, repo, TargetOrg, targetRepo);
        var service = GetOrgTextsService();

        const string newId = "someNewId";
        const string newValue = "someNewValue";
        Dictionary<string, string> newTextIds = new()
        {
            { newId, newValue },
        };
        TextResource expectedTextResources = GetInitialTextResources();
        TextResourceElement expectedResourceElement = new() { Id = newId, Value = newValue };
        expectedTextResources.Resources.Add(expectedResourceElement);

        // Act
        await service.UpdateTextsForKeys(TargetOrg, Developer, newTextIds, lang);

        // Assert
        string actualContent = TestDataHelper.GetFileFromRepo(TargetOrg, targetRepo, Developer, RelativePath(lang));
        TextResource actualResource = JsonSerializer.Deserialize<TextResource>(actualContent, _jsonOptions);
        TextResourceElement newResourceElement = actualResource.Resources.Find(e => e.Id == newId);
        Assert.Equal(expectedResourceElement.Id, newResourceElement.Id);
        Assert.Equal(expectedResourceElement.Value, newResourceElement.Value);
    }

    [Theory]
    [InlineData("org-content", "nb")]
    public async Task UpdateTextsForKeys_ShouldUpdateTextWithVariables(string repo, string lang)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepo = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, repo, TargetOrg, targetRepo);
        var service = GetOrgTextsService();

        const string idOfItemToUpdate = "TextUsingVariables";
        const string newValue = "some value with variables number 1 '{0}' and 2 '{1}'";
        Dictionary<string, string> newTextIds = new()
        {
            { idOfItemToUpdate, newValue },
        };
        TextResource expectedTextResources = GetInitialTextResources();
        expectedTextResources.Resources.Find(e => e.Id == idOfItemToUpdate).Value = newValue;
        TextResourceElement expectedResourceElement = expectedTextResources.Resources.Find(e => e.Id == idOfItemToUpdate);

        // Act
        await service.UpdateTextsForKeys(TargetOrg, Developer, newTextIds, lang);

        // Assert
        string actualContent = TestDataHelper.GetFileFromRepo(TargetOrg, targetRepo, Developer, RelativePath(lang));
        TextResource actualResource = JsonSerializer.Deserialize<TextResource>(actualContent, _jsonOptions);
        TextResourceElement newResourceElement = actualResource.Resources.Find(e => e.Id == idOfItemToUpdate);
        Assert.Equal(expectedResourceElement.Id, newResourceElement.Id);
        Assert.Equal(expectedResourceElement.Value, newResourceElement.Value);
        Assert.Equal(expectedResourceElement.Variables.Count, newResourceElement.Variables.Count);
    }

    [Theory]
    [InlineData("org-content", "sr")]
    public async Task UpdateTextsForKeys_ShouldThrowExceptionWhenLanguageDoesNotExist(string repo, string lang)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepo = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, repo, TargetOrg, targetRepo);
        var service = GetOrgTextsService();

        Dictionary<string, string> newTextIds = new()
        {
            { "someNewId", "someNewValue" },
        };

        // Act and assert
        await Assert.ThrowsAsync<NotFoundException>(async () => await service.UpdateTextsForKeys(TargetOrg, Developer, newTextIds, lang));
    }

    private static OrgTextsService GetOrgTextsService()
    {
        AltinnGitRepositoryFactory altinnGitRepositoryFactory =
            new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        OrgTextsService service = new(altinnGitRepositoryFactory);

        return service;
    }

    private static string RelativePath(string language) => $"Texts/resource.{language}.json";

    public void Dispose()
    {
        if (!string.IsNullOrEmpty(TargetOrg))
        {
            TestDataHelper.DeleteOrgDirectory(Developer, TargetOrg);
        }
    }

    private static TextResource GetInitialTextResources(string language = "nb")
    {
        string fileContents = TestDataHelper.GetFileFromRepo(Org, "org-content", Developer, RelativePath(language));
        return JsonSerializer.Deserialize<TextResource>(fileContents, _jsonOptions);
    }

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };
}
