using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class OptionListReferenceServiceTests
{
    private const string OrgName = "ttd";
    private const string DeveloperName = "testUser";

    [Fact]
    public async Task GetAllOptionListReferences_ShouldReturnAllReferences_WhenOptionsListExists()
    {
        // Arrange
        const string RepoName = "app-with-options";
        var optionListReferenceService = GetOptionListReferenceServiceForTest();

        // Act
        List<RefToOptionListSpecifier> optionListsReferences = await optionListReferenceService.GetAllOptionListReferences(AltinnRepoEditingContext.FromOrgRepoDeveloper(OrgName, RepoName, DeveloperName));

        // Assert
        List<RefToOptionListSpecifier> expectedResponseList = OptionListReferenceTestDataWithTaskData();
        Assert.Equivalent(optionListsReferences, expectedResponseList);
    }

    [Fact]
    public async Task AddTaskDataToOptionListReferences_ShouldAddCorrectTaskData_WhenReferencesExist()
    {
        // Arrange
        const string RepoName = "app-with-options";
        var optionListReferenceService = GetOptionListReferenceServiceForTest();
        var repoEditingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(OrgName, RepoName, DeveloperName);
        List<RefToOptionListSpecifier> referencesWithoutTaskData = OptionListReferenceTestDataWithoutTaskData();

        // Act
        List<RefToOptionListSpecifier> result = await optionListReferenceService.AddTaskDataToOptionListReferences(repoEditingContext, referencesWithoutTaskData);

        // Assert
        List<RefToOptionListSpecifier> expectedResult = OptionListReferenceTestDataWithTaskData();
        Assert.Equivalent(result, expectedResult);
    }

    [Fact]
    public async Task AddTaskDataToOptionListReferences_ShouldReturnSameReferenceList_WhenGivenListIsEmpty()
    {
        // Arrange
        const string RepoName = "app-with-options";
        var optionListReferenceService = GetOptionListReferenceServiceForTest();
        var repoEditingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(OrgName, RepoName, DeveloperName);
        List<RefToOptionListSpecifier> emptyReferenceList = [];

        // Act
        List<RefToOptionListSpecifier> result = await optionListReferenceService.AddTaskDataToOptionListReferences(repoEditingContext, emptyReferenceList);

        // Assert
        Assert.Same(result, emptyReferenceList);
    }

    [Fact]
    public async Task AddTaskDataToOptionListReferences_ShouldReturnSameReferenceList_WhenLayoutSetsModelIsEmpty()
    {
        // Arrange
        const string RepoName = "app-with-options";
        var repoEditingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(OrgName, RepoName, DeveloperName);
        var appDevelopmentServiceMock = new Mock<IAppDevelopmentService>();
        appDevelopmentServiceMock.Setup(s => s.GetLayoutSetsExtended(repoEditingContext, new CancellationToken())).ReturnsAsync(new LayoutSetsModel());
        var optionListReferenceService = GetOptionListReferenceServiceForTestWithMockedAppDevelopmentService(appDevelopmentServiceMock);
        List<RefToOptionListSpecifier> referencesWithoutTaskData = OptionListReferenceTestDataWithoutTaskData();

        // Act
        List<RefToOptionListSpecifier> result = await optionListReferenceService.AddTaskDataToOptionListReferences(repoEditingContext, referencesWithoutTaskData);

        // Assert
        Assert.Same(result, referencesWithoutTaskData);
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

    private static OptionListReferenceService GetOptionListReferenceServiceForTest()
    {
        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        var schemaModelServiceMock = new Mock<ISchemaModelService>().Object;
        AppDevelopmentService appDevelopmentService = new(altinnGitRepositoryFactory, schemaModelServiceMock);
        OptionListReferenceService optionListReferenceService = new(altinnGitRepositoryFactory, appDevelopmentService);

        return optionListReferenceService;
    }

    private static OptionListReferenceService GetOptionListReferenceServiceForTestWithMockedAppDevelopmentService(Mock<IAppDevelopmentService> appDevelopmentServiceMock)
    {
        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());
        OptionListReferenceService optionListReferenceService = new(altinnGitRepositoryFactory, appDevelopmentServiceMock.Object);

        return optionListReferenceService;
    }
}
