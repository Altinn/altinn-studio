using System;
using System.Collections.Generic;
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
        (AltinnRepoEditingContext editingContext, LayoutService layoutService, _) =
            await PrepareTestForRepo(repo);

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
        (AltinnRepoEditingContext editingContext, LayoutService layoutService, _) =
            await PrepareTestForRepo(repo);

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
        (AltinnRepoEditingContext editingContext, LayoutService layoutService, _) =
            await PrepareTestForRepo(repo);

        PagesDto pagesBeforeConvert = PagesDto.From(
            await layoutService.GetLayoutSettings(editingContext, "layoutSet1")
        );
        await layoutService.ConvertPagesToPageGroups(editingContext, "layoutSet1");
        Assert.True(await layoutService.IsLayoutUsingPageGroups(editingContext, "layoutSet1"));
        PagesDto pages = PagesDto.From(
            await layoutService.GetLayoutSettings(editingContext, "layoutSet1")
        );

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
        (AltinnRepoEditingContext editingContext, LayoutService layoutService, _) =
            await PrepareTestForRepo(repo);

        PagesDto pagesBeforeConvert = PagesDto.From(
            await layoutService.GetLayoutSettings(editingContext, "form")
        );
        await layoutService.ConvertPageGroupsToPages(editingContext, "form");
        Assert.False(await layoutService.IsLayoutUsingPageGroups(editingContext, "form"));
        PagesDto pages = PagesDto.From(
            await layoutService.GetLayoutSettings(editingContext, "form")
        );
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

    [Fact]
    public async Task DeletingPageGroup_ShouldDeletePagesInGroup()
    {
        const string repo = "app-with-groups-and-taskNavigation";
        (
            AltinnRepoEditingContext editingContext,
            LayoutService layoutService,
            Mock<IPublisher> mediatr
        ) = await PrepareTestForRepo(repo);

        LayoutSettings layoutSettings = await layoutService.GetLayoutSettings(
            editingContext,
            "form"
        );

        PagesDto pagesDto = PagesDto.From(layoutSettings);
        int originalGroupCount = pagesDto.Groups.Count;
        List<PageDto> deletedPages = pagesDto.Groups[0].Pages;
        List<PageDto> allPages = [.. pagesDto.Groups.SelectMany((group) => group.Pages)];
        pagesDto.Groups.RemoveAt(0);
        layoutSettings.Pages = pagesDto.ToBusiness();
        await layoutService.UpdateLayoutSettings(editingContext, "form", layoutSettings);
        LayoutSettings updatedLayoutSettings = await layoutService.GetLayoutSettings(
            editingContext,
            "form"
        );

        int newGroupCount = (updatedLayoutSettings.Pages as PagesWithGroups).Groups.Count;
        Assert.Equal(originalGroupCount - 1, newGroupCount);
        foreach (PageDto page in allPages)
        {
            string fileContent = TestDataHelper.GetFileFromRepo(
                editingContext.Org,
                editingContext.Repo,
                editingContext.Developer,
                $"App/ui/form/layouts/{page.Id}.json"
            );
            if (deletedPages.Any((deletedPage) => deletedPage.Id == page.Id))
            {
                Assert.Equal(string.Empty, fileContent);
            }
            else
            {
                Assert.NotEqual(string.Empty, fileContent);
            }
        }
        Assert.Equal(mediatr.Invocations.Count, deletedPages.Count);
    }

    [Fact]
    public async Task RenamingPageGroups_ShouldNotDeletePagesInGroup()
    {
        const string repo = "app-with-groups-and-taskNavigation";
        (AltinnRepoEditingContext editingContext, LayoutService layoutService, _) =
            await PrepareTestForRepo(repo);

        LayoutSettings layoutSettings = await layoutService.GetLayoutSettings(
            editingContext,
            "form"
        );

        PagesDto pagesDto = PagesDto.From(layoutSettings);
        int originalGroupCount = pagesDto.Groups.Count;
        List<PageDto> allPages = [.. pagesDto.Groups.SelectMany((group) => group.Pages)];
        pagesDto.Groups.ForEach((group) => group.Name = $"{group.Name}-newName");
        layoutSettings.Pages = pagesDto.ToBusiness();
        await layoutService.UpdateLayoutSettings(editingContext, "form", layoutSettings);
        LayoutSettings updatedLayoutSettings = await layoutService.GetLayoutSettings(
            editingContext,
            "form"
        );

        foreach (PageDto page in allPages)
        {
            string fileContent = TestDataHelper.GetFileFromRepo(
                editingContext.Org,
                editingContext.Repo,
                editingContext.Developer,
                $"App/ui/form/layouts/{page.Id}.json"
            );
            Assert.NotEqual(string.Empty, fileContent);
        }
        int newGroupCount = (updatedLayoutSettings.Pages as PagesWithGroups).Groups.Count;
        Assert.Equal(originalGroupCount, newGroupCount);
    }

    private async Task<(
        AltinnRepoEditingContext editingContext,
        LayoutService layoutService,
        Mock<IPublisher> mock
    )> PrepareTestForRepo(string repo)
    {
        string targetRepository = TestDataHelper.GenerateTestRepoName();
        await TestDataHelper.CopyRepositoryForTest(Org, repo, Developer, targetRepository);
        var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            Org,
            targetRepository,
            Developer
        );

        Mock<IPublisher> mediatr = new();
        LayoutService layoutService = GetLayoutServiceForTest(mediatr);
        return (editingContext, layoutService, mediatr);
    }

    private static LayoutService GetLayoutServiceForTest(Mock<IPublisher> mediatr)
    {
        var appDevelopmentServiceMock = new Mock<IAppDevelopmentService>();
        AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(
            TestDataHelper.GetTestDataRepositoriesRootDirectory()
        );
        LayoutService layoutService = new(
            altinnGitRepositoryFactory,
            mediatr.Object,
            appDevelopmentServiceMock.Object
        );

        return layoutService;
    }
}
