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
            Pages pages = new() { pages = [] };

            JsonNode pagesNode = settings["pages"];
            JsonArray pagesArray = pagesNode["order"] as JsonArray;
            foreach (JsonNode pageNode in pagesArray)
            {
                string pageId = pageNode.GetValue<string>();
                pages.pages.Add(new Page { id = pageId });
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
            JsonArray pageOrder = jsonNode["pages"]["order"] as JsonArray;
            pageOrder.Clear();
            pages.pages.ForEach((page) => pageOrder.Add(page.id));
            await appRepository.SaveLayoutSettings(layoutSetId, jsonNode);
        }
    }
}
