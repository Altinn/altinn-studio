using System;
using System.Collections.Generic;
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

        public async Task<bool> IsLayoutUsingPageGroups(
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
            return layoutSettings.Pages.Groups is not null;
        }

        /// <exception cref="InvalidOperationException">
        /// Thrown when layout already uses page groups
        /// </exception>
        public async Task ConvertPagesToPageGroups(
            AltinnRepoEditingContext editingContext,
            string layoutSetId
        )
        {
            if (await IsLayoutUsingPageGroups(editingContext, layoutSetId))
            {
                throw new InvalidOperationException(
                    "Layout cannot be converted to layout with page groups. Layout already uses page groups."
                );
            }
            AltinnAppGitRepository appRepository =
                altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    editingContext.Org,
                    editingContext.Repo,
                    editingContext.Developer
                );

            LayoutSettings layoutSettings = await appRepository.GetLayoutSettings(layoutSetId);
            layoutSettings.Pages.Groups = [];
            foreach (string page in layoutSettings.Pages.Order)
            {
                layoutSettings.Pages.Groups.Add(new Group { Order = [page] });
            }
            layoutSettings.Pages.Order = null;
            await appRepository.SaveLayoutSettings(layoutSetId, layoutSettings);
        }

        /// <exception cref="InvalidOperationException">
        /// Thrown when layout does not use page groups
        /// </exception>
        /// <exception cref="InvalidOperationException">
        /// Thrown if a group is in an invalid configuration
        /// </exception>
        public async Task ConvertPageGroupsToPages(
            AltinnRepoEditingContext editingContext,
            string layoutSetId
        )
        {
            if (!await IsLayoutUsingPageGroups(editingContext, layoutSetId))
            {
                throw new InvalidOperationException(
                    "Layout cannot be converted to layout without page groups. Layout does not use page groups."
                );
            }
            AltinnAppGitRepository appRepository =
                altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    editingContext.Org,
                    editingContext.Repo,
                    editingContext.Developer
                );
            LayoutSettings layoutSettings = await appRepository.GetLayoutSettings(layoutSetId);

            layoutSettings.Pages.Order = [];
            foreach (Group group in layoutSettings.Pages.Groups)
            {
                if (group.Order is not List<string> pages)
                {
                    throw new InvalidOperationException($"Page group does not contain order array");
                }
                foreach (string page in pages)
                {
                    layoutSettings.Pages.Order.Add(page);
                }
            }
            layoutSettings.Pages.Groups = null;
            await appRepository.SaveLayoutSettings(layoutSetId, layoutSettings);
        }
    }
}
