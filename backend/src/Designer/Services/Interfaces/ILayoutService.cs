using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    public interface ILayoutService
    {
        public Task<PagesDto> GetPagesByLayoutSetId(
            AltinnRepoEditingContext editingContext,
            string layoutSetId
        );
        public Task<PageDto> GetPageById(
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
            PageDto page
        );
        public Task UpdatePageOrder(
            AltinnRepoEditingContext editingContext,
            string layoutSetId,
            PagesDto pages
        );

        public Task<bool> IsLayoutUsingPageGroups(
            AltinnRepoEditingContext editingContext,
            string layoutSetId
        );
    }
}
