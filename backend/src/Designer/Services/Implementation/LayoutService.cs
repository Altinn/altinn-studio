using System.Linq;
using System.Text.Json.Nodes;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;

namespace Altinn.Studio.Designer.Services.Implementation
{
    public class LayoutService(IAltinnGitRepositoryFactory altinnGitRepositoryFactory) : ILayoutService
    {
        private static Pages GetPagesFromSettings(JsonNode settings)
        {
            Pages pages = new()
            {
                pages = []
            };

            JsonNode pagesNode = settings["pages"];
            JsonArray pagesArray = pagesNode["order"] as JsonArray;
            foreach (JsonNode pageNode in pagesArray)
            {
                string pageId = pageNode.GetValue<string>();
                pages.pages.Add(new Page { id = pageId });
            }

            return pages;
        }

        public async Task<Pages> GetPagesByLayoutSetId(AltinnRepoEditingContext editingContext, string layoutSetId)
        {
            AltinnAppGitRepository appRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(editingContext.Org, editingContext.Repo, editingContext.Developer);
            JsonNode jsonNode = await appRepository.GetLayoutSettingsAndCreateNewIfNotFound(layoutSetId);
            Pages pages = GetPagesFromSettings(jsonNode);
            return pages;
        }

        public async Task<Page> GetPageById(AltinnRepoEditingContext editingContext, string layoutSetId, string pageId)
        {
            AltinnAppGitRepository appRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(editingContext.Org, editingContext.Repo, editingContext.Developer);
            JsonNode jsonNode = await appRepository.GetLayoutSettingsAndCreateNewIfNotFound(layoutSetId);
            Pages pages = GetPagesFromSettings(jsonNode);
            return pages.pages.Find(page => page.id == pageId);
        }

        public async Task CreatePage(AltinnRepoEditingContext editingContext, string layoutSetId, string pageId)
        {
            AltinnAppGitRepository appRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(editingContext.Org, editingContext.Repo, editingContext.Developer);

            await appRepository.CreatePageLayoutFile(layoutSetId, pageId);

            JsonNode jsonNode = await appRepository.GetLayoutSettingsAndCreateNewIfNotFound(layoutSetId);
            (jsonNode["pages"]["order"] as JsonArray).Add(pageId);
            await appRepository.SaveLayoutSettings(layoutSetId, jsonNode);
        }

        public async Task DeletePage(AltinnRepoEditingContext editingContext, string layoutSetId, string pageId)
        {
            AltinnAppGitRepository appRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(editingContext.Org, editingContext.Repo, editingContext.Developer);

            appRepository.DeleteLayout(layoutSetId, pageId);

            JsonNode jsonNode = await appRepository.GetLayoutSettingsAndCreateNewIfNotFound(layoutSetId);
            JsonArray orderArray = jsonNode["pages"]["order"] as JsonArray;
            JsonNode orderPage = orderArray.First(node => node.GetValue<string>().Equals(pageId));
            orderArray.Remove(orderPage);
            await appRepository.SaveLayoutSettings(layoutSetId, jsonNode);
        }

        public async Task UpdatePage(AltinnRepoEditingContext editingContext, string layoutSetId, string pageId, Page page)
        {
            AltinnAppGitRepository appRepository = altinnGitRepositoryFactory.GetAltinnAppGitRepository(editingContext.Org, editingContext.Repo, editingContext.Developer);

            appRepository.UpdateFormLayoutName(layoutSetId, pageId, page.id);

            JsonNode jsonNode = await appRepository.GetLayoutSettingsAndCreateNewIfNotFound(layoutSetId);
            JsonArray orderArray = jsonNode["pages"]["order"] as JsonArray;
            JsonNode orderPage = orderArray.First(node => node.GetValue<string>().Equals(pageId));
            int pageIndex = orderArray.IndexOf(orderPage);
            orderArray[pageIndex] = page.id;
            await appRepository.SaveLayoutSettings(layoutSetId, jsonNode);
        }
    }
}
