using Altinn.ResourceRegistry.Core.Models;
using Altinn.ResourceRegistry.Models;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace Altinn.ResourceRegistry.Core
{
    /// <summary>
    /// Interface for the postgre repository for resource registry
    /// </summary>
    public interface IResourceRegistryRepository
    {
        /// <summary>
        /// Gets a single resource by its resource identifier if it exists in the resource registry
        /// </summary>
        /// <param name="id">The resource identifier to retrieve</param>
        /// <returns>ServiceResource</returns>
        Task<ServiceResource> GetResource(string id);

        /// <summary>
        /// Deletes a resource from the resource registry
        /// </summary>
        /// <param name="id">The resource identifier to delete</param>
        Task<ServiceResource> DeleteResource(string id);

        /// <summary>
        /// Updates a service resource in the resource registry if it pass all validation checks
        /// </summary>
        /// <param name="resource">Service resource model for update in the resource registry</param>
        /// <returns>The result of the operation</returns>
        Task<ServiceResource> UpdateResource(ServiceResource resource);

        /// <summary>
        /// Creates a service resource in the resource registry if it pass all validation checks
        /// </summary>
        /// <param name="resource">Service resource model to create in the resource registry</param>
        /// <returns>The result of the operation</returns>
        Task<ServiceResource> CreateResource(ServiceResource resource);

        /// <summary>
        /// Allows for searching for resources in the resource registry
        /// </summary>
        /// <param name="resourceSearch">The search model defining the search filter criterias</param>
        /// <returns>A list of service resources found to match the search criterias</returns>
        Task<List<ServiceResource>> Search(ResourceSearch resourceSearch);
    }
}
