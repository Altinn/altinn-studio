namespace Altinn.Platform.Storage.Repository
{
    using System.Collections.Generic;
    using System.Threading.Tasks;
    using Altinn.Platform.Storage.Models;

    /// <summary>
    /// Interface to talk to the application repository
    /// </summary>
    public interface IApplicationRepository
    {
        /// <summary>
        /// Creates an application metadata object in repository
        /// </summary>
        /// <param name="item">the application metadata object</param>
        /// <returns>the created application</returns>
        Task<Application> Create(Application item);

        /// <summary>
        /// Delets an instance.
        /// </summary>
        /// <param name="appId">The id of the application to delete</param>
        /// <param name="org">The application owner id</param>
        /// <returns>if the item is deleted or not</returns>
        Task<bool> Delete(string appId, string org);

        /// <summary>
        /// Get the application owners' applications
        /// </summary>
        /// <param name="org">application owner id</param>
        /// <returns>the instance for the given parameters</returns>
        Task<List<Application>> ListApplications(string org);

        /// <summary>
        /// Get the instance based on the input parameters
        /// </summary>
        /// <param name="appId">application id</param>
        /// <param name="org">applicaiton owner id</param>
        /// <returns>the instance for the given parameters</returns>
        Task<Application> FindOne(string appId, string org);

        /// <summary>
        /// Get a list of application titles based on applicationId.
        /// </summary>
        /// <param name="appIds">List of application ids.</param>
        /// <returns>A dictionary of application titles based on applicationId.</returns>
        Task<Dictionary<string, Dictionary<string, string>>> GetAppTitles(List<string> appIds);

        /// <summary>
        /// Update instance for a given form id
        /// </summary>
        /// <param name="item">the application object</param>
        /// <returns>The updated application instance</returns>
        Task<Application> Update(Application item);
    }
}
