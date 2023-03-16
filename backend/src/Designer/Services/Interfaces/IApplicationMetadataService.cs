using System.Threading.Tasks;
using Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// IApplicationMetadataService
    /// </summary>
    public interface IApplicationMetadataService
    {
        /// <summary>
        /// Registers the metadata connected to a specific GITEA repository on a certain commitId
        /// </summary>
        /// <param name="org">Organisation</param>
        /// <param name="app">Application</param>
        /// <param name="fullCommitId">Commit Id</param>
        /// <param name="envName">Environment Name</param>
        public Task UpdateApplicationMetadataInStorageAsync(string org, string app, string fullCommitId, string envName);

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
        public Task UpdateApplicationMetaDataLocally(string org, string app, Application applicationMetadata);

        /// <summary>
        /// Returns the application metadata for an application.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The application  metadata for an application.</returns>
        public Task<Application> GetApplicationMetadataFromRepository(string org, string app);

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
    }
}
