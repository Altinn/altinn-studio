using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Events;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
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
        public async Task<LayoutSettings> GetLayoutSettings(
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
            return await appRepository.GetLayoutSettings(layoutSetId);
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
            if (layoutSettings.Pages is not PagesWithOrder pages)
            {
                throw new InvalidOperationException(
                    "Cannot add order page to layout using groups."
                );
            }

            AltinnPageLayout pageLayout = new();
            if (pages.Order.Count > 0)
            {
                pageLayout = pageLayout.WithNavigationButtons();
            }
            if (pages.Order.Count == 1)
            {
                string layoutName = pages.Order.First();
                JsonNode jsonNode = await appRepository.GetLayout(layoutSetId, layoutName);
                AltinnPageLayout existingPage = new(jsonNode.AsObject());
                if (!existingPage.HasComponentOfType("NavigationButtons"))
                {
                    existingPage.WithNavigationButtons();
                    await appRepository.SaveLayout(layoutSetId, layoutName, existingPage.Structure);
                }
            }
            await appRepository.CreatePageLayoutFile(layoutSetId, pageId, pageLayout);

            pages.Order.Add(pageId);
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
            if (layoutSettings.Pages is not PagesWithOrder pages)
            {
                throw new InvalidOperationException(
                    "Cannot delete order page from layout using groups."
                );
            }
            pages.Order.Remove(pageId);
            await appRepository.SaveLayoutSettings(layoutSetId, layoutSettings);

            if (pages.Order.Count == 1)
            {
                string lastLayoutName = pages.Order.First();
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

        public async Task RenamePage(
            AltinnRepoEditingContext editingContext,
            string layoutSetId,
            string pageId,
            string newName
        )
        {
            AltinnAppGitRepository appRepository =
                altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    editingContext.Org,
                    editingContext.Repo,
                    editingContext.Developer
                );

            appRepository.UpdateFormLayoutName(layoutSetId, pageId, newName);

            LayoutSettings layoutSettings = await appRepository.GetLayoutSettings(layoutSetId);
            if (layoutSettings.Pages is not PagesWithOrder pages)
            {
                throw new InvalidOperationException(
                    "Cannot rename order page in layout using groups."
                );
            }
            int orderIndex = pages.Order.IndexOf(pageId);
            if (orderIndex == -1)
            {
                throw new InvalidOperationException($"Page '{pageId}' not found.");
            }
            pages.Order[orderIndex] = newName;
            await appRepository.SaveLayoutSettings(layoutSetId, layoutSettings);

            await mediatr.Publish(
                new LayoutPageIdChangedEvent
                {
                    EditingContext = editingContext,
                    LayoutName = pageId,
                    NewLayoutName = newName,
                    LayoutSetName = layoutSetId,
                }
            );
        }

        public async Task UpdatePageOrder(
            AltinnRepoEditingContext editingContext,
            string layoutSetId,
            Pages pages
        )
        {
            AltinnAppGitRepository appRepository =
                altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    editingContext.Org,
                    editingContext.Repo,
                    editingContext.Developer
                );

            LayoutSettings layoutSettings = await appRepository.GetLayoutSettings(layoutSetId);
            if (layoutSettings.Pages is not PagesWithOrder pagesWithOrder2)
            {
                throw new InvalidOperationException("Cannot update order in layout using groups.");
            }
            if (pages is not PagesWithOrder pagesWithOrder)
            {
                throw new InvalidOperationException("Cannot update order in layout using groups.");
            }
            pagesWithOrder2.Order = pagesWithOrder.Order;
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
            return layoutSettings.Pages is PagesWithGroups;
        }

        public async Task UpdateLayoutSettings(
            AltinnRepoEditingContext editingContext,
            string layoutSetId,
            LayoutSettings layoutSettings
        )
        {
            AltinnAppGitRepository appRepository =
                altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    editingContext.Org,
                    editingContext.Repo,
                    editingContext.Developer
                );
            LayoutSettings originalLayoutSettings = await appRepository.GetLayoutSettings(
                layoutSetId
            );
            if (layoutSettings.Pages is PagesWithGroups pagesWithGroups)
            {
                if (originalLayoutSettings.Pages is PagesWithGroups originalPagesWithGroups)
                {
                    IEnumerable<string> pages = pagesWithGroups.Groups.SelectMany(
                        (group) => group.Order
                    );
                    IEnumerable<string> originalPages = originalPagesWithGroups.Groups.SelectMany(
                        (group) => group.Order
                    );
                    IEnumerable<string> deletedPages = originalPages.Where(
                        (page) => !pages.Contains(page)
                    );
                    foreach (string pageId in deletedPages)
                    {
                        appRepository.DeleteLayout(layoutSetId, pageId);
                        await mediatr.Publish(
                            new LayoutPageDeletedEvent
                            {
                                EditingContext = editingContext,
                                LayoutName = pageId,
                                LayoutSetName = layoutSetId,
                            }
                        );
                    }
                }
            }
            await appRepository.SaveLayoutSettings(layoutSetId, layoutSettings);
        }

        /// <exception cref="InvalidOperationException">
        /// Thrown when layout already uses page groups
        /// </exception>
        public async Task ConvertPagesToPageGroups(
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
            if (layoutSettings.Pages is not PagesWithOrder pages)
            {
                throw new InvalidOperationException(
                    "Cannot convert layout to use page groups. Layout does not use order."
                );
            }
            List<string> pageOrder = pages.Order;
            var pagesWithGroups = layoutSettings.Pages.ToPagesWithGroups();
            pagesWithGroups.Groups = [];
            foreach (string page in pageOrder)
            {
                pagesWithGroups.Groups.Add(new Group { Order = [page] });
            }
            layoutSettings.Pages = pagesWithGroups;
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
            AltinnAppGitRepository appRepository =
                altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    editingContext.Org,
                    editingContext.Repo,
                    editingContext.Developer
                );
            LayoutSettings layoutSettings = await appRepository.GetLayoutSettings(layoutSetId);

            if (layoutSettings.Pages is not PagesWithGroups pages)
            {
                throw new InvalidOperationException(
                    "Cannot convert layout to use page groups. Layout does not use page groups."
                );
            }
            List<Group> pageGroups = pages.Groups;
            var pagesWithOrder = layoutSettings.Pages.ToPagesWithOrder();
            pagesWithOrder.Order = [];
            foreach (Group group in pageGroups)
            {
                foreach (string page in group.Order)
                {
                    pagesWithOrder.Order.Add(page);
                }
            }
            layoutSettings.Pages = pagesWithOrder;
            await appRepository.SaveLayoutSettings(layoutSetId, layoutSettings);
        }
    }
}
