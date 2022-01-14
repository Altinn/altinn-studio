using System.Collections.Generic;
using System.IO;
using System.Threading.Tasks;
using System.Xml.Linq;

using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.ModelMetadatalModels;
using Altinn.Studio.Designer.Models;

using PlatformStorageModels = Altinn.Platform.Storage.Interface.Models;

namespace Altinn.Studio.Designer.Services.Interfaces
{
    /// <summary>
    /// Interface for repository functionality
    /// </summary>
    public interface IRepository
    {
        /// <summary>
        /// Creates the service model based on XSD.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="serviceMetadata">The <see cref="ModelMetadata"/> to generate the model based on.</param>
        /// <param name="mainXsd">The main XSD for the current app</param>
        /// <param name="fileName">The name of the model metadata file.</param>
        /// <returns>A boolean indicating the result</returns>
        bool CreateModel(string org, string app, ModelMetadata serviceMetadata, XDocument mainXsd, string fileName);

        /// <summary>
        /// Method that creates service metadata for a new app
        /// </summary>
        /// <param name="serviceMetadata">The <see cref="ModelMetadata"/>.</param>
        /// <returns>A boolean indicating if creation of service metadata went ok</returns>
        bool CreateServiceMetadata(ModelMetadata serviceMetadata);

        /// <summary>
        /// Returns the <see cref="ModelMetadata"/> for an app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The service metadata for an app.</returns>
        ModelMetadata GetModelMetadata(string org, string app);

        /// <summary>
        /// Get content of configuration file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="name">The name of configuration file</param>
        /// <returns>The fileContent</returns>
        string GetConfiguration(string org, string app, string name);

        /// <summary>
        /// Get content of file path relative to root
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileName">The name of file path relative to app directory</param>
        /// <returns>The fileContent</returns>
        string GetFileByRelativePath(string org, string app, string fileName);

        /// <summary>
        /// Get content of resource file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">The resource language id (for example <code>nb, en</code>)</param>
        /// <returns>The resource file content</returns>
        string GetLanguageResource(string org, string app, string id);

        /// <summary>
        /// Update text resource
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="currentName">The current name of the view</param>
        /// <param name="newName">The new name of the view</param>
        void UpdateViewNameTextResource(string org, string app, string currentName, string newName);

        /// <summary>
        /// Gets the content of the ServiceModel as string
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The content of a service model (c# code and comments)</returns>
        string GetAppModel(string org, string app);

        /// <summary>
        /// Delete text resource
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="name">The name of the view</param>
        void DeleteTextResource(string org, string app, string name);

        /// <summary>
        /// Stores the configuration for a given fileName
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="name">The configuration name</param>
        /// <param name="config">The content of the config file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool SaveConfiguration(string org, string app, string name, string config);

        /// <summary>
        /// Stores the resource for a given language id
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">The resource language id (for example <code>nb, en</code>)</param>
        /// <param name="resource">The content of the resource file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool SaveLanguageResource(string org, string app, string id, string resource);

        /// <summary>
        /// Deletes the resource for a given language id
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">The resource language id (for example <code>nb, en</code>)</param>
        /// <returns>A boolean indicating if delete was ok</returns>
        bool DeleteLanguage(string org, string app, string id);

        /// <summary>
        /// Save the Rules configuration JSON file to disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="resource">The content of the resource file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool SaveRuleConfigJson(string org, string app, string resource);

        /// <summary>
        /// Updates the serviceMetadata
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="modelMetadata">The serviceMetadata.</param>
        /// <param name="modelName">The name of the data model.</param>
        void UpdateModelMetadata(string org, string app, ModelMetadata modelMetadata, string modelName);

        /// <summary>
        /// Returns a list of all organisations present in the local repository
        /// </summary>
        /// <returns>A list of all organisations</returns>
        IList<OrgConfiguration> GetOwners();

        /// <summary>
        /// Creates a new app folder under the given <paramref name="org">org</paramref> and saves the
        /// given <paramref name="serviceConfig"/>
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="serviceConfig">The ServiceConfiguration to save</param>
        /// <returns>The repository created in gitea</returns>
        Task<RepositoryClient.Model.Repository> CreateService(string org, ServiceConfiguration serviceConfig);

        /// <summary>
        /// Copies a repository within an organisation
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="sourceRepository">The name of the repository to be copied.</param>        
        /// <param name="targetRepository">The name of the new repository.</param>
        /// <param name="developer">Developer's username</param>
        /// <returns>The repository created in gitea</returns>
        Task<RepositoryClient.Model.Repository> CopyRepository(string org, string sourceRepository, string targetRepository, string developer);

        /// <summary>
        /// Deletes the local repository for the user and makes a new clone of the repo
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="repositoryName">the name of the local repository to reset</param>
        /// <returns>True if the reset was successful, otherwise false.</returns>
        bool ResetLocalRepository(string org, string repositoryName);

        /// <summary>
        /// Returns the app texts
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <remarks>
        /// Format of the dictionary is: &lt;textResourceElementId &lt;language, textResourceElement&gt;&gt;
        /// </remarks>
        /// <returns>The text resources</returns>
        Dictionary<string, Dictionary<string, TextResourceElement>> GetServiceTexts(string org, string app);

        /// <summary>
        /// Returns the app languages
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The text</returns>
        List<string> GetLanguages(string org, string app);

        /// <summary>
        /// Returns a list of files in the Implementation directory.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The list of files</returns>
        List<AltinnCoreFile> GetImplementationFiles(string org, string app);

        /// <summary>
        /// Returns a list of files in the Dynamics directory.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A list of file names</returns>
        List<AltinnCoreFile> GetDynamicsFiles(string org, string app);

        /// <summary>
        /// Returns the list of files in the Calculation directory.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A list of file names</returns>
        List<AltinnCoreFile> GetCalculationFiles(string org, string app);

        /// <summary>
        /// Returns a list of the validation files in the Validation directory.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>A list of file names</returns>
        List<AltinnCoreFile> GetValidationFiles(string org, string app);

        /// <summary>
        /// Returns content of an implementation file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileName">The file name</param>
        /// <returns>Content of an implementation file</returns>
        string GetAppLogic(string org, string app, string fileName);

        /// <summary>
        /// Returns content of a resource file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileName">The file name</param>
        /// <returns>The file content</returns>
        string GetResourceFile(string org, string app, string fileName);

        /// <summary>
        /// Saving an implementation file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileName">The file name</param>
        /// <param name="fileContent">The file content</param>
        void SaveAppLogicFile(string org, string app, string fileName, string fileContent);

        /// <summary>
        /// Saving a resource file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileName">The file name</param>
        /// <param name="fileContent">The file content</param>
        void SaveResourceFile(string org, string app, string fileName, string fileContent);

        /// <summary>
        /// Save rule handler file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="content">The content of the resource file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool SaveRuleHandler(string org, string app, string content);

        /// <summary>
        /// Method that stores contents of file path relative to root
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileName">The name on config</param>
        /// <param name="fileContent">The content</param>
        /// <returns>A boolean indicating if everything went ok</returns>
        bool SaveFile(string org, string app, string fileName, string fileContent);

        /// <summary>
        /// Save app texts to resource files
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="texts">The texts to be saved</param>
        /// <remarks>
        /// Format of the dictionary is expedted to be : &lt;textResourceElementId &lt;language, textResourceElement&gt;&gt;
        /// </remarks>
        void SaveServiceTexts(string org, string app, Dictionary<string, Dictionary<string, TextResourceElement>> texts);

        /// <summary>
        /// Get XSD model from disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Returns the XSD from file as a string.</returns>
        string GetXsdModel(string org, string app);

        /// <summary>
        /// Get Json Schema model from disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Returns the Json Schema from file as a string.</returns>
        string GetJsonSchemaModel(string org, string app);

        /// <summary>
        /// Returns a given app resource embedded in the app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="resource">The name of the resource</param>
        /// <returns>The content of the resource</returns>
        byte[] GetServiceResource(string org, string app, string resource);

        /// <summary>
        /// Get the form layouts from disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Returns the json object as a string</returns>
        string GetJsonFormLayouts(string org, string app);

        /// <summary>
        /// Get the Json third party components from disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Returns the json object as a string</returns>
        string GetJsonThirdPartyComponents(string org, string app);

        /// <summary>
        /// Get the rule handler Json form model from disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Returns the json object as a string</returns>
        string GetRuleHandler(string org, string app);

        /// <summary>
        /// Save the JSON form layout to disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="formLayout">The form layout name</param>
        /// <param name="content">The content of the resource file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool SaveFormLayout(string org, string app, string formLayout, string content);

        /// <summary>
        /// Updates a formlayout json name
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="currentName">Current form layout name</param>
        /// <param name="newName">The new form layout name</param>
        /// <returns>A boolean indicating if updating was ok</returns>
        bool UpdateFormLayoutName(string org, string app, string currentName, string newName);

        /// <summary>
        /// Removes a form layout from disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="formLayout">The form layout to be deleted</param>
        /// <returns>A boolean indicating if deleting was ok</returns>
        bool DeleteFormLayout(string org, string app, string formLayout);

        /// <summary>
        /// Saves a layout setting file on disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="setting">The content of the setting file</param>
        /// <returns>A boolean indicating if save was ok</returns>
        bool SaveLayoutSettings(string org, string app, string setting);

        /// <summary>
        /// Gets the layout settings
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The content as string</returns>
        string GetLayoutSettings(string org, string app);

        /// <summary>
        /// Save the JSON third party components to disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="resource">The content of the resource file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool SaveJsonThirdPartyComponents(string org, string app, string resource);

        /// <summary>
        /// Gets the widget settings for an app
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The content as string</returns>
        string GetWidgetSettings(string org, string app);

        /// <summary>
        /// Adds text resources to existing language resource files
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="textResourcesList">The list of text resource items to add</param>
        /// <returns>A boolean indicating if resources were added ok</returns>
        bool AddTextResources(string org, string app, List<TextResource> textResourcesList);

        /// <summary>
        /// Save the JSON form layout to disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="resource">The content of the resource file</param>
        /// <param name="fileName">the name of the file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool SaveJsonFile(string org, string app, string resource, string fileName);

        /// <summary>
        /// Get the Json file from disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileName">The file name</param>
        /// <returns>Returns the json object as a string</returns>
        string GetJsonFile(string org, string app, string fileName);

        /// <summary>
        /// update  metadata for attachment
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="applicationMetadata">the application metadata to be updated</param>
        void AddMetadataForAttachment(string org, string app, string applicationMetadata);

        /// <summary>
        /// update  metadata for attachment
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="applicationMetadata">the application metadata to be updated</param>
        void UpdateMetadataForAttachment(string org, string app, string applicationMetadata);

        /// <summary>
        /// Delete metadata for attachment component
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">the id of the attachment component</param>
        /// <returns></returns>
        bool DeleteMetadataForAttachment(string org, string app, string id);

        /// <summary>
        /// Updates the application information in Application metadata
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="applicationInformation">the application information to be updated</param>
        /// <returns>true if the information is updated successfully</returns>
        bool UpdateServiceInformationInApplication(string org, string app, ServiceConfiguration applicationInformation);

        /// <summary>
        /// Returns the application metadata for an application.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The application  metadata for an application.</returns>
        PlatformStorageModels.Application GetApplication(string org, string app);

        /// <summary>
        /// Creates the application metadata file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation., e.g. "app-name-with-spaces".</param>
        /// <param name="appTitle">The application title in default language (nb), e.g. "App name with spaces"</param>
        void CreateApplicationMetadata(string org, string app, string appTitle);

        /// <summary>
        /// Updates application metadata
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="applicationMetadata">The application metadata to be updated</param>
        void UpdateApplication(string org, string app, PlatformStorageModels.Application applicationMetadata);

        /// <summary>
        /// Updates app title in application metadata
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="languageId"> the language id</param>
        /// <param name="title"> new application title </param>
        void UpdateAppTitle(string org, string app, string languageId, string title);

        /// <summary>
        /// Gets the prefill json file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="dataModelName">the data model name</param>
        /// <returns></returns>
        string GetPrefillJson(string org, string app, string dataModelName = "ServiceModel");

        /// <summary>
        /// Create a new file in blob storage.
        /// </summary>
        /// <param name="org">The application owner id.</param>
        /// <param name="repo">The repository</param>
        /// <param name="filepath">The filepath</param>
        /// <param name="stream">Data to be written to blob storage.</param>
        /// <returns>The size of the blob.</returns>
        Task WriteData(string org, string repo, string filepath, Stream stream);

        /// <summary>
        /// Reads a data file from blob storage
        /// </summary>
        /// <param name="org">The application owner id.</param>
        /// <param name="repo">The repository</param>
        /// <param name="path">Path to be file to read blob storage.</param>
        /// <returns>The stream with the file</returns>
        Task<Stream> ReadData(string org, string repo, string path);

        /// <summary>
        /// Deletes the data element permanently
        /// </summary>
        /// <param name="org">The application owner id.</param>
        /// <param name="repo">The repository</param>
        /// <param name="path">Path to the file to delete.</param>
        void DeleteData(string org, string repo, string path);

        /// <summary>
        /// Lists the content of a repository
        /// </summary>
        List<FileSystemObject> GetContents(string org, string repository, string path = "");

        /// <summary>
        /// Returns the path to the app folder
        /// </summary>
        /// <param name="org">The application owner id.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns></returns>
        string GetAppPath(string org, string app);

        /// <summary>
        ///  Updates application model with new app logic model
        /// </summary>
        /// <param name="org">The org</param>
        /// <param name="app">The app</param>
        /// <param name="dataTypeId">The dataTypeId for the new app logic datamodel</param>
        /// <param name="classRef">The class ref</param>
        void UpdateApplicationWithAppLogicModel(string org, string app, string dataTypeId, string classRef);

        /// <summary>
        /// Deletes the repository both locally and remotely.
        /// </summary>
        /// <param name="org">The repository owner id.</param>
        /// <param name="repository">The repository name.</param>
        Task DeleteRepository(string org, string repository);
    }
}
