using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using MediatR;
using Moq;
using Xunit;

namespace Designer.Tests.Services;

public class LayoutServiceTests
{
    private const string Org = "ttd";
    private const string Developer = "testUser";

    [Fact]
    public async Task UsesGroup_ShouldReturnTrue_IfUsingGroups()
    {
        const string repo = "app-with-groups-and-taskNavigation";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            Org,
            targetRepository,
            Developer
        );

        LayoutService layoutService = GetLayoutServiceForTest();
        bool isLayoutUsingGroups = await layoutService.IsLayoutUsingPageGroups(
            editingContext,
            "form"
        );
        Assert.True(isLayoutUsingGroups);
    }

    [Fact]
    public async Task UsesGroup_ShouldReturnFalse_IfNotUsingGroups()
    {
        const string repo = "app-with-layoutsets";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            Org,
            targetRepository,
            Developer
        );

        LayoutService layoutService = GetLayoutServiceForTest();
        bool isLayoutUsingGroups = await layoutService.IsLayoutUsingPageGroups(
            editingContext,
            "layoutSet1"
        );
        Assert.False(isLayoutUsingGroups);
    }

    [Fact]
    public async Task OrderToPageGroupConversion_ShouldIncludeAllPages()
    {
        const string repo = "app-with-layoutsets";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            Org,
            targetRepository,
            Developer
        );

        LayoutService layoutService = GetLayoutServiceForTest();
        PagesDto pagesBeforeConvert = await layoutService.GetPagesByLayoutSetId(
            editingContext,
            "layoutSet1"
        );
        await layoutService.ConvertPagesToPageGroups(editingContext, "layoutSet1");
        Assert.True(await layoutService.IsLayoutUsingPageGroups(editingContext, "layoutSet1"));
        PagesDto pages = await layoutService.GetPagesByLayoutSetId(editingContext, "layoutSet1");

        Assert.Null(pages.Pages);
        Assert.Equal(
            pagesBeforeConvert.Pages.Count,
            pages.Groups.Select((group) => group.Pages).SelectMany(pages => pages).Count()
        );
        foreach (GroupDto group in pages.Groups)
        {
            foreach (PageDto page in group.Pages)
            {
                Assert.NotNull(page.Id);
            }
            Assert.Single(group.Pages);
        }
    }

    [Fact]
    public async Task PageGroupToOrderConversion_ShouldIncludeAllPages()
    {
        const string repo = "app-with-groups-and-taskNavigation";
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            Org,
            targetRepository,
            Developer
        );

        LayoutService layoutService = GetLayoutServiceForTest();
        PagesDto pagesBeforeConvert = await layoutService.GetPagesByLayoutSetId(
            editingContext,
            "form"
        );
        await layoutService.ConvertPageGroupsToPages(editingContext, "form");
        Assert.False(await layoutService.IsLayoutUsingPageGroups(editingContext, "form"));
        PagesDto pages = await layoutService.GetPagesByLayoutSetId(editingContext, "form");
        Assert.Equal(
            pages.Pages.Count,
            pagesBeforeConvert
                .Groups.Select((group) => group.Pages)
                .SelectMany(pages => pages)
                .Count()
        );
        foreach (PageDto page in pages.Pages)
        {
            Assert.NotNull(page.Id);
        }
        Assert.Null(pages.Groups);
    }

    private static LayoutService GetLayoutServiceForTest()
    {
        var appDevelopmentServiceMock = new Mock<IAppDevelopmentService>();
        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(
            TestDataHelper.GetTestDataRepositoriesRootDirectory()
        );
        var mediatr = new Mock<IPublisher>();
        LayoutService layoutService = new(
            altinnGitRepositoryFactory,
            mediatr.Object,
            appDevelopmentServiceMock.Object
        );

        return layoutService;
    }
}
