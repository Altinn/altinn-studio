using System.Collections.Generic;
using System.Threading.Tasks;

using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Platform.Storage.Repository
{
    /// <summary>
    /// Interface to talk to the application repository
    /// </summary>
    public interface IApplicationRepository
    {
        /// <summary>
        /// Get all applications
        /// </summary>
        /// <returns>A list of Applications</returns>
        Task<List<Application>> FindAll();

        /// <summary>
        /// Get the application owners' applications
        /// </summary>
        /// <param name="org">application owner id</param>
        /// <returns>the instance for the given parameters</returns>
        Task<List<Application>> FindByOrg(string org);

        /// <summary>
        /// Get the instance based on the input parameters
        /// </summary>
        /// <param name="appId">application id</param>
        /// <param name="org">applicaiton owner id</param>
        /// <returns>the instance for the given parameters</returns>
        Task<Application> FindOne(string appId, string org);

        /// <summary>
        /// Creates an application metadata object in repository
        /// </summary>
        /// <param name="item">the application metadata object</param>
        /// <returns>the created application</returns>
        Task<Application> Create(Application item);

        /// <summary>
        /// Update instance for a given form id
        /// </summary>
        /// <param name="item">the application object</param>
        /// <returns>The updated application instance</returns>
        Task<Application> Update(Application item);

        /// <summary>
        /// Delets an instance.
        /// </summary>
        /// <param name="appId">The id of the application to delete</param>
        /// <param name="org">The application owner id</param>
        /// <returns>if the item is deleted or not</returns>
        Task<bool> Delete(string appId, string org);

        /// <summary>
        /// Gets a dictionary of all application titles.
        /// </summary>
        /// <returns>A dictionary of application titles.</returns>
        /// <remarks>
        /// Key is application id formated as [org]/[app]
        /// The value holds the titles, each language by ';'.
        /// </remarks>
        Task<Dictionary<string, string>> GetAllAppTitles();
    }
}
