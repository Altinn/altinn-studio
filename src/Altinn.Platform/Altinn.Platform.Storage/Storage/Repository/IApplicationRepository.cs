using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Platform.Storage.Models;

namespace Altinn.Platform.Storage.Repository
{
    /// <summary>
    /// Interface to talk to the application repository
    /// </summary>
    public interface IApplicationRepository
    {
        /// <summary>
        /// Creates an application metadata object in repository
        /// </summary>
        /// <param name="item">the application metadata object</param>
        /// <returns></returns>
        Task<ApplicationMetadata> Create(ApplicationMetadata item);

        /// <summary>
        /// Delets an instance.
        /// </summary>
        /// <param name="applicationId">The id of the application to delete</param>
        /// <param name="applicationOwnerId">The application owner id</param>
        /// <returns>if the item is deleted or not</returns>
        Task<bool> Delete(string applicationId, string applicationOwnerId);

        /// <summary>
        /// Get the application owners' applications
        /// </summary>
        /// <param name="applicationOwnerId">application owner id</param>
        /// <returns>the instance for the given parameters</returns>
        Task<List<ApplicationMetadata>> ListApplications(string applicationOwnerId);

        /// <summary>
        /// Get the instance based on the input parameters
        /// </summary>
        /// <param name="applicationId">application id</param>
        /// <param name="applicationOwnerId">applicaiton owner id</param>
        /// <returns>the instance for the given parameters</returns>
        Task<ApplicationMetadata> FindOne(string applicationId, string applicationOwnerId);

        /// <summary>
        /// Update instance for a given form id
        /// </summary>
        /// <param name="item">the instance</param>
        /// <returns>The instance</returns>
        Task<ApplicationMetadata> Update(ApplicationMetadata item);
    }
}
