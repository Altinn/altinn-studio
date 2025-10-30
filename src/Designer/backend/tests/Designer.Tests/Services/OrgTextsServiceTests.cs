#nullable disable
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
        string expectedTextResourceJson = JsonSerializer.Serialize(expectedTextResource, s_jsonOptions);

        // Act
        TextResource fetchedTexts = await service.GetText(TargetOrg, Developer, lang);

        // Assert
        Assert.Equal(lang, fetchedTexts.Language);
        string actualContent = JsonSerializer.Serialize(fetchedTexts, s_jsonOptions);
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
        TextResource actualResource = JsonSerializer.Deserialize<TextResource>(actualContent, s_jsonOptions);
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

        const string EditedValue = "edited value!";
        const string EditedId = "someId";
        Dictionary<string, string> newTextIds = new()
        {
            { EditedId, EditedValue },
        };
        TextResource expectedTextResources = GetInitialTextResources();
        expectedTextResources.Resources.Find(e => e.Id == EditedId).Value = EditedValue;

        // Act
        await service.UpdateTextsForKeys(TargetOrg, Developer, newTextIds, lang);

        // Assert
        string actualContent = TestDataHelper.GetFileFromRepo(TargetOrg, targetRepo, Developer, RelativePath(lang));
        TextResource actualResource = JsonSerializer.Deserialize<TextResource>(actualContent, s_jsonOptions);
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

        const string NewId = "someNewId";
        const string NewValue = "someNewValue";
        Dictionary<string, string> newTextIds = new()
        {
            { NewId, NewValue },
        };
        TextResource expectedTextResources = GetInitialTextResources();
        TextResourceElement expectedResourceElement = new() { Id = NewId, Value = NewValue };
        expectedTextResources.Resources.Add(expectedResourceElement);

        // Act
        await service.UpdateTextsForKeys(TargetOrg, Developer, newTextIds, lang);

        // Assert
        string actualContent = TestDataHelper.GetFileFromRepo(TargetOrg, targetRepo, Developer, RelativePath(lang));
        TextResource actualResource = JsonSerializer.Deserialize<TextResource>(actualContent, s_jsonOptions);
        TextResourceElement newResourceElement = actualResource.Resources.Find(e => e.Id == NewId);
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

        const string IdOfItemToUpdate = "TextUsingVariables";
        const string NewValue = "some value with variables number 1 '{0}' and 2 '{1}'";
        Dictionary<string, string> newTextIds = new()
        {
            { IdOfItemToUpdate, NewValue },
        };
        TextResource expectedTextResources = GetInitialTextResources();
        expectedTextResources.Resources.Find(e => e.Id == IdOfItemToUpdate).Value = NewValue;
        TextResourceElement expectedResourceElement = expectedTextResources.Resources.Find(e => e.Id == IdOfItemToUpdate);

        // Act
        await service.UpdateTextsForKeys(TargetOrg, Developer, newTextIds, lang);

        // Assert
        string actualContent = TestDataHelper.GetFileFromRepo(TargetOrg, targetRepo, Developer, RelativePath(lang));
        TextResource actualResource = JsonSerializer.Deserialize<TextResource>(actualContent, s_jsonOptions);
        TextResourceElement newResourceElement = actualResource.Resources.Find(e => e.Id == IdOfItemToUpdate);
        Assert.Equal(expectedResourceElement.Id, newResourceElement.Id);
        Assert.Equal(expectedResourceElement.Value, newResourceElement.Value);
        Assert.Equal(expectedResourceElement.Variables.Count, newResourceElement.Variables.Count);
    }

    [Theory]
    [InlineData("org-content", "sr")]
    public async Task UpdateTextsForKeys_ShouldCreateTextResourceFile_WhenFileDoesNotExist(string repo, string lang)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepo = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, repo, TargetOrg, targetRepo);
        var service = GetOrgTextsService();

        const string TextElementId = "someNewId";
        const string TextElementValue = "someNewValue";
        Dictionary<string, string> keyValuePairToUpdate = new()
        {
            { TextElementId, TextElementValue },
        };

        // Act
        await service.UpdateTextsForKeys(TargetOrg, Developer, keyValuePairToUpdate, lang);

        // Assert
        string actualContent = TestDataHelper.GetFileFromRepo(TargetOrg, targetRepo, Developer, RelativePath(lang));
        TextResource actualResource = JsonSerializer.Deserialize<TextResource>(actualContent, s_jsonOptions);
        Assert.Equal(lang, actualResource.Language);
        Assert.Single(actualResource.Resources);
        Assert.Equal(TextElementId, actualResource.Resources[0].Id);
        Assert.Equal(TextElementValue, actualResource.Resources[0].Value);
    }

    [Theory]
    [InlineData("org-content")]
    public async Task GetTextIds_ShouldReturnUniqueTextIds(string repo)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepo = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, repo, TargetOrg, targetRepo);
        var service = GetOrgTextsService();

        // Act
        List<string> textIds = await service.GetTextIds(TargetOrg, Developer);

        // Assert
        Assert.Equal(3, textIds.Count);
        Assert.NotEqual(textIds[0], textIds[1]);
    }

    [Theory]
    [InlineData("org-content-empty")]
    public async Task GetTextIds_ShouldReturnEmptyList_WhenTextIdsDoesNotExist(string repo)
    {
        // Arrange
        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetRepo = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, repo, TargetOrg, targetRepo);
        var service = GetOrgTextsService();

        // Act
        List<string> textIds = await service.GetTextIds(TargetOrg, Developer);

        // Assert
        Assert.Empty(textIds);
    }

    private static TextResource GetInitialTextResources(string language = "nb")
    {
        string fileContents = TestDataHelper.GetFileFromRepo(Org, "org-content", Developer, RelativePath(language));
        return JsonSerializer.Deserialize<TextResource>(fileContents, s_jsonOptions);
    }

    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        WriteIndented = true,
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull,
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

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
}
