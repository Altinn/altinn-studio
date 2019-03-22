using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;

namespace Altinn.Platform.Storage.Repository
{
    public interface IInstanceRepository
    {
        /// <summary>
        /// Gets all the instances for a reportee
        /// </summary>
        /// <param name="instanceOwnerId">the owner of the instance</param>
        /// <returns>The list of instances for a reportee</returns>
        Task<List<Instance>> GetInstancesOfInstanceOwnerAsync(int instanceOwnerId);

        /// <summary>
        /// Gets all the instances for an application owner
        /// </summary>
        /// <param name="applicationOwnerId">the application owner</param>
        /// <returns>The list of instances for a reportee</returns>
        Task<List<Instance>> GetInstancesOfApplicationOwnerAsync(string applicationOwnerId);

        /// <summary>
        /// Get an instance details for the given parameters
        /// </summary>
        /// <param name="instanceId">the instance id</param>
        /// <param name="instanceOwnerId">the instance owner id</param>
        /// <returns>The instance for the given parameters</returns>
        Task<Instance> GetOneAsync(Guid instanceId, int instanceOwnerId);

        /// <summary>
        /// insert new instance into collection
        /// </summary>
        /// <param name="item">the form data</param>
        /// <returns>The instance id</returns>
        Task<string> InsertInstanceIntoCollectionAsync(Instance item);

        /// <summary>
        /// update existing instance
        /// </summary>
        /// <param name="id">the instance id</param>
        /// <param name="item">the instance</param>
        /// <returns>The updated instance</returns>
        Task<Instance> UpdateInstanceInCollectionAsync(Guid id, Instance item);
    }
}
