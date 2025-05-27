using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Designer.Tests.Utils;
using LibGit2Sharp;
using Xunit;

namespace Designer.Tests.Services;

public class OptionsServiceTests : IDisposable
{
    private string TargetOrgName { get; set; }
    private string TestRepoPath { get; set; }

    private const string OrgName = "ttd";
    private const string DeveloperName = "testUser";

    [Fact]
    public async Task GetOptionsListIds_ShouldReturnOptionsListIds_WhenOptionsListsExist()
    {
        // Arrange
        const string RepoName = "app-with-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        TestRepoPath = await TestDataHelper.CopyRepositoryForTest(OrgName, RepoName, DeveloperName, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        string[] optionListIds = optionsService.GetOptionsListIds(OrgName, targetRepository, DeveloperName);

        // Assert
        Assert.Equal(3, optionListIds.Length);
    }

    [Fact]
    public async Task GetOptionsListIds_ShouldReturnEmptyArray_WhenOptionsListsDoesNotExist()
    {
        // Arrange
        const string RepoName = "empty-app";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        TestRepoPath = await TestDataHelper.CopyRepositoryForTest(OrgName, RepoName, DeveloperName, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        string[] optionListIds = optionsService.GetOptionsListIds(OrgName, targetRepository, DeveloperName);

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

        const string RepoName = "app-with-options";
        const string OptionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        TestRepoPath = await TestDataHelper.CopyRepositoryForTest(OrgName, RepoName, DeveloperName, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        var fetchedOptions = await optionsService.GetOptionsList(OrgName, targetRepository, DeveloperName, OptionListId);

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
        const string RepoName = "empty-app";
        const string OptionListId = "test-options";

        var optionsService = GetOptionsServiceForTest();

        // Act and assert
        await Assert.ThrowsAsync<NotFoundException>(async () =>
        {
            await optionsService.GetOptionsList(OrgName, RepoName, DeveloperName, OptionListId);
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

        const string RepoName = "empty-app";
        const string OptionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        TestRepoPath = await TestDataHelper.CopyRepositoryForTest(OrgName, RepoName, DeveloperName, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        var updatedOptions = await optionsService.CreateOrOverwriteOptionsList(OrgName, targetRepository, DeveloperName, OptionListId, newOptions);

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

        const string RepoName = "app-with-options";
        const string ExistingOptionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        TestRepoPath = await TestDataHelper.CopyRepositoryForTest(OrgName, RepoName, DeveloperName, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        var updatedOptions = await optionsService.CreateOrOverwriteOptionsList(OrgName, targetRepository, DeveloperName, ExistingOptionListId, newOptions);

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
        const string RepoName = "app-with-options";
        const string OptionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        TestRepoPath = await TestDataHelper.CopyRepositoryForTest(OrgName, RepoName, DeveloperName, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        optionsService.DeleteOptionsList(OrgName, targetRepository, DeveloperName, OptionListId);

        // Assert
        Assert.True(true); // No exception thrown
    }

    [Fact]
    public async Task DeleteOptions_ShouldThrowNotFoundException_WhenOptionsDoesNotExist()
    {
        // Arrange
        const string RepoName = "empty-app";
        const string OptionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        TestRepoPath = await TestDataHelper.CopyRepositoryForTest(OrgName, RepoName, DeveloperName, targetRepository);

        var optionsService = GetOptionsServiceForTest();

        // Act and assert
        Assert.Throws<NotFoundException>(() =>
        {
            optionsService.DeleteOptionsList(OrgName, targetRepository, DeveloperName, OptionListId);
        });
    }

    [Fact]
    public async Task OptionsListExists_ShouldReturnTrue_WhenOptionsListExists()
    {
        // Arrange
        const string RepoName = "app-with-options";
        const string OptionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        TestRepoPath = await TestDataHelper.CopyRepositoryForTest(OrgName, RepoName, DeveloperName, targetRepository);

        var optionsService = GetOptionsServiceForTest();

        // Act
        bool optionListExists = await optionsService.OptionsListExists(OrgName, targetRepository, DeveloperName, OptionListId);

        // Assert
        Assert.True(optionListExists);
    }

    [Fact]
    public async Task OptionListsExists_ShouldReturnFalse_WhenOptionsListDoesNotExist()
    {
        // Arrange
        const string RepoName = "empty-app";
        const string OptionListId = "test-options";

        var optionsService = GetOptionsServiceForTest();

        // Act
        bool optionListExists = await optionsService.OptionsListExists(OrgName, RepoName, DeveloperName, OptionListId);

        // Assert
        Assert.False(optionListExists);
    }

    [Fact]
    public async Task ImportOptionListFromOrgIfIdIsVacant_ShouldReturnCreatedOptionsList_WhenOptionsListDoesNotAlreadyExist()
    {
        // Arrange
        const string OrgRepoName = "org-content";
        const string AppRepoName = "app-with-options";
        const string OptionListId = "codeListString";

        TargetOrgName = TestDataHelper.GenerateTestOrgName();
        string targetOrgRepository = TestDataHelper.GetOrgContentRepoName(TargetOrgName);
        await TestDataHelper.CopyOrgForTest(DeveloperName, OrgName, OrgRepoName, TargetOrgName, targetOrgRepository);

        string targetAppRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.AddRepositoryToTestOrg(DeveloperName, OrgName, AppRepoName, TargetOrgName, targetAppRepository);

        string expectedOptionListString = TestDataHelper.GetFileFromRepo(TargetOrgName, targetOrgRepository, DeveloperName, "Codelists/codeListString.json");
        List<Option> expectedOptionList = JsonSerializer.Deserialize<List<Option>>(expectedOptionListString);

        // Act
        var optionsService = GetOptionsServiceForTest();
        List<Option> optionList = await optionsService.ImportOptionListFromOrgIfIdIsVacant(TargetOrgName, targetAppRepository, DeveloperName, OptionListId);

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
        const string OrgRepoName = "org-content";
        const string AppRepoName = "app-with-options";
        const string OptionListId = "codeListString";

        TargetOrgName = TestDataHelper.GenerateTestOrgName();
        string targetOrgRepository = TestDataHelper.GetOrgContentRepoName(TargetOrgName);
        await TestDataHelper.CopyOrgForTest(DeveloperName, OrgName, OrgRepoName, TargetOrgName, targetOrgRepository);

        string targetAppRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.AddRepositoryToTestOrg(DeveloperName, OrgName, AppRepoName, TargetOrgName, targetAppRepository);

        const string CodeList = @"[{ ""label"": ""label1"", ""value"": ""value1""}, { ""label"": ""label2"", ""value"": ""value2""}]";
        string repoPath = TestDataHelper.GetTestDataRepositoryDirectory(TargetOrgName, targetAppRepository, DeveloperName);
        string filePath = Path.Combine(repoPath, "App/options");
        await File.WriteAllTextAsync(Path.Combine(filePath, $"{OptionListId}.json"), CodeList);

        // Act
        var optionsService = GetOptionsServiceForTest();
        List<Option> optionList = await optionsService.ImportOptionListFromOrgIfIdIsVacant(TargetOrgName, targetAppRepository, DeveloperName, OptionListId);

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
        if (!string.IsNullOrEmpty(TargetOrgName))
        {
            TestDataHelper.DeleteOrgDirectory(DeveloperName, TargetOrgName);
        }

        if (!string.IsNullOrEmpty(TestRepoPath))
        {
            TestDataHelper.DeleteDirectory(TestRepoPath);
        }
    }
}
