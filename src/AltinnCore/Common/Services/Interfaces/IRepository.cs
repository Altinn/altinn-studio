using System.Collections.Generic;
using System.Xml.Linq;
using Altinn.Platform.Storage.Models;
using AltinnCore.Common.Models;
using AltinnCore.ServiceLibrary.Configuration;
using AltinnCore.ServiceLibrary.Models;
using AltinnCore.ServiceLibrary.Models.Workflow;
using AltinnCore.ServiceLibrary.ServiceMetadata;
using Microsoft.AspNetCore.Mvc;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for repository functionality
    /// </summary>
    public interface IRepository : IServicePackageRepository
    {
        /// <summary>
        /// Creates the service model based on XSD.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="serviceMetadata">The <see cref="ServiceMetadata"/> to generate the model based on.</param>
        /// <param name="mainXsd">The main XSD for the current app</param>
        /// <returns>A boolean indicating the result</returns>
        bool CreateModel(string org, string app, ServiceMetadata serviceMetadata, XDocument mainXsd);

        /// <summary>
        /// Method that creates service metadata for a new app
        /// </summary>
        /// <param name="serviceMetadata">The <see cref="ServiceMetadata"/>.</param>
        /// <returns>A boolean indicating if creation of service metadata went ok</returns>
        bool CreateServiceMetadata(ServiceMetadata serviceMetadata);

        /// <summary>
        /// Returns the <see cref="ServiceMetadata"/> for an app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The service metadata for an app.</returns>
        ServiceMetadata GetServiceMetaData(string org, string app);

        /// <summary>
        /// List the available apps on local disk
        /// </summary>
        /// <returns>A list of apps</returns>
        List<ServiceMetadata> GetAvailableServices();

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
        /// <param name="fileName">The name of file path relative to service root directory</param>
        /// <returns>The fileContent</returns>
        string GetFileByRelativePath(string org, string app, string fileName);

        /// <summary>
        /// Get content of resource file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">The resource language id (for example <code>nb-NO, en</code>)</param>
        /// <returns>The resource file content</returns>
        string GetResource(string org, string app, string id);

        /// <summary>
        /// Gets the raw content of a code list
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="name">The name of the code list to retrieve</param>
        /// <returns>Raw contents of a code list file</returns>
        string GetCodelist(string org, string app, string name);

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
        string GetServiceModel(string org, string app);

        /// <summary>
        /// Returns the workflow of a service
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The list of workflow steps</returns>
        List<WorkFlowStep> GetWorkFlow(string org, string app);

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
        /// <param name="id">The resource language id (for example <code>nb-NO, en</code>)</param>
        /// <param name="resource">The content of the resource file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool SaveResource(string org, string app, string id, string resource);

        /// <summary>
        /// Deletes the resource for a given language id
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="id">The resource language id (for example <code>nb-NO, en</code>)</param>
        /// <returns>A boolean indicating if delete was ok</returns>
        bool DeleteLanguage(string org, string app, string id);

        /// <summary>
        /// Method that stores a code list to disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="name">The name on config</param>
        /// <param name="codelist">The content</param>
        /// <returns>A boolean indicating if the code list was successfully saved</returns>
        bool SaveCodeList(string org, string app, string name, string codelist);

        /// <summary>
        /// Method that deletes a code list from disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="name">The name on config</param>
        /// <returns>A boolean indicating the result</returns>
        bool DeleteCodeList(string org, string app, string name);

        /// <summary>
        /// Updates the serviceMetadata
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="serviceMetadata">The serviceMetadata</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool UpdateServiceMetadata(string org, string app, ServiceMetadata serviceMetadata);

        /// <summary>
        /// Updates rules for an app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="rules">The rules to save</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool UpdateRules(string org, string app, List<RuleContainer> rules);

        /// <summary>
        /// Returns the rules for an app.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The rules for a service</returns>
        List<RuleContainer> GetRules(string org, string app);

        /// <summary>
        /// Returns a list of all application owners present in the local repository
        /// </summary>
        /// <returns>A list of all application owners</returns>
        IList<OrgConfiguration> GetOwners();

        /// <summary>
        /// Returns a list of all apps for a given organisation present in the local repository
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <returns>A list of all apps for the given org</returns>
        IList<ServiceConfiguration> GetServices(string org);

        /// <summary>
        /// Creates a new app folder under the given <paramref name="owner">owner</paramref> and saves the
        /// given <paramref name="serviceConfig"/>
        /// </summary>
        /// <param name="owner">The app owner to create the new service under</param>
        /// <param name="serviceConfig">The ServiceConfiguration to save</param>
        /// <param name="repoCreated">whether the repo is created or not</param>
        /// <returns>The repository created in gitea</returns>
        RepositoryClient.Model.Repository CreateService(string owner, ServiceConfiguration serviceConfig, bool repoCreated = false);

        /// <summary>
        ///  Deletes an app folder from disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>True if success, false otherwise</returns>
        bool DeleteService(string org, string app);

        /// <summary>
        /// Gets all code lists at org or app level
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>All code lists for at the given location</returns>
        Dictionary<string, string> GetCodelists(string org, string app);

        /// <summary>
        /// Returns the app texts
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>The text</returns>
        Dictionary<string, Dictionary<string, string>> GetServiceTexts(string org, string app);

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
        string GetImplementationFile(string org, string app, string fileName);

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
        void SaveImplementationFile(string org, string app, string fileName, string fileContent);

        /// <summary>
        /// Saving a resource file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="fileName">The file name</param>
        /// <param name="fileContent">The file content</param>
        void SaveResourceFile(string org, string app, string fileName, string fileContent);

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
        void SaveServiceTexts(string org, string app, Dictionary<string, Dictionary<string, string>> texts);

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
        /// Get the Json form model from disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <returns>Returns the json object as a string</returns>
        string GetJsonFormLayout(string org, string app);

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
        /// <param name="resource">The content of the resource file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool SaveJsonFormLayout(string org, string app, string resource);

        /// <summary>
        /// Save the JSON third party components to disk
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="resource">The content of the resource file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool SaveJsonThirdPartyComponents(string org, string app, string resource);

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
        /// <returns></returns>
        bool AddMetadataForAttachment(string org, string app, string applicationMetadata);

        /// <summary>
        /// update  metadata for attachment
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="applicationMetadata">the application metadata to be updated</param>
        /// <returns></returns>
        bool UpdateMetadataForAttachment(string org, string app, string applicationMetadata);

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
        Application GetApplication(string org, string app);

        /// <summary>
        /// Creates the application metadata file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation., e.g. "app-name-with-spaces".</param>
        /// <param name="appTitle">The application title in default language (nb), e.g. "App name with spaces"</param>
        void CreateApplication(string org, string app, string appTitle);

        /// <summary>
        /// Updates application metadata
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="applicationMetadata">The application metadata to be updated</param>
        /// <returns>true if the metadata is updated successfully</returns>
        bool UpdateApplication(string org, string app, Application applicationMetadata);

        /// <summary>
        /// Updates app title in application metadata
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="languageId"> the language id</param>
        /// <param name="title"> new application title </param>
        /// <returns>True if the title in application metadata is updated successfully</returns>
        bool UpdateAppTitle(string org, string app, string languageId, string title);

        /// <summary>
        /// Gets the prefill json file
        /// </summary>
        /// <param name="org">The org</param>
        /// <param name="app">The app</param>
        /// <param name="dataModelName">the data model name</param>
        /// <returns></returns>
        string GetPrefillJson(string org, string app, string dataModelName = "ServiceModel");
    }
}
