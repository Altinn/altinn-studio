using System;
using System.Collections.Generic;
using System.IO;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
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
    private string _targetOrgName { get; set; }
    private string _testRepoPath { get; set; }

    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Fact]
    public async Task GetOptionsListIds_ShouldReturnOptionsListIds_WhenOptionsListsExist()
    {
        // Arrange
        const string Repo = "app-with-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        _testRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

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
        _testRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

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
        _testRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

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
        _testRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

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
        _testRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

        // Act
        var optionsService = GetOptionsServiceForTest();
        var updatedOptions = await optionsService.CreateOrOverwriteOptionsList(Org, targetRepository, Developer, ExistingOptionListId, newOptions);

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
        const string Repo = "app-with-options";
        const string OptionListId = "test-options";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        _testRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

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
        _testRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

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
        _testRepoPath = await TestDataHelper.CopyRepositoryForTest(Org, Repo, Developer, targetRepository);

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
    public async Task GetAllOptionListReferences_ShouldReturnAllReferences_WhenOptionsListExists()
    {
        // Arrange
        const string Repo = "app-with-options";
        var optionsService = GetOptionsServiceForTest();

        // Act
        List<RefToOptionListSpecifier> optionListsReferences = await optionsService.GetAllOptionListReferences(AltinnRepoEditingContext.FromOrgRepoDeveloper(Org, Repo, Developer));

        // Assert
        List<RefToOptionListSpecifier> expectedResponseList = OptionListReferenceTestDataWithTaskData();
        Assert.Equivalent(optionListsReferences, expectedResponseList);
    }

    [Fact]
    public async Task AddTaskDataToOptionListReferences_ShouldAddCorrectTaskData_WhenReferencesExist()
    {
        // Arrange
        const string Repo = "app-with-options";
        var optionsService = GetOptionsServiceForTest();
        var repoEditingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(Org, Repo, Developer);
        List<RefToOptionListSpecifier> referencesWithoutTaskData = OptionListReferenceTestDataWithoutTaskData();

        // Act
        List<RefToOptionListSpecifier> result = await optionsService.AddTaskDataToOptionListReferences(repoEditingContext, referencesWithoutTaskData);

        // Assert
        List<RefToOptionListSpecifier> expectedResult = OptionListReferenceTestDataWithTaskData();
        Assert.Equivalent(result, expectedResult);
    }

    [Fact]
    public async Task AddTaskDataToOptionListReferences_ShouldReturnSameReferenceList_WhenGivenListIsEmpty()
    {
        // Arrange
        const string Repo = "app-with-options";
        var optionsService = GetOptionsServiceForTest();
        var repoEditingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(Org, Repo, Developer);
        List<RefToOptionListSpecifier> emptyReferenceList = [];

        // Act
        List<RefToOptionListSpecifier> result = await optionsService.AddTaskDataToOptionListReferences(repoEditingContext, emptyReferenceList);

        // Assert
        Assert.Same(result, emptyReferenceList);
    }

    [Fact]
    public async Task AddTaskDataToOptionListReferences_ShouldReturnSameReferenceList_WhenLayoutSetsModelIsEmpty()
    {
        // Arrange
        const string Repo = "app-with-options";
        var repoEditingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(Org, Repo, Developer);
        var appDevelopmentServiceMock = new Mock<IAppDevelopmentService>();
        appDevelopmentServiceMock.Setup(s => s.GetLayoutSetsExtended(repoEditingContext, new CancellationToken())).ReturnsAsync(new LayoutSetsModel());
        var optionsService = GetOptionsServiceForTestWithMockedAppDevelopmentService(appDevelopmentServiceMock);
        List<RefToOptionListSpecifier> referencesWithoutTaskData = OptionListReferenceTestDataWithoutTaskData();

        // Act
        List<RefToOptionListSpecifier> result = await optionsService.AddTaskDataToOptionListReferences(repoEditingContext, referencesWithoutTaskData);

        // Assert
        Assert.Same(result, referencesWithoutTaskData);
    }

    [Fact]
    public async Task ImportOptionListFromOrgIfIdIsVacant_ShouldReturnCreatedOptionsList_WhenOptionsListDoesNotAlreadyExist()
    {
        // Arrange
        const string OrgRepo = "org-content";
        const string AppRepo = "app-with-options";
        const string OptionListId = "codeListString";

        _targetOrgName = TestDataHelper.GenerateTestOrgName();
        string targetOrgRepository = TestDataHelper.GetOrgContentRepoName(_targetOrgName);
        await TestDataHelper.CopyOrgForTest(Developer, Org, OrgRepo, _targetOrgName, targetOrgRepository);

        string targetAppRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.AddRepositoryToTestOrg(Developer, Org, AppRepo, _targetOrgName, targetAppRepository);

        string expectedOptionListString = TestDataHelper.GetFileFromRepo(_targetOrgName, targetOrgRepository, Developer, "Codelists/codeListString.json");
        List<Option> expectedOptionList = JsonSerializer.Deserialize<List<Option>>(expectedOptionListString);

        // Act
        var optionsService = GetOptionsServiceForTest();
        List<Option> optionList = await optionsService.ImportOptionListFromOrgIfIdIsVacant(_targetOrgName, targetAppRepository, Developer, OptionListId);

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
        const string OrgRepo = "org-content";
        const string AppRepo = "app-with-options";
        const string OptionListId = "codeListString";

        _targetOrgName = TestDataHelper.GenerateTestOrgName();
        string targetOrgRepository = TestDataHelper.GetOrgContentRepoName(_targetOrgName);
        await TestDataHelper.CopyOrgForTest(Developer, Org, OrgRepo, _targetOrgName, targetOrgRepository);

        string targetAppRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.AddRepositoryToTestOrg(Developer, Org, AppRepo, _targetOrgName, targetAppRepository);

        const string CodeList = @"[{ ""label"": ""label1"", ""value"": ""value1""}, { ""label"": ""label2"", ""value"": ""value2""}]";
        string repoPath = TestDataHelper.GetTestDataRepositoryDirectory(_targetOrgName, targetAppRepository, Developer);
        string filePath = Path.Combine(repoPath, "App/options");
        await File.WriteAllTextAsync(Path.Combine(filePath, $"{OptionListId}.json"), CodeList);

        // Act
        var optionsService = GetOptionsServiceForTest();
        List<Option> optionList = await optionsService.ImportOptionListFromOrgIfIdIsVacant(_targetOrgName, targetAppRepository, Developer, OptionListId);

        // Assert
        Assert.Null(optionList);
    }

    private List<RefToOptionListSpecifier> OptionListReferenceTestDataWithoutTaskData()
    {
        return new List<RefToOptionListSpecifier>
        {
            new RefToOptionListSpecifier
            {
                OptionListId = "test-options",
                OptionListIdSources =
                [
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-same-options-id-in-same-set-and-another-layout"],
                        LayoutName = "layoutWithOneOptionListIdRef",
                        LayoutSetId = "layoutSet1",
                    },
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-test-options-id", "component-using-test-options-id-again"],
                        LayoutName = "layoutWithFourCheckboxComponentsAndThreeOptionListIdRefs",
                        LayoutSetId = "layoutSet1",
                    },
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-same-options-id-in-another-set"],
                        LayoutName = "layoutWithTwoOptionListIdRefs",
                        LayoutSetId = "layoutSet2",
                    }
                ]
            },
            new RefToOptionListSpecifier
            {
                OptionListId = "other-options",
                OptionListIdSources =
                [
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-other-options-id"],
                        LayoutName = "layoutWithFourCheckboxComponentsAndThreeOptionListIdRefs",
                        LayoutSetId = "layoutSet1",
                    }
                ]
            }
        };
    }

    private List<RefToOptionListSpecifier> OptionListReferenceTestDataWithTaskData()
    {
        return new List<RefToOptionListSpecifier>
        {
            new RefToOptionListSpecifier
            {
                OptionListId = "test-options",
                OptionListIdSources =
                [
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-same-options-id-in-same-set-and-another-layout"],
                        LayoutName = "layoutWithOneOptionListIdRef",
                        LayoutSetId = "layoutSet1",
                        TaskId = "Task_1",
                        TaskType = "data"
                    },
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-test-options-id", "component-using-test-options-id-again"],
                        LayoutName = "layoutWithFourCheckboxComponentsAndThreeOptionListIdRefs",
                        LayoutSetId = "layoutSet1",
                        TaskId = "Task_1",
                        TaskType = "data"
                    },
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-same-options-id-in-another-set"],
                        LayoutName = "layoutWithTwoOptionListIdRefs",
                        LayoutSetId = "layoutSet2",
                        TaskId = "Task_2",
                        TaskType = "data"
                    }
                ]
            },
            new RefToOptionListSpecifier
            {
                OptionListId = "other-options",
                OptionListIdSources =
                [
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-other-options-id"],
                        LayoutName = "layoutWithFourCheckboxComponentsAndThreeOptionListIdRefs",
                        LayoutSetId = "layoutSet1",
                        TaskId = "Task_1",
                        TaskType = "data"
                    }
                ]
            }
        };
    }

    private static OptionsService GetOptionsServiceForTest()
    {
        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        var schemaModelServiceMock = new Mock<ISchemaModelService>().Object;
        AppDevelopmentService appDevelopmentService = new(altinnGitRepositoryFactory, schemaModelServiceMock);
        OptionsService optionsService = new(altinnGitRepositoryFactory, appDevelopmentService);

        return optionsService;
    }



    private static OptionsService GetOptionsServiceForTestWithMockedAppDevelopmentService(Mock<IAppDevelopmentService> appDevelopmentServiceMock)
    {
        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        OptionsService optionsService = new(altinnGitRepositoryFactory, appDevelopmentServiceMock.Object);

        return optionsService;
    }

    public void Dispose()
    {
        if (!string.IsNullOrEmpty(_targetOrgName))
        {
            TestDataHelper.DeleteOrgDirectory(Developer, _targetOrgName);
        }

        if (!string.IsNullOrEmpty(_testRepoPath))
        {
            TestDataHelper.DeleteDirectory(_testRepoPath);
        }
    }
}
