using System.Collections.Generic;
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
        List<OptionListReference> optionListsReferences = await optionListReferenceService.GetAllOptionListReferences(AltinnRepoEditingContext.FromOrgRepoDeveloper(OrgName, RepoName, DeveloperName));

        // Assert
        List<OptionListReference> expectedResponseList = OptionListReferenceTestData();
        Assert.Equivalent(optionListsReferences, expectedResponseList);
    }

    [Fact]
    public async Task GetAllOptionListReferences_ShouldReturnAllReferences_WhenAppContainsASubform()
    {
        // Arrange
        const string RepoName = "app-with-groups-and-task-navigation";
        var optionListReferenceService = GetOptionListReferenceServiceForTest();
        List<OptionListReference> expectedResponseList = [
        new()
        {
           OptionListId = "yesNo",
           OptionListIdSources = [
               new OptionListIdSource {
                   ComponentIds = ["brand"],
                   LayoutName = "brand",
                   LayoutSetId = "subform",
                   TaskId = null,
                   TaskType = null
               }
           ]
        }];


        // Act
        List<OptionListReference> optionListReferences =
            await optionListReferenceService.GetAllOptionListReferences(
                AltinnRepoEditingContext.FromOrgRepoDeveloper(OrgName, RepoName, DeveloperName));

        // Assert
        Assert.Equivalent(optionListReferences, expectedResponseList);
    }

    private static List<OptionListReference> OptionListReferenceTestData()
    {
        return new List<OptionListReference>
        {
            new OptionListReference
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
            new OptionListReference
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
}
