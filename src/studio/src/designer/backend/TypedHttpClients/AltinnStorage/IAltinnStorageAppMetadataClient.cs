using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;
using Altinn.Studio.Designer.Services.Models;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnStorage
{
    /// <summary>
    /// IAltinnStorageAppMetadataClient
    /// </summary>
    public interface IAltinnStorageAppMetadataClient
    {
        /// <summary>
        /// Gets application metadata for a specific app from Platform.Storage
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application</param>
        /// <param name="environmentModel">EnvironmentModel</param>
        /// <returns></returns>
        Task<Application> GetApplicationMetadata(string org, string app, EnvironmentModel environmentModel);

        /// <summary>
        /// Creates application metadata for an application in Platform.Storage
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application connected to the organisation</param>
        /// <param name="applicationMetadata">Application</param>
        /// <param name="environmentModel">EnvironmentModel</param>
        /// <returns></returns>
        Task CreateApplicationMetadata(string org, string app, Application applicationMetadata, EnvironmentModel environmentModel);

        /// <summary>
        /// Updates application metadata for an application in Platform.Storage
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application connected to the organisation</param>
        /// <param name="applicationMetadata">Application</param>
        /// <param name="environmentModel">EnvironmentModel</param>
        /// <returns></returns>
        Task UpdateApplicationMetadata(string org, string app, Application applicationMetadata, EnvironmentModel environmentModel);
    }
}
