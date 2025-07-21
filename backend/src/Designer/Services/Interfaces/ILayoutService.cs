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

        /// <summary>
        /// This method should not be used if an explicit way
        /// to do the operation is available.
        /// It's main motivation is for when we cannot easily
        /// identify the specific values being changed.
        /// </summary>
        public Task UpdatePageGroups(
            AltinnRepoEditingContext editingContext,
            string layoutSetId,
            PagesWithGroups pagesWithGroups
        );

        public Task<bool> IsLayoutUsingPageGroups(
            AltinnRepoEditingContext editingContext,
            string layoutSetId
        );

        /// <summary>
        /// Converts the `pages` property of a layout to use `groups` instead of `order`
        ///
        /// This implementation creates a single group including all pages
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
