using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Text.Json;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Exceptions.AppDevelopment;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using LibGit2Sharp;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class OptionsServiceTests : IDisposable
{
    private readonly Mock<IGiteaContentLibraryService> _giteaContentLibraryServiceMock;
    private string TargetOrgName { get; set; }
    private string TestRepoPath { get; set; }

    private const string Org = "ttd";
    private const string Developer = "testUser";
    private const bool OverrideExistingTextResources = false;
    private const string CodeListFolderPath = "CodeLists/";
    private const string TextResourceFolderPath = "Texts/";

    private static readonly JsonSerializerOptions s_jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true
    };

    public OptionsServiceTests()
    {
        _giteaContentLibraryServiceMock = new Mock<IGiteaContentLibraryService>();
    }

    [Fact]
    public async Task GetOptionsListIds_ShouldReturnOptionsListIds_WhenOptionsListsExist()
    {
        // Arrange
        const string Repo = "app-with-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        TestRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        string[] optionListIds = optionsService.GetOptionsListIds(Org, targetRepository, Developer);

        // Assert
        Assert.Equal(3, optionListIds.Length);
    }

    [Fact]
    public async Task GetOptionsListIds_ShouldReturnEmptyArray_WhenOptionsListsDoesNotExist()
    {
        // Arrange
        const string Repo = "empty-app";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        TestRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        string[] optionListIds = optionsService.GetOptionsListIds(Org, targetRepository, Developer);

        // Assert
        Assert.Empty(optionListIds);
    }

    [Fact]
    public async Task GetOptionsList_ShouldReturnOptionsList_WhenOptionsExists()
    {
        // Arrange
        var expectedOptions = new List<Option>
        {
            new Option
            {
                Label = "label1",
                Value = "value1",
            },
            new Option
            {
                Label = "label2",
                Value = "value2",
            }
        };

        const string Repo = "app-with-options";
        const string OptionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        TestRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        var fetchedOptions = await optionsService.GetOptionsList(Org, targetRepository, Developer, OptionListId);

        // Assert
        Assert.Equal(expectedOptions.Count, fetchedOptions.Count);

        for (int i = 0; i < expectedOptions.Count; i++)
        {
            Assert.Equal(expectedOptions[i].Label, fetchedOptions[i].Label);
            Assert.Equal(expectedOptions[i].Value, fetchedOptions[i].Value);
            Assert.Equal(expectedOptions[i].Description, fetchedOptions[i].Description);
            Assert.Equal(expectedOptions[i].HelpText, fetchedOptions[i].HelpText);
        }
    }

    [Fact]
    public async Task GetOptionsList_ShouldThrowNotFoundException_WhenOptionsListDoesNotExist()
    {
        // Arrange
        const string Repo = "empty-app";
        const string OptionListId = "test-options";

        var optionsService = GetOptionsServiceForTest();

        // Act and assert
        await Assert.ThrowsAsync<NotFoundException>(async () =>
        {
            await optionsService.GetOptionsList(Org, Repo, Developer, OptionListId);
        });
    }

    [Fact]
    public async Task CreateOrOverwriteOptionsList_ShouldReturnUpdatedOptionsList_WhenOptionsListDoesNotAlreadyExist()
    {
        // Arrange
        var newOptions = new List<Option>
        {
            new Option
            {
                Label = "label1",
                Value = "value1",
            },
            new Option
            {
                Label = "label2",
                Value = "value2",
            }
        };

        const string Repo = "empty-app";
        const string OptionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        TestRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        var updatedOptions = await optionsService.CreateOrOverwriteOptionsList(Org, targetRepository, Developer, OptionListId, newOptions);

        // Assert
        Assert.Equal(newOptions.Count, updatedOptions.Count);

        for (int i = 0; i < updatedOptions.Count; i++)
        {
            Assert.Equal(newOptions[i].Label, updatedOptions[i].Label);
            Assert.Equal(newOptions[i].Value, updatedOptions[i].Value);
            Assert.Equal(newOptions[i].Description, updatedOptions[i].Description);
            Assert.Equal(newOptions[i].HelpText, updatedOptions[i].HelpText);
        }
    }

    [Fact]
    public async Task CreateOrOverwriteOptionsList_ShouldReturnUpdatedOptionsList_WhenOptionsAlreadyExist()
    {
        // Arrange
        var newOptions = new List<Option>
        {
            new Option
            {
                Label = "someNewOption",
                Value = "someNewValue",
            },
            new Option
            {
                Label = "label2",
                Value = "value2",
            }
        };

        const string Repo = "app-with-options";
        const string ExistingOptionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        TestRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        var updatedOptions = await optionsService.CreateOrOverwriteOptionsList(Org, targetRepository, Developer, ExistingOptionListId, newOptions);

        // Assert
        Assert.Equal(newOptions.Count, updatedOptions.Count);

        for (int i = 0; i < updatedOptions.Count; i++)
        {
            Assert.Equal(newOptions[i].Label, updatedOptions[i].Label);
            Assert.Equal(newOptions[i].Value, updatedOptions[i].Value);
            Assert.Equal(newOptions[i].Description, updatedOptions[i].Description);
            Assert.Equal(newOptions[i].HelpText, updatedOptions[i].HelpText);
        }
    }

    [Fact]
    public async Task DeleteOptionsList_ShouldDeleteOptionsList_WhenOptionsListExist()
    {
        // Arrange
        const string Repo = "app-with-options";
        const string OptionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        TestRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        optionsService.DeleteOptionsList(Org, targetRepository, Developer, OptionListId);

        // Assert
        Assert.True(true); // No exception thrown
    }

    [Fact]
    public async Task DeleteOptions_ShouldThrowNotFoundException_WhenOptionsDoesNotExist()
    {
        // Arrange
        const string Repo = "empty-app";
        const string OptionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        TestRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

        var optionsService = GetOptionsServiceForTest();

        // Act and assert
        Assert.Throws<NotFoundException>(() =>
        {
            optionsService.DeleteOptionsList(Org, targetRepository, Developer, OptionListId);
        });
    }

    [Fact]
    public async Task OptionsListExists_ShouldReturnTrue_WhenOptionsListExists()
    {
        // Arrange
        const string Repo = "app-with-options";
        const string OptionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        TestRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

        var optionsService = GetOptionsServiceForTest();

        // Act
        bool optionListExists = await optionsService.OptionsListExists(Org, targetRepository, Developer, OptionListId);

        // Assert
        Assert.True(optionListExists);
    }

    [Fact]
    public async Task OptionListsExists_ShouldReturnFalse_WhenOptionsListDoesNotExist()
    {
        // Arrange
        const string Repo = "empty-app";
        const string OptionListId = "test-options";

        var optionsService = GetOptionsServiceForTest();

        // Act
        bool optionListExists = await optionsService.OptionsListExists(Org, Repo, Developer, OptionListId);

        // Assert
        Assert.False(optionListExists);
    }

    [Fact]
    public async Task ImportOptionListFromOrg_ShouldReturnCreatedOptionsList_WhenOptionsListDoesNotAlreadyExist()
    {
        // Arrange
        const string OrgRepo = "org-content";
        const string AppRepo = "app-with-options";
        const string OptionListId = "codeListString";

        TargetOrgName = TestDataHelper.GenerateTestOrgName();
        string targetOrgRepository = TestDataHelper.GetOrgContentRepoName(TargetOrgName);
        await TestDataHelper.CopyOrgForTest(Developer, Org, OrgRepo, TargetOrgName, targetOrgRepository);

        string targetAppRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.AddRepositoryToTestOrg(Developer, Org, AppRepo, TargetOrgName, targetAppRepository);

        string expectedOptionListString = TestDataHelper.GetFileFromRepo(TargetOrgName, targetOrgRepository, Developer, Path.Join(CodeListFolderPath, $"{OptionListId}.json"));
        List<Option> expectedOptionList = JsonSerializer.Deserialize<List<Option>>(expectedOptionListString);

        const string NbLanguageCode = "nb";
        const string EnLanguageCode = "en";
        string nbExpectedTextResourceString = TestDataHelper.GetFileFromRepo(TargetOrgName, targetOrgRepository, Developer, Path.Join(TextResourceFolderPath, GetTextResourceFileName(NbLanguageCode)));
        string enExpectedTextResourceString = TestDataHelper.GetFileFromRepo(TargetOrgName, targetOrgRepository, Developer, Path.Join(TextResourceFolderPath, GetTextResourceFileName(EnLanguageCode)));
        TextResource nbExpectedTextResource = JsonSerializer.Deserialize<TextResource>(nbExpectedTextResourceString, s_jsonOptions);
        TextResource enExpectedTextResource = JsonSerializer.Deserialize<TextResource>(enExpectedTextResourceString, s_jsonOptions);

        _giteaContentLibraryServiceMock
            .Setup(service => service.GetCodeList(TargetOrgName, OptionListId))
            .Returns(Task.FromResult(expectedOptionList));
        _giteaContentLibraryServiceMock
            .Setup(service => service.GetLanguages(TargetOrgName))
            .ReturnsAsync([EnLanguageCode, NbLanguageCode]);
        _giteaContentLibraryServiceMock
            .Setup(service => service.GetTextResource(TargetOrgName, It.IsAny<string>()))
            .ReturnsAsync((string _, string languageCode) => languageCode.Contains(EnLanguageCode) ? enExpectedTextResource : nbExpectedTextResource);

        // Act
        var optionsService = GetOptionsServiceForTest();
        (List<OptionListData> optionListDataList, Dictionary<string, TextResource> textResources) = await optionsService.ImportOptionListFromOrg(TargetOrgName, targetAppRepository, Developer, OptionListId, OverrideExistingTextResources);
        List<Option> optionList = optionListDataList.Single(e => e.Title == OptionListId).Data!;

        // Assert
        Assert.Equal(expectedOptionList.Count, optionList.Count);

        for (int i = 0; i < expectedOptionList.Count; i++)
        {
            Assert.Equal(expectedOptionList[i].Label, optionList[i].Label);
            Assert.Equal(expectedOptionList[i].Value, optionList[i].Value);
            Assert.Equal(expectedOptionList[i].Description, optionList[i].Description);
            Assert.Equal(expectedOptionList[i].HelpText, optionList[i].HelpText);
        }

        Assert.Equal(2, textResources.Keys.Count);

        string actualAppSettingsString = TestDataHelper.GetFileFromRepo(TargetOrgName, targetAppRepository, Developer, ".altinnstudio/settings.json");
        AltinnStudioSettings actualAppSettings = JsonSerializer.Deserialize<AltinnStudioSettings>(
            actualAppSettingsString,
            new JsonSerializerOptions { Converters = { new JsonStringEnumConverter() } }
        );
        Assert.Equal($"{TargetOrgName}/{targetOrgRepository}", actualAppSettings.Imports.CodeLists[OptionListId].ImportSource);
        Assert.Empty(actualAppSettings.Imports.CodeLists[OptionListId].Version);
        Assert.Matches(@"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$", actualAppSettings.Imports.CodeLists[OptionListId].ImportDate);
    }

    [Fact]
    public async Task ImportOptionListFromOrg_ShouldThrowException_WhenOptionListAlreadyExist()
    {
        // Arrange
        const string OrgRepo = "org-content";
        const string AppRepo = "app-with-options";
        const string OptionListId = "codeListString";

        TargetOrgName = TestDataHelper.GenerateTestOrgName();
        string targetOrgRepository = TestDataHelper.GetOrgContentRepoName(TargetOrgName);
        await TestDataHelper.CopyOrgForTest(Developer, Org, OrgRepo, TargetOrgName, targetOrgRepository);

        string targetAppRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.AddRepositoryToTestOrg(Developer, Org, AppRepo, TargetOrgName, targetAppRepository);

        const string CodeList = @"[{ ""label"": ""label1"", ""value"": ""value1""}, { ""label"": ""label2"", ""value"": ""value2""}]";
        string repoPath = TestDataHelper.GetTestDataRepositoryDirectory(TargetOrgName, targetAppRepository, Developer);
        string filePath = Path.Join(repoPath, "App/options");
        await File.WriteAllTextAsync(Path.Join(filePath, $"{OptionListId}.json"), CodeList);

        // Act and assert
        var optionsService = GetOptionsServiceForTest();

        await Assert.ThrowsAsync<ConflictingFileNameException>(async () =>
        {
            await optionsService.ImportOptionListFromOrg(TargetOrgName, targetAppRepository, Developer, OptionListId, OverrideExistingTextResources);
        });
    }

    private OptionsService GetOptionsServiceForTest()
    {
        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        OptionsService optionsService = new(altinnGitRepositoryFactory, _giteaContentLibraryServiceMock.Object);

        return optionsService;
    }

    private static string GetTextResourceFileName(string languageCode)
    {
        return $"resource.{languageCode}.json";
    }

    public void Dispose()
    {
        if (!string.IsNullOrEmpty(TargetOrgName))
        {
            TestDataHelper.DeleteOrgDirectory(Developer, TargetOrgName);
        }

        if (!string.IsNullOrEmpty(TestRepoPath))
        {
            TestDataHelper.DeleteDirectory(TestRepoPath);
        }
    }
}
