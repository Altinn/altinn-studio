
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    public interface ILayoutService
    {
        public Task<Pages> getPagesByLayoutId(AltinnRepoEditingContext editingContext, string layoutSetId);
        public Task<Page> getPageById(AltinnRepoEditingContext editingContext, string layoutSetId, string pageId);

        public Task createPage(AltinnRepoEditingContext editingContext, string layoutSetId, string pageId);
        public Task deletePage(AltinnRepoEditingContext editingContext, string layoutSetId, string pageId);
        public Task updatePage(AltinnRepoEditingContext editingContext, string layoutSetId, string pageId, Page page);
    }
}
