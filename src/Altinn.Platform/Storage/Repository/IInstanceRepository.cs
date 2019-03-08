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
        /// <param name="reporteeId">the owner of the instance</param>
        /// <returns>The list of instances for a reportee</returns>
        Task<List<dynamic>> GetInstancesFromCollectionAsync(int reporteeId);

        /// <summary>
        /// Get instance details for the given parameters
        /// </summary>
        /// <param name="reporteeId">the owner of the instance</param>
        /// <param name="instanceId">the instance id</param>
        /// <returns>The instance for the given parameters</returns>
        Task<Instance> GetInstanceFromCollectionAsync(int reporteeId, Guid instanceId);

        /// <summary>
        /// insert new instance into collection
        /// </summary>
        /// <param name="item">the form data</param>
        /// <returns>The instance inserted into collection</returns>
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
