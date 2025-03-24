using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    public interface ILayoutService
    {
        public Task<Pages> GetPagesByLayoutSetId(
            AltinnRepoEditingContext editingContext,
            string layoutSetId
        );
        public Task<Page> GetPageById(
            AltinnRepoEditingContext editingContext,
            string layoutSetId,
            string pageId
        );

        public Task CreatePage(
            AltinnRepoEditingContext editingContext,
            string layoutSetId,
            string pageId
        );
        public Task DeletePage(
            AltinnRepoEditingContext editingContext,
            string layoutSetId,
            string pageId
        );
        public Task UpdatePage(
            AltinnRepoEditingContext editingContext,
            string layoutSetId,
            string pageId,
            Page page
        );
        public Task UpdatePageOrder(
            AltinnRepoEditingContext editingContext,
            string layoutSetId,
            Pages pages
        );

        public Task<bool> IsLayoutUsingGroups(
            AltinnRepoEditingContext editingContext,
            string layoutSetId
        );
    }
}
