using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using MediatR;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class OptionListReferenceServiceTests
{
    private const string OrgName = "ttd";
    private const string DeveloperName = "testUser";
    private const string V9RepoName = "app-with-options-v9";

    [Fact]
    public async Task GetAllOptionListReferences_ShouldReturnAllReferences_WhenOptionsListExists()
    {
        // Arrange
        const string RepoName = "app-with-options";
        var optionListReferenceService = GetOptionListReferenceServiceForTest();

        // Act
        List<OptionListReference> optionListsReferences = await optionListReferenceService.GetAllOptionListReferences(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(OrgName, RepoName, DeveloperName)
        );

        // Assert
        List<OptionListReference> expectedResponseList = OptionListReferenceTestData();
        Assert.Equivalent(expectedResponseList, optionListsReferences, strict: true);
    }

    [Fact]
    public async Task GetAllOptionListReferences_ShouldReturnReferencesInUiFolders_WhenAppIsV9()
    {
        // Arrange
        var optionListReferenceService = GetOptionListReferenceServiceForTest();
        List<OptionListReference> expectedResponseList =
        [
            new()
            {
                OptionListId = "fruits",
                OptionListIdSources =
                [
                    new OptionListIdSource
                    {
                        ComponentIds = ["dropdown-using-fruits", "checkboxes-using-fruits"],
                        LayoutName = "Side1",
                        LayoutSetId = "Task_1",
                        TaskId = "Task_1",
                        TaskType = "data",
                    },
                    new OptionListIdSource
                    {
                        ComponentIds = ["dropdown-in-signing-task"],
                        LayoutName = "Side1",
                        LayoutSetId = "Task_2",
                        TaskId = "Task_2",
                        TaskType = "signing",
                    },
                ],
            },
            new()
            {
                OptionListId = "colors",
                OptionListIdSources =
                [
                    new OptionListIdSource
                    {
                        ComponentIds = ["radio-using-colors"],
                        LayoutName = "Side2",
                        LayoutSetId = "Task_1",
                        TaskId = "Task_1",
                        TaskType = "data",
                    },
                    new OptionListIdSource
                    {
                        ComponentIds = ["dropdown-in-subform"],
                        LayoutName = "Side1",
                        LayoutSetId = "vehicleSubform",
                        TaskId = null,
                        TaskType = null,
                    },
                    new OptionListIdSource
                    {
                        ComponentIds = ["dropdown-in-unused-folder"],
                        LayoutName = "Side1",
                        LayoutSetId = "unusedFolder",
                        TaskId = null,
                        TaskType = null,
                    },
                ],
            },
        ];

        // Act
        List<OptionListReference> optionListReferences = await optionListReferenceService.GetAllOptionListReferences(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(OrgName, V9RepoName, DeveloperName)
        );

        // Assert
        Assert.Equivalent(expectedResponseList, optionListReferences, strict: true);
    }

    [Fact]
    public async Task GetAllOptionListReferences_ShouldReturnEmptyList_WhenV8AppHasNoLayoutSets()
    {
        // Arrange
        // The app has a component that uses its code list. The v8 code is frozen, and Designer has never searched
        // a v8 app without layout sets, so the list stays empty, as before, but without an exception.
        const string RepoName = "app-without-layoutsets-with-options";
        var optionListReferenceService = GetOptionListReferenceServiceForTest();

        // Act
        List<OptionListReference> optionListReferences = await optionListReferenceService.GetAllOptionListReferences(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(OrgName, RepoName, DeveloperName)
        );

        // Assert
        Assert.Empty(optionListReferences);
    }

    [Fact]
    public async Task GetAllOptionListReferences_ShouldReturnEmptyList_WhenAppHasNoOptionLists()
    {
        // Arrange
        const string RepoName = "app-with-layoutsets-v9";
        var optionListReferenceService = GetOptionListReferenceServiceForTest();

        // Act
        List<OptionListReference> optionListReferences = await optionListReferenceService.GetAllOptionListReferences(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(OrgName, RepoName, DeveloperName)
        );

        // Assert
        Assert.Empty(optionListReferences);
    }

    [Theory]
    [InlineData("app-with-options", "test-options", true)]
    [InlineData("app-with-options", "options-with-null-fields", false)]
    [InlineData(V9RepoName, "fruits", true)]
    [InlineData(V9RepoName, "colors", true)]
    [InlineData(V9RepoName, "unused-options", false)]
    [InlineData(V9RepoName, "not-in-the-app", false)]
    public async Task IsOptionListInUse_ShouldReturnWhetherAComponentUsesTheOptionList(
        string repoName,
        string optionListId,
        bool expectedInUse
    )
    {
        // Arrange
        var optionListReferenceService = GetOptionListReferenceServiceForTest();

        // Act
        bool isInUse = await optionListReferenceService.IsOptionListInUse(
            AltinnRepoEditingContext.FromOrgRepoDeveloper(OrgName, repoName, DeveloperName),
            optionListId
        );

        // Assert
        Assert.Equal(expectedInUse, isInUse);
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
                        TaskType = "data",
                    },
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-test-options-id", "component-using-test-options-id-again"],
                        LayoutName = "layoutWithFourCheckboxComponentsAndThreeOptionListIdRefs",
                        LayoutSetId = "layoutSet1",
                        TaskId = "Task_1",
                        TaskType = "data",
                    },
                    new OptionListIdSource
                    {
                        ComponentIds = ["component-using-same-options-id-in-another-set"],
                        LayoutName = "layoutWithTwoOptionListIdRefs",
                        LayoutSetId = "layoutSet2",
                        TaskId = "Task_2",
                        TaskType = "data",
                    },
                ],
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
                        TaskType = "data",
                    },
                ],
            },
        };
    }

    private static OptionListReferenceService GetOptionListReferenceServiceForTest()
    {
        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(
            TestDataHelper.GetTestDataRepositoriesRootDirectory()
        );
        AppVersionService appVersionService = new(altinnGitRepositoryFactory);
        AppDevelopmentService appDevelopmentService = new(
            altinnGitRepositoryFactory,
            new Mock<ISchemaModelService>().Object,
            appVersionService
        );
        UiFoldersService uiFoldersService = new(
            altinnGitRepositoryFactory,
            new Mock<IProcessModelingService>().Object,
            new Mock<IPublisher>().Object,
            NullLogger<UiFoldersService>.Instance
        );

        return new OptionListReferenceService(
            altinnGitRepositoryFactory,
            appDevelopmentService,
            appVersionService,
            uiFoldersService
        );
    }
}
