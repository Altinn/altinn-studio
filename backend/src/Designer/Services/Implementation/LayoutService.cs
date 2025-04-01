using System.Linq;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using MediatR;

namespace Altinn.Studio.Designer.Services.Implementation
{
    public class LayoutService(
        IAltinnGitRepositoryFactory altinnGitRepositoryFactory,
        IPublisher mediatr,
        IAppDevelopmentService appDevelopmentService
    ) : ILayoutService
    {
        public async Task<PagesDto> GetPagesByLayoutSetId(
            AltinnRepoEditingContext editingContext,
            string layoutSetId
        )
        {
            AltinnAppGitRepository appRepository =
                altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    editingContext.Org,
                    editingContext.Repo,
                    editingContext.Developer
                );
            LayoutSettings layoutSettings = await appRepository.GetLayoutSettings(layoutSetId);
            PagesDto pages = new(layoutSettings);
            return pages;
        }

        public async Task<PageDto> GetPageById(
            AltinnRepoEditingContext editingContext,
            string layoutSetId,
            string pageId
        )
        {
            AltinnAppGitRepository appRepository =
                altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    editingContext.Org,
                    editingContext.Repo,
                    editingContext.Developer
                );
            PagesDto pages = new(await appRepository.GetLayoutSettings(layoutSetId));
            return pages.Pages.Find(page => page.Id == pageId);
        }

        public async Task CreatePage(
            AltinnRepoEditingContext editingContext,
            string layoutSetId,
            string pageId
        )
        {
            AltinnAppGitRepository appRepository =
                altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    editingContext.Org,
                    editingContext.Repo,
                    editingContext.Developer
                );
            LayoutSettings layoutSettings = await appRepository.GetLayoutSettings(layoutSetId);

            AltinnPageLayout pageLayout = new();
            if (layoutSettings.Pages.Order.Count > 0)
            {
                pageLayout = pageLayout.WithNavigationButtons();
            }
            if (layoutSettings.Pages.Order.Count == 1)
            {
                string layoutName = layoutSettings.Pages.Order.First();
                JsonNode jsonNode = await appRepository.GetLayout(layoutSetId, layoutName);
                AltinnPageLayout existingPage = new(jsonNode.AsObject());
                if (!existingPage.HasComponentOfType("NavigationButtons"))
                {
                    existingPage.WithNavigationButtons();
                    await appRepository.SaveLayout(layoutSetId, layoutName, existingPage.Structure);
                }
            }

            await appRepository.CreatePageLayoutFile(layoutSetId, pageId, pageLayout);

            layoutSettings.Pages.Order.Add(pageId);
            await appRepository.SaveLayoutSettings(layoutSetId, layoutSettings);

            LayoutSetConfig layoutSetConfig = await appDevelopmentService.GetLayoutSetConfig(
                editingContext,
                layoutSetId
            );
            await mediatr.Publish(
                new LayoutPageAddedEvent
                {
                    EditingContext = editingContext,
                    LayoutName = pageId,
                    LayoutSetConfig = layoutSetConfig,
                }
            );
        }

        public async Task DeletePage(
            AltinnRepoEditingContext editingContext,
            string layoutSetId,
            string pageId
        )
        {
            AltinnAppGitRepository appRepository =
                altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    editingContext.Org,
                    editingContext.Repo,
                    editingContext.Developer
                );

            appRepository.DeleteLayout(layoutSetId, pageId);

            LayoutSettings layoutSettings = await appRepository.GetLayoutSettings(layoutSetId);
            layoutSettings.Pages.Order.Remove(pageId);
            await appRepository.SaveLayoutSettings(layoutSetId, layoutSettings);

            if (layoutSettings.Pages.Order.Count == 1)
            {
                string lastLayoutName = layoutSettings.Pages.Order.First();
                JsonNode lastLayout = await appRepository.GetLayout(layoutSetId, lastLayoutName);
                AltinnPageLayout lastPage = new(lastLayout.AsObject());
                lastPage.RemoveAllComponentsOfType("NavigationButtons");
                await appRepository.SaveLayout(layoutSetId, lastLayoutName, lastPage.Structure);
            }

            await mediatr.Publish(
                new LayoutPageDeletedEvent
                {
                    EditingContext = editingContext,
                    LayoutName = pageId,
                    LayoutSetName = layoutSetId,
                }
            );
        }

        public async Task UpdatePage(
            AltinnRepoEditingContext editingContext,
            string layoutSetId,
            string pageId,
            PageDto page
        )
        {
            AltinnAppGitRepository appRepository =
                altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    editingContext.Org,
                    editingContext.Repo,
                    editingContext.Developer
                );

            appRepository.UpdateFormLayoutName(layoutSetId, pageId, page.Id);

            LayoutSettings layoutSettings = await appRepository.GetLayoutSettings(layoutSetId);
            int orderIndex = layoutSettings.Pages.Order.IndexOf(pageId);
            layoutSettings.Pages.Order[orderIndex] = page.Id;
            await appRepository.SaveLayoutSettings(layoutSetId, layoutSettings);

            await mediatr.Publish(
                new LayoutPageIdChangedEvent
                {
                    EditingContext = editingContext,
                    LayoutName = pageId,
                    NewLayoutName = page.Id,
                    LayoutSetName = layoutSetId,
                }
            );
        }

        public async Task UpdatePageOrder(
            AltinnRepoEditingContext editingContext,
            string layoutSetId,
            PagesDto pages
        )
        {
            AltinnAppGitRepository appRepository =
                altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    editingContext.Org,
                    editingContext.Repo,
                    editingContext.Developer
                );

            LayoutSettings layoutSettings = await appRepository.GetLayoutSettings(layoutSetId);
            layoutSettings.Pages.Order = [.. pages.Pages.Select(page => page.Id)];
            await appRepository.SaveLayoutSettings(layoutSetId, layoutSettings);
        }
    }
}
