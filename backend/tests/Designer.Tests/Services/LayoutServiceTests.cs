using System.Threading.Tasks;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
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
        const string repo = "app-with-layoutSets";
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
