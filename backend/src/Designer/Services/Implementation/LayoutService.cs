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
            switch (layoutSettings.Pages)
            {
                case PagesWithGroups pageWithGroups:
                    Group group = pageWithGroups.Groups?.FirstOrDefault(g => g?.Order?.Contains(pageId) == true)
                        ?? throw new InvalidOperationException(
                            $"Page '{pageId}' not found in group order."
                        );
                    ReplaceInOrder(group.Order, pageId, newName);
                    break;

                case PagesWithOrder pagesWithOrder:
                    ReplaceInOrder(pagesWithOrder.Order, pageId, newName);
                    break;

                default:
                    throw new InvalidOperationException("Unsupported layout settings type.");
            }

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

        private static void ReplaceInOrder(List<string> order, string oldName, string newName)
        {
            int index = order.IndexOf(oldName);
            if (index == -1)
            {
                throw new InvalidOperationException($"Page '{oldName}' not found in order.");
            }
            order[index] = newName;
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

        public async Task UpdatePageGroups(
            AltinnRepoEditingContext editingContext,
            string layoutSetId,
            PagesWithGroups pagesWithGroups
        )
        {
            ArgumentNullException.ThrowIfNull(editingContext);
            ArgumentException.ThrowIfNullOrEmpty(layoutSetId);
            ArgumentNullException.ThrowIfNull(pagesWithGroups);

            AltinnAppGitRepository appRepository =
                altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    editingContext.Org,
                    editingContext.Repo,
                    editingContext.Developer
                );
            LayoutSettings originalLayoutSettings = await appRepository.GetLayoutSettings(
                layoutSetId
            );
            if (originalLayoutSettings.Pages is not PagesWithGroups originalPagesWithGroups)
            {
                throw new InvalidOperationException(
                    "Cannot update page groups in layout using order."
                );
            }
            IEnumerable<string> order = pagesWithGroups.Groups.SelectMany((group) => group.Order);
            IEnumerable<string> originalOrder = originalPagesWithGroups.Groups.SelectMany(
                (group) => group.Order
            );
            var deletedPages = originalOrder.Except(order).ToList();
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
            var createdPages = order.Except(originalOrder).ToList();
            LayoutSetConfig layoutSetConfig = await appDevelopmentService.GetLayoutSetConfig(
                editingContext,
                layoutSetId
            );
            foreach (string pageId in createdPages)
            {
                AltinnPageLayout altinnPageLayout = new();
                if (originalOrder.Any())
                {
                    altinnPageLayout = altinnPageLayout.WithNavigationButtons();
                }
                await appRepository.CreatePageLayoutFile(layoutSetId, pageId, altinnPageLayout);
                await mediatr.Publish(
                    new LayoutPageAddedEvent
                    {
                        EditingContext = editingContext,
                        LayoutName = pageId,
                        LayoutSetConfig = layoutSetConfig,
                    }
                );
            }
            originalLayoutSettings.Pages = pagesWithGroups;
            await appRepository.SaveLayoutSettings(layoutSetId, originalLayoutSettings);
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
            Group group = new()
            {
                Order = pageOrder,
                Name = pageOrder.Count > 1 ? "Gruppe 1" : null,
            };
            pagesWithGroups.Groups = [group];
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
