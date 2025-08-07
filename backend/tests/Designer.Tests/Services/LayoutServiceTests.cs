using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
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
        const string Repo = "app-with-groups-and-task-navigation";
        (AltinnRepoEditingContext editingContext, LayoutService layoutService, _) =
            await PrepareTestForRepo(Repo);

        bool isLayoutUsingGroups = await layoutService.IsLayoutUsingPageGroups(
            editingContext,
            "form"
        );
        Assert.True(isLayoutUsingGroups);
    }

    [Fact]
    public async Task UsesGroup_ShouldReturnFalse_IfNotUsingGroups()
    {
        const string Repo = "app-with-layoutsets";
        (AltinnRepoEditingContext editingContext, LayoutService layoutService, _) =
            await PrepareTestForRepo(Repo);

        bool isLayoutUsingGroups = await layoutService.IsLayoutUsingPageGroups(
            editingContext,
            "layoutSet1"
        );
        Assert.False(isLayoutUsingGroups);
    }

    [Fact]
    public async Task OrderToPageGroupConversion_ShouldIncludeAllPages()
    {
        const string Repo = "app-with-layoutsets";
        (AltinnRepoEditingContext editingContext, LayoutService layoutService, _) =
            await PrepareTestForRepo(Repo);

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
        }
    }

    [Fact]
    public async Task PageGroupToOrderConversion_ShouldIncludeAllPages()
    {
        const string Repo = "app-with-groups-and-task-navigation";
        (AltinnRepoEditingContext editingContext, LayoutService layoutService, _) =
            await PrepareTestForRepo(Repo);

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
        const string Repo = "app-with-groups-and-task-navigation";
        (
            AltinnRepoEditingContext editingContext,
            LayoutService layoutService,
            Mock<IPublisher> mediatr
        ) = await PrepareTestForRepo(Repo);

        LayoutSettings layoutSettings = await layoutService.GetLayoutSettings(
            editingContext,
            "form"
        );

        PagesDto pagesDto = PagesDto.From(layoutSettings);
        int originalGroupCount = pagesDto.Groups.Count;
        List<PageDto> deletedPages = pagesDto.Groups[0].Pages;
        List<PageDto> allPages = [.. pagesDto.Groups.SelectMany((group) => group.Pages)];
        pagesDto.Groups.RemoveAt(0);
        await layoutService.UpdatePageGroups(
            editingContext,
            "form",
            (PagesWithGroups)pagesDto.ToBusiness()
        );
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
        Assert.Equal(
            deletedPages.Count,
            mediatr.Invocations.Count(i =>
                i.Method.Name == nameof(IPublisher.Publish)
                && i.Arguments[0] is LayoutPageDeletedEvent
            )
        );
    }

    [Fact]
    public async Task RenamePage_ShouldNotDeletePagesInGroup()
    {
        const string Repo = "app-with-groups-and-task-navigation";
        (AltinnRepoEditingContext editingContext, LayoutService layoutService, _) =
            await PrepareTestForRepo(Repo);

        LayoutSettings layoutSettings = await layoutService.GetLayoutSettings(
            editingContext,
            "form"
        );

        PagesDto pagesDto = PagesDto.From(layoutSettings);
        int originalGroupCount = pagesDto.Groups.Count;


        PageDto pageToRename = pagesDto.Groups[0].Pages[0];
        string oldPageName = pageToRename.Id;
        string newPageName = $"{oldPageName}-newName";
        pageToRename.Id = newPageName;

        await layoutService.RenamePage(
            editingContext,
            "form",
            oldPageName,
            newPageName
        );

        LayoutSettings updatedLayoutSettings = await layoutService.GetLayoutSettings(
            editingContext,
            "form"
        );

        List<PageDto> allPages = [.. pagesDto.Groups.SelectMany((group) => group.Pages)];
        allPages
            .Select(
                (pagesDto) =>
                    TestDataHelper.GetFileFromRepo(
                        editingContext.Org,
                        editingContext.Repo,
                        editingContext.Developer,
                        $"App/ui/form/layouts/{pagesDto.Id}.json"
                    )
            )
            .ToList()
            .ForEach((fileContent) => Assert.NotEqual(string.Empty, fileContent));
        int newGroupCount = (updatedLayoutSettings.Pages as PagesWithGroups).Groups.Count;
        Assert.Equal(originalGroupCount, newGroupCount);
    }

    [Fact]
    public async Task PageGroupAddingPages_ShouldCreateLayouts()
    {
        const string Repo = "app-with-groups-and-task-navigation";
        (
            AltinnRepoEditingContext editingContext,
            LayoutService layoutService,
            Mock<IPublisher> mediatr
        ) = await PrepareTestForRepo(Repo);

        LayoutSettings layoutSettings = await layoutService.GetLayoutSettings(
            editingContext,
            "form"
        );

        PagesDto pagesDto = PagesDto.From(layoutSettings);
        int originalGroupCount = pagesDto.Groups.Count;
        List<PageDto> allPages = [.. pagesDto.Groups.SelectMany((group) => group.Pages)];
        pagesDto.Groups.Add(
            new GroupDto
            {
                Name = "newGroup",
                Pages = [new() { Id = "newPage" }, new() { Id = "newPage2" }],
            }
        );
        await layoutService.UpdatePageGroups(
            editingContext,
            "form",
            (PagesWithGroups)pagesDto.ToBusiness()
        );
        LayoutSettings updatedLayoutSettings = await layoutService.GetLayoutSettings(
            editingContext,
            "form"
        );

        int newGroupCount = (updatedLayoutSettings.Pages as PagesWithGroups).Groups.Count;
        Assert.Equal(originalGroupCount + 1, newGroupCount);
        foreach (
            string fileContent in allPages.Select(page =>
                TestDataHelper.GetFileFromRepo(
                    editingContext.Org,
                    editingContext.Repo,
                    editingContext.Developer,
                    $"App/ui/form/layouts/{page.Id}.json"
                )
            )
        )
        {
            Assert.NotEqual(string.Empty, fileContent);
        }
        Assert.Equal(
            2,
            mediatr.Invocations.Count(i =>
                i.Method.Name == nameof(IPublisher.Publish)
                && i.Arguments[0] is LayoutPageAddedEvent
            )
        );
    }

    [Fact]
    public async Task PageGroupToOrderConversion_ShouldThrowException_IfInvalid()
    {
        const string Repo = "app-with-groups-and-task-navigation";
        (AltinnRepoEditingContext editingContext, LayoutService layoutService, _) =
            await PrepareTestForRepo(Repo);

        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await layoutService.ConvertPagesToPageGroups(editingContext, "form")
        );
    }

    [Fact]
    public async Task PageOrderToGroupConversion_ShouldThrowException_IfInvalid()
    {
        const string Repo = "app-with-layoutsets";
        (AltinnRepoEditingContext editingContext, LayoutService layoutService, _) =
            await PrepareTestForRepo(Repo);

        await Assert.ThrowsAsync<InvalidOperationException>(
            async () => await layoutService.ConvertPageGroupsToPages(editingContext, "layoutSet1")
        );
    }

    private static async Task<(
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
