using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;

namespace Altinn.App.Core.Features.PageOrder
{
    /// <summary>
    /// Interface for page order handling in stateless apps
    /// </summary>
    public class DefaultPageOrder : IPageOrder
    {
        private readonly IAppResources _resources;

        /// <summary>
        /// Default implementation for page order
        /// </summary>
        /// <param name="resources">IAppResources service</param>
        public DefaultPageOrder(IAppResources resources)
        {
            _resources = resources;
        }

        /// <inheritdoc />
        public async Task<List<string>> GetPageOrder(AppIdentifier appIdentifier, InstanceIdentifier instanceIdentifier, string layoutSetId, string currentPage, string dataTypeId, object formData)
        {
            LayoutSettings? layoutSettings;

            if (string.IsNullOrEmpty(layoutSetId))
            {
                layoutSettings = _resources.GetLayoutSettings();
            }
            else
            {
                layoutSettings = _resources.GetLayoutSettingsForSet(layoutSetId);
            }

            return await Task.FromResult(layoutSettings.Pages.Order);
        }
    }
}
