using System.Threading.Tasks;
using Altinn.Studio.Designer.Models.App;

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
        /// <param name="envName">Environment Name</param>
        /// <returns></returns>
        Task<ApplicationMetadata> GetApplicationMetadata(string org, string app, string envName);

        /// <summary>
        /// Creates application metadata for an application in Platform.Storage
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application connected to the organisation</param>
        /// <param name="applicationMetadata">Application</param>
        /// <param name="envName">Environment Name</param>
        /// <returns></returns>
        Task CreateApplicationMetadata(string org, string app, ApplicationMetadata applicationMetadata, string envName);

        /// <summary>
        /// Updates application metadata for an application in Platform.Storage
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application connected to the organisation</param>
        /// <param name="applicationMetadata">Application</param>
        /// <param name="envName">Environment Name</param>
        /// <returns></returns>
        Task UpdateApplicationMetadata(string org, string app, ApplicationMetadata applicationMetadata, string envName);
    }
}
