using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    public interface ILayoutService
    {
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
        public Task RenamePage(
            AltinnRepoEditingContext editingContext,
            string layoutSetId,
            string pageId,
            string newName
        );
        public Task UpdatePageOrder(
            AltinnRepoEditingContext editingContext,
            string layoutSetId,
            Pages pages
        );

        public Task<LayoutSettings> GetLayoutSettings(
            AltinnRepoEditingContext editingContext,
            string layoutSetId
        );

        public Task<bool> IsLayoutUsingPageGroups(
            AltinnRepoEditingContext editingContext,
            string layoutSetId
        );

        /// <summary>
        /// Converts the `pages` property of a layout to use `groups` instead of `order`
        ///
        /// This implementation creates a single group for each page
        /// </summary>
        public Task ConvertPagesToPageGroups(
            AltinnRepoEditingContext editingContext,
            string layoutSetId
        );

        /// <summary>
        /// Converts the `pages` property of a layout to use `order` instead of `groups`
        ///
        /// This implementation copies all pages from all groups, keeping the order of the pages
        /// </summary>
        public Task ConvertPageGroupsToPages(
            AltinnRepoEditingContext editingContext,
            string layoutSetId
        );
    }
}
