using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Microsoft.Extensions.Primitives;

namespace Altinn.Platform.Storage.Repository
{
    /// <summary>
    /// The repository to handle application instances
    /// </summary>
    public interface IInstanceRepository
    {
        /// <summary>
        /// Gets all the instances that satisfy given query parameters
        /// </summary>
        /// <param name="queryParams">the query params</param>
        /// <param name="continuationToken">a token to get the next page, more performant than using page</param>
        /// <param name="size">The number of items per page</param>
        /// <returns>The query response including the list of instances</returns>
        Task<InstanceQueryResponse> GetInstancesFromQuery(Dictionary<string, StringValues> queryParams, string continuationToken, int size);

        /// <summary>
        /// Get an instance for a given instance id
        /// </summary>
        /// <param name="instanceOwnerPartyId">the instance owner id</param>
        /// <param name="instanceGuid">the instance guid</param>
        /// <returns>The instance for the given parameters</returns>
        Task<Instance> GetOne(int instanceOwnerPartyId, Guid instanceGuid);

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
