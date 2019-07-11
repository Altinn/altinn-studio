using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;

namespace Altinn.Platform.Storage.Repository
{
    /// <summary>
    /// The repository to handle application instances
    /// </summary>
    public interface IInstanceRepository
    {
        /// <summary>
        /// Gets all the instances for an instance owner
        /// </summary>
        /// <param name="instanceOwnerId">the owner of the instance</param>
        /// <returns>The list of instances for an instance owner</returns>
        Task<List<Instance>> GetInstancesOfInstanceOwner(int instanceOwnerId);

        /// <summary>
        /// Gets all the instances for an application owner
        /// </summary>
        /// <param name="org">the application owner</param>
        /// <returns>The list of instances for a given organisation</returns>
        Task<List<Instance>> GetInstancesOfOrg(string org);

        /// <summary>
        /// Gets all the instances for an app
        /// </summary>
        /// <param name="appId">the application identifier, e.g. org/app23</param>
        /// <param name="queryParams">the query params</param>
        /// <param name="continuationToken">a token to get the next page, more performant than using page</param>
        /// <param name="page">The page to show, is ignored if continuationToken is used</param>
        /// <param name="size">The number of items per page</param>
        /// <returns>The list of instances with for a given application</returns>
        Task<KeyValuePair<string, List<Instance>>> GetInstancesOfApplication(string appId, Dictionary<string, string> queryParams, string continuationToken, int page, int size);

        /// <summary>
        /// Get an instance for a given instance id
        /// </summary>
        /// <param name="instanceId">the instance id</param>
        /// <param name="instanceOwnerId">the instance owner id</param>
        /// <returns>The instance for the given parameters</returns>
        Task<Instance> GetOne(string instanceId, int instanceOwnerId);

        /// <summary>
        /// insert new instance into collection
        /// </summary>
        /// <param name="item">the instance to base the new one on</param>
        /// <returns>The instance id</returns>
        Task<Instance> Create(Instance item);

        /// <summary>
        /// update existing instance
        /// </summary>
        /// <param name="item">the instance to update</param>
        /// <returns>The updated instance</returns>
        Task<Instance> Update(Instance item);

        /// <summary>
        /// Delets an instance.
        /// </summary>
        /// <param name="item">The instance to delete</param>
        /// <returns>if the item is deleted or not</returns>
        Task<bool> Delete(Instance item);
    }
}
