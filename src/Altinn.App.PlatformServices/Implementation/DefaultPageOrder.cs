using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.Common.Models;
using Altinn.App.PlatformServices.Models;
using Altinn.App.Services.Interface;

namespace Altinn.App.Services.Implementation
{
    /// <summary>
    /// Interface for page order handling in stateless apps
    /// </summary>
    public class DefaultPageOrder : IPageOrder
    {
        private readonly IAltinnApp _altinnApp;
        private readonly IAppResources _resources;

        /// <summary>
        /// Default implementation for page order
        /// </summary>
        /// <param name="altinnApp">IAltinnApp service</param>
        /// <param name="resources">IAppResources service</param>
        public DefaultPageOrder(IAltinnApp altinnApp, IAppResources resources)
        {
            _altinnApp = altinnApp;
            _resources = resources;
        }

        /// <inheritdoc />
        public async Task<List<string>> GetPageOrder(AppIdentifier appIdentifier, InstanceIdentifier instanceIdentifier, string layoutSetId, string currentPage, string dataTypeId, object formData)
        {
            if (instanceIdentifier.IsNoInstance)
            {
                LayoutSettings layoutSettings = null;

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

            return await _altinnApp.GetPageOrder(
                appIdentifier.Org,
                appIdentifier.App,
                instanceIdentifier.InstanceOwnerPartyId,
                instanceIdentifier.InstanceGuid,
                layoutSetId,
                currentPage,
                dataTypeId,
                formData);
        }
    }
}
