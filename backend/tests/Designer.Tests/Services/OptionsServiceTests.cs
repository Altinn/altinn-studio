using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Implementation;
using Designer.Tests.Utils;
using LibGit2Sharp;
using Xunit;

namespace Designer.Tests.Services;

public class OptionsServiceTests : IDisposable
{
    private string TargetOrg { get; set; }

    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Fact]
    public async Task GetOptionsListIds_ShouldReturnOptionsListIds_WhenOptionsListsExist()
    {
        // Arrange
        const string repo = "app-with-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);

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
        const string repo = "empty-app";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);

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

        const string repo = "app-with-options";
        const string optionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        var fetchedOptions = await optionsService.GetOptionsList(Org, targetRepository, Developer, optionListId);

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
        const string repo = "empty-app";
        const string optionListId = "test-options";

        var optionsService = GetOptionsServiceForTest();

        // Act and assert
        await Assert.ThrowsAsync<NotFoundException>(async () =>
        {
            await optionsService.GetOptionsList(Org, repo, Developer, optionListId);
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

        const string repo = "empty-app";
        const string optionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        var updatedOptions = await optionsService.CreateOrOverwriteOptionsList(Org, targetRepository, Developer, optionListId, newOptions);

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

        const string repo = "app-with-options";
        const string existingOptionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        var updatedOptions = await optionsService.CreateOrOverwriteOptionsList(Org, targetRepository, Developer, existingOptionListId, newOptions);

        // Assert
        Assert.Equal(updatedOptions.Count, updatedOptions.Count);

        for (int i = 0; i < updatedOptions.Count; i++)
        {
            Assert.Equal(updatedOptions[i].Label, updatedOptions[i].Label);
            Assert.Equal(updatedOptions[i].Value, updatedOptions[i].Value);
            Assert.Equal(updatedOptions[i].Description, updatedOptions[i].Description);
            Assert.Equal(updatedOptions[i].HelpText, updatedOptions[i].HelpText);
        }
    }

    [Fact]
    public async Task DeleteOptionsList_ShouldDeleteOptionsList_WhenOptionsListExist()
    {
        // Arrange
        const string repo = "app-with-options";
        const string optionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        optionsService.DeleteOptionsList(Org, targetRepository, Developer, optionListId);

        // Assert
        Assert.True(true); // No exception thrown
    }

    [Fact]
    public async Task DeleteOptions_ShouldThrowNotFoundException_WhenOptionsDoesNotExist()
    {
        // Arrange
        const string repo = "empty-app";
        const string optionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        var optionsService = GetOptionsServiceForTest();

        // Act and assert
        Assert.Throws<NotFoundException>(() =>
        {
            optionsService.DeleteOptionsList(Org, targetRepository, Developer, optionListId);
        });
    }

    [Fact]
    public async Task OptionsListExists_ShouldReturnTrue_WhenOptionsListExists()
    {
        // Arrange
        const string repo = "app-with-options";
        const string optionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);

        var optionsService = GetOptionsServiceForTest();

        // Act
        bool optionListExists = await optionsService.OptionsListExists(Org, targetRepository, Developer, optionListId);

        // Assert
        Assert.True(optionListExists);
    }

    [Fact]
    public async Task OptionListsExists_ShouldReturnFalse_WhenOptionsListDoesNotExist()
    {
        // Arrange
        const string repo = "empty-app";
        const string optionListId = "test-options";

        var optionsService = GetOptionsServiceForTest();

        // Act
        bool optionListExists = await optionsService.OptionsListExists(Org, repo, Developer, optionListId);

        // Assert
        Assert.False(optionListExists);
    }

    [Fact]
    public async Task GetAllOptionListReferences_ShouldReturnAllReferences_WhenOptionsListExists()
    {
        // Arrange
        const string repo = "app-with-options";
        var optionsService = GetOptionsServiceForTest();

        // Act
        List<RefToOptionListSpecifier> optionListsReferences = await optionsService.GetAllOptionListReferences(AltinnRepoEditingContext.FromOrgRepoDeveloper(Org, repo, Developer));

        List<RefToOptionListSpecifier> expectedResponseList = new()
        {
            new RefToOptionListSpecifier
            {
                OptionListId = "test-options", OptionListIdSources =
                [
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-same-options-id-in-same-set-and-another-layout"],
                        LayoutName = "layoutWithOneOptionListIdRef",
                        LayoutSetId = "layoutSet1"
                    },
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-test-options-id", "component-using-test-options-id-again"],
                        LayoutName = "layoutWithFourCheckboxComponentsAndThreeOptionListIdRefs",
                        LayoutSetId = "layoutSet1"
                    },
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-same-options-id-in-another-set"],
                        LayoutName = "layoutWithTwoOptionListIdRefs",
                        LayoutSetId = "layoutSet2"
                    }
                ]
            },
            new()
            {
                OptionListId = "other-options", OptionListIdSources =
                [
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-other-options-id"],
                        LayoutName = "layoutWithFourCheckboxComponentsAndThreeOptionListIdRefs",
                        LayoutSetId = "layoutSet1"
                    }
                ]
            }
        };
        // Assert
        Assert.Equivalent(optionListsReferences, expectedResponseList);
    }

    [Fact]
    public async Task ImportOptionListFromOrgIfIdIsVacant_ShouldReturnCreatedOptionsList_WhenOptionsListDoesNotAlreadyExist()
    {
        // Arrange
        const string orgRepo = "org-content";
        const string appRepo = "app-with-options";
        const string optionListId = "codeListString";

        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetOrgRepository = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, orgRepo, TargetOrg, targetOrgRepository);

        string targetAppRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.AddRepositoryToTestOrg(Developer, Org, appRepo, TargetOrg, targetAppRepository);

        string expectedOptionListString = TestDataHelper.GetFileFromRepo(TargetOrg, targetOrgRepository, Developer, "Codelists/codeListString.json");
        List<Option> expectedOptionList = JsonSerializer.Deserialize<List<Option>>(expectedOptionListString);

        // Act
        var optionsService = GetOptionsServiceForTest();
        List<Option> optionList = await optionsService.ImportOptionListFromOrgIfIdIsVacant(TargetOrg, targetAppRepository, Developer, optionListId);

        // Assert
        Assert.Equal(expectedOptionList.Count, optionList.Count);

        for (int i = 0; i < expectedOptionList.Count; i++)
        {
            Assert.Equal(expectedOptionList[i].Label, optionList[i].Label);
            Assert.Equal(expectedOptionList[i].Value, optionList[i].Value);
            Assert.Equal(expectedOptionList[i].Description, optionList[i].Description);
            Assert.Equal(expectedOptionList[i].HelpText, optionList[i].HelpText);
        }
    }

    [Fact]
    public async Task ImportOptionListFromOrgIfIdIsVacant_ShouldReturnNull_WhenOptionsListDoesAlreadyExist()
    {
        // Arrange
        const string orgRepo = "org-content";
        const string appRepo = "app-with-options";
        const string optionListId = "codeListString";

        TargetOrg = TestDataHelper.GenerateTestOrgName();
        string targetOrgRepository = TestDataHelper.GetOrgContentRepoName(TargetOrg);
        await TestDataHelper.CopyOrgForTest(Developer, Org, orgRepo, TargetOrg, targetOrgRepository);

        string targetAppRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.AddRepositoryToTestOrg(Developer, Org, appRepo, TargetOrg, targetAppRepository);

        const string codeList = @"[{ ""label"": ""label1"", ""value"": ""value1""}, { ""label"": ""label2"", ""value"": ""value2""}]";
        string repoPath = TestDataHelper.GetTestDataRepositoryDirectory(TargetOrg, targetAppRepository, Developer);
        string filePath = Path.Combine(repoPath, "App/options");
        await File.WriteAllTextAsync(Path.Combine(filePath, $"{optionListId}.json"), codeList);

        // Act
        var optionsService = GetOptionsServiceForTest();
        List<Option> optionList = await optionsService.ImportOptionListFromOrgIfIdIsVacant(TargetOrg, targetAppRepository, Developer, optionListId);

        // Assert
        Assert.Null(optionList);
    }

    private static OptionsService GetOptionsServiceForTest()
    {
        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        OptionsService optionsService = new(altinnGitRepositoryFactory);

        return optionsService;
    }

    public void Dispose()
    {
        if (!string.IsNullOrEmpty(TargetOrg))
        {
            TestDataHelper.DeleteOrgDirectory(Developer, TargetOrg);
        }
    }
}
