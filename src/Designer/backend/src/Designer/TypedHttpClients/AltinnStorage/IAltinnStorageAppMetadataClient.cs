#nullable disable
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.App;

namespace Altinn.Studio.Designer.TypedHttpClients.AltinnStorage
{
    /// <summary>
    /// IAltinnStorageAppMetadataClient
    /// </summary>
    public interface IAltinnStorageAppMetadataClient
    {
        /// <summary>
        /// Creates application metadata for an application in Platform.Storage
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application connected to the organisation</param>
        /// <param name="applicationMetadata">Application</param>
        /// <param name="envName">Environment Name</param>
        /// <returns></returns>
        Task UpsertApplicationMetadata(string org, string app, ApplicationMetadata applicationMetadata, string envName);

        /// <inheritdoc cref="UpsertApplicationMetadata(string,string,Altinn.Studio.Designer.Models.App.ApplicationMetadata,string)"/>
        Task UpsertApplicationMetadata(string org, string app, string applicationMetadataJson, string envName);

        /// <summary>
        /// Returns the application metadata that is stored in Platform.Storage
        /// </summary>
        /// <param name="altinnRepoContext">An <see cref="AltinnRepoContext"/> holding the info of the organization and the repo.</param>
        /// <param name="envName">A name of the platform environment.</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        /// <returns>An <see cref="ApplicationMetadata"/> that's currently stored in the storage</returns>
        Task<ApplicationMetadata> GetApplicationMetadataAsync(AltinnRepoContext altinnRepoContext, string envName, CancellationToken cancellationToken = default);

        /// <inheritdoc cref="GetApplicationMetadataAsync"/>
        /// <returns>A raw (<see cref="string"/>) representation of the <see cref="ApplicationMetadata"/> for an app, as currently stored in the Storage service</returns>
        Task<string> GetApplicationMetadataJsonAsync(AltinnRepoContext altinnRepoContext, string envName, CancellationToken cancellationToken = default);
    }
}
