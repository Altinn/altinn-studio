using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.App.PlatformServices.Models;

namespace Altinn.App.Services.Interface
{
    /// <summary>
    /// Interface for page order handling in stateful apps
    /// </summary>
    public interface IPageOrder
    {
        /// <summary>
        /// Gets the current page order of the app
        /// </summary>
        /// <param name="appIdentifier">Object identifying the app <see cref="AppIdentifier"/></param>
        /// <param name="instanceIdentifier">Object identifying the instance <see cref="InstanceIdentifier"/></param>
        /// <param name="layoutSetId">The layout set id</param>
        /// <param name="currentPage">The current page of the instance.</param>
        /// <param name="dataTypeId">The data type id of the current layout.</param>
        /// <param name="formData">The form data.</param>
        /// <returns> The pages in sorted order.</returns>
        Task<List<string>> GetPageOrder(AppIdentifier appIdentifier, InstanceIdentifier instanceIdentifier, string layoutSetId, string currentPage, string dataTypeId, object formData);
    }
}
