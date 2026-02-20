#nullable disable
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models.App;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// IApplicationMetadataService
    /// </summary>
    public interface IApplicationMetadataService
    {
        /// <summary>
        /// Get content of config.json file, which is the editable parts of application metadata in Altinn Studio
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application</param>
        public Task<ServiceConfiguration> GetAppMetadataConfigAsync(string org, string app);

        /// <summary>
        /// Sets the content of config.json file, which is the editable parts of application metadata in Altinn Studio
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application</param>
        /// <param name="serviceConfiguration">ServiceConfiguration</param>
        public Task UpdateAppMetadataConfigAsync(string org, string app, ServiceConfiguration serviceConfiguration);

        /// <summary>
        /// Registers the metadata connected to a specific GITEA repository on a certain commitId
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application</param>
        /// <param name="fullCommitId">Commit Id</param>
        /// <param name="envName">Environment Name</param>
        /// <param name="cancellationToken">A <see cref="CancellationToken"/> that observes if operation is cancelled.</param>
        public Task UpdateApplicationMetadataInStorageAsync(string org, string app, string fullCommitId, string envName, CancellationToken cancellationToken = default);

        /// <summary>
        /// Updates app title in application metadata
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="languageId"> the language id</param>
        /// <param name="title"> new application title </param>
        public Task UpdateAppTitleInAppMetadata(string org, string app, string languageId, string title);

        /// <summary>
        /// Updates application metadata
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="applicationMetadata">The application metadata to be updated</param>
        public Task UpdateApplicationMetaDataLocally(string org, string app, ApplicationMetadata applicationMetadata);

        /// <summary>
        /// Returns the application metadata for an application.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The application  metadata for an application.</returns>
        public Task<ApplicationMetadata> GetApplicationMetadataFromRepository(string org, string app);

        /// <summary>
        /// Returns the application metadata exists in repo.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Flag if application metadata for an application.</returns>
        public bool ApplicationMetadataExistsInRepository(string org, string app);

        /// <summary>
        /// update  metadata for attachment
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="applicationMetadata">the application metadata to be updated</param>
        public Task AddMetadataForAttachment(string org, string app, string applicationMetadata);

        /// <summary>
        /// update metadata for attachment
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="applicationMetadata">the application metadata to be updated</param>
        public Task UpdateMetadataForAttachment(string org, string app, string applicationMetadata);

        /// <summary>
        /// Delete metadata for attachment component
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">the id of the attachment component</param>
        /// <returns></returns>
        public Task<bool> DeleteMetadataForAttachment(string org, string app, string id);

        /// <summary>
        /// Creates the application metadata file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation., e.g. "app-name-with-spaces".</param>
        /// <param name="appTitle">The application title in default language (nb), e.g. "App name with spaces"</param>
        public Task CreateApplicationMetadata(string org, string app, string appTitle);

        /// <summary>
        /// Sets the core properties of existing application metadata including organization, application ID, title, and audit fields.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="appTitle">The application title in default language (nb).</param>
        public Task SetCoreProperties(string org, string app, string appTitle);
    }
}
