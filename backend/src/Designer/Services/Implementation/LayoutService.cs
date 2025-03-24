using System;
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
        private static Pages GetPagesFromSettings(JsonNode settings)
        {
            Pages pages = new();

            JsonNode pagesNode = settings["pages"];
            if (pagesNode["order"] is JsonArray pagesArray)
            {
                pages.pages = [];
                foreach (JsonNode pageNode in pagesArray)
                {
                    string pageId = pageNode.GetValue<string>();
                    pages.pages.Add(new Page { id = pageId });
                }
            }
            if (pagesNode["groups"] is JsonArray groupsArray)
            {
                pages.groups = [];
                foreach (JsonNode groupNode in groupsArray)
                {
                    Group group = new();
                    if (pagesNode["name"] is JsonNode name)
                    {
                        group.name = name.GetValue<string>();
                    }
                    group.pages =
                    [
                        .. (groupNode["order"] as JsonArray).Select(node => new Page
                        {
                            id = node.GetValue<string>(),
                        }),
                    ];
                    pages.groups.Add(group);
                }
            }

            return pages;
        }

        public async Task<Pages> GetPagesByLayoutSetId(
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
            JsonNode jsonNode = await appRepository.GetLayoutSettingsAndCreateNewIfNotFound(
                layoutSetId
            );
            Pages pages = GetPagesFromSettings(jsonNode);
            return pages;
        }

        public async Task<Page> GetPageById(
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
            JsonNode jsonNode = await appRepository.GetLayoutSettingsAndCreateNewIfNotFound(
                layoutSetId
            );
            Pages pages = GetPagesFromSettings(jsonNode);
            return pages.pages.Find(page => page.id == pageId);
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
            JsonNode layoutSettings = await appRepository.GetLayoutSettingsAndCreateNewIfNotFound(
                layoutSetId
            );
            Pages pages = GetPagesFromSettings(layoutSettings);

            AltinnPageLayout pageLayout = new();
            if (pages.pages.Count > 0)
            {
                pageLayout = pageLayout.WithNavigationButtons();
            }
            if (pages.pages.Count == 1)
            {
                JsonNode jsonNode = await appRepository.GetLayout(layoutSetId, pages.pages[0].id);
                AltinnPageLayout existingPage = new(jsonNode.AsObject());
                if (!existingPage.HasComponentOfType("NavigationButtons"))
                {
                    existingPage.WithNavigationButtons();
                    await appRepository.SaveLayout(
                        layoutSetId,
                        pages.pages[0].id,
                        existingPage.Structure
                    );
                }
            }

            await appRepository.CreatePageLayoutFile(layoutSetId, pageId, pageLayout);

            (layoutSettings["pages"]["order"] as JsonArray).Add(pageId);
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

            JsonNode jsonNode = await appRepository.GetLayoutSettingsAndCreateNewIfNotFound(
                layoutSetId
            );
            JsonArray orderArray = jsonNode["pages"]["order"] as JsonArray;
            JsonNode orderPage = orderArray.First(node => node.GetValue<string>().Equals(pageId));
            orderArray.Remove(orderPage);
            await appRepository.SaveLayoutSettings(layoutSetId, jsonNode);

            if (orderArray.Count == 1)
            {
                string lastLayoutName = orderArray.First().GetValue<string>();
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
            Page page
        )
        {
            AltinnAppGitRepository appRepository =
                altinnGitRepositoryFactory.GetAltinnAppGitRepository(
                    editingContext.Org,
                    editingContext.Repo,
                    editingContext.Developer
                );

            appRepository.UpdateFormLayoutName(layoutSetId, pageId, page.id);

            JsonNode jsonNode = await appRepository.GetLayoutSettingsAndCreateNewIfNotFound(
                layoutSetId
            );
            JsonArray orderArray = jsonNode["pages"]["order"] as JsonArray;
            JsonNode orderPage = orderArray.First(node => node.GetValue<string>().Equals(pageId));
            int pageIndex = orderArray.IndexOf(orderPage);
            orderArray[pageIndex] = page.id;
            await appRepository.SaveLayoutSettings(layoutSetId, jsonNode);

            await mediatr.Publish(
                new LayoutPageIdChangedEvent
                {
                    EditingContext = editingContext,
                    LayoutName = pageId,
                    NewLayoutName = page.id,
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

            JsonNode jsonNode = await appRepository.GetLayoutSettingsAndCreateNewIfNotFound(
                layoutSetId
            );
            if (jsonNode["pages"]["order"] is not JsonArray pageOrder)
            {
                pageOrder = [];
                jsonNode["pages"]["order"] = pageOrder;
            }
            pageOrder.Clear();
            pages.pages.ForEach((page) => pageOrder.Add(page.id));
            await appRepository.SaveLayoutSettings(layoutSetId, jsonNode);
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
            JsonNode jsonNode = await appRepository.GetLayoutSettingsAndCreateNewIfNotFound(
                layoutSetId
            );
            return jsonNode["pages"]["groups"] is not null;
        }

        /// <exception cref="InvalidOperationException">
        /// Thrown when layout already uses page groups
        /// </exception>
        public async Task ConvertPagesToGroups(
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
            JsonNode jsonNode = await appRepository.GetLayoutSettingsAndCreateNewIfNotFound(
                layoutSetId
            );

            JsonArray order = jsonNode["pages"]["order"] as JsonArray;
            JsonArray groups = [];

            foreach (JsonNode page in order)
            {
                string pageName = page.GetValue<string>();
                groups.Add(
                    new JsonObject
                    {
                        {
                            "order",
                            new JsonArray { pageName }
                        },
                    }
                );
            }

            jsonNode["pages"]["groups"] = groups;
            jsonNode["pages"]["order"] = null;
            await appRepository.SaveLayoutSettings(layoutSetId, jsonNode);
        }

        /// <exception cref="InvalidOperationException">
        /// Thrown when layout does not use page groups
        /// </exception>
        /// <exception cref="InvalidOperationException">
        /// Thrown if a group is in an invalid configuration
        /// </exception>
        public async Task ConvertGroupsToPages(
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
            JsonNode jsonNode = await appRepository.GetLayoutSettingsAndCreateNewIfNotFound(
                layoutSetId
            );

            JsonArray groups = jsonNode["pages"]["groups"] as JsonArray;
            JsonArray order = [];

            foreach (JsonNode group in groups)
            {
                if (group["order"] is not JsonArray pages)
                {
                    throw new InvalidOperationException($"Page group does not contain order array");
                }
                foreach (JsonNode page in pages)
                {
                    string pageName = page.GetValue<string>();
                    order.Add(pageName);
                }
            }

            jsonNode["pages"]["order"] = order;
            jsonNode["pages"]["groups"] = null;
            await appRepository.SaveLayoutSettings(layoutSetId, jsonNode);
        }
    }
}
