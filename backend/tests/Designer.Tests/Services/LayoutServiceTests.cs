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
        Pages pagesBeforeConvert = await layoutService.GetPagesByLayoutSetId(
            editingContext,
            "layoutSet1"
        );
        await layoutService.ConvertPagesToPageGroups(editingContext, "layoutSet1");
        Assert.True(await layoutService.IsLayoutUsingPageGroups(editingContext, "layoutSet1"));
        Pages pages = await layoutService.GetPagesByLayoutSetId(editingContext, "layoutSet1");

        Assert.Null(pages.pages);
        Assert.Equal(
            pagesBeforeConvert.pages.Count,
            pages.groups.Select((group) => group.pages).SelectMany(pages => pages).Count()
        );
        foreach (Group group in pages.groups)
        {
            foreach (Page page in group.pages)
            {
                Assert.NotNull(page.id);
            }
            Assert.Single(group.pages);
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
        Pages pagesBeforeConvert = await layoutService.GetPagesByLayoutSetId(
            editingContext,
            "form"
        );
        await layoutService.ConvertPageGroupsToPages(editingContext, "form");
        Assert.False(await layoutService.IsLayoutUsingPageGroups(editingContext, "form"));
        Pages pages = await layoutService.GetPagesByLayoutSetId(editingContext, "form");
        Assert.Equal(
            pages.pages.Count,
            pagesBeforeConvert
                .groups.Select((group) => group.pages)
                .SelectMany(pages => pages)
                .Count()
        );
        foreach (Page page in pages.pages)
        {
            Assert.NotNull(page.id);
        }
        Assert.Null(pages.groups);
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
