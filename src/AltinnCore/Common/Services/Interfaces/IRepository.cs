using System.Collections.Generic;
using System.Xml.Linq;

using AltinnCore.Common.Models;
using AltinnCore.ServiceLibrary;
using AltinnCore.ServiceLibrary.Configuration;
using AltinnCore.ServiceLibrary.ServiceMetadata;

namespace AltinnCore.Common.Services.Interfaces
{
    /// <summary>
    /// Interface for the repository service
    /// </summary>
    public interface IRepository : IServicePackageRepository
    {
        /// <summary>
        /// Creates the service model from XSD
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="serviceMetadata">The service metadata to generate the model based on</param>
        /// <param name="mainXsd">The main XSD for the current service</param>
        /// <returns>A boolean indicating the result</returns>
        bool CreateModel(string org, string service, ServiceMetadata serviceMetadata, XDocument mainXsd);

        /// <summary>
        /// Creates a new service
        /// </summary>
        /// <param name="serviceMetadata">The service metadata</param>
        /// <returns>The new serviceId</returns>
        bool CreateServiceMetadata(ServiceMetadata serviceMetadata);

        /// <summary>
        /// Returns serviceMetadata for a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The service meta data</returns>
        ServiceMetadata GetServiceMetaData(string org, string service);

        /// <summary>
        /// Returns a list of available services
        /// </summary>
        /// <returns>List of services</returns>
        List<ServiceMetadata> GetAvailableServices();

        /// <summary>
        /// Get content of configuration file
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="name">The name of configuration file</param>
        /// <returns>The fileContent</returns>
        string GetConfiguration(string org, string service, string name);

        /// <summary>
        /// Get content of resource file
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="id">The resource language id (for example <code>nb-NO, en</code>)</param>
        /// <returns>The resource file content</returns>
        string GetResource(string org, string service, string id);

        /// <summary>
        /// Gets the raw content of a code list
        /// </summary>
        /// <param name="org">The organization code of the service owner</param>
        /// <param name="service">The service code of the current service</param>
        /// <param name="name">The name of the code list to retrieve</param>
        /// <returns>Raw contents of a code list file</returns>
        string GetCodelist(string org, string service, string name);

        /// <summary>
        /// Update text resource
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="currentName">The current name of the view</param>
        /// <param name="newName">The new name of the view</param>
        void UpdateViewNameTextResource(string org, string service, string currentName, string newName);

        /// <summary>
        /// Get the content of the service model
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The content of a service model (c# code and comments)</returns>
        string GetServiceModel(string org, string service);

        /// <summary>
        /// Returns the workflow of a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The list of workflow steps</returns>
        List<WorkFlowStep> GetWorkFlow(string org, string service);

        /// <summary>
        /// Delete text resource
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="name">The name of the view</param>
        void DeleteTextResource(string org, string service, string name);

        /// <summary>
        /// Stores the configuration for a given fileName
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="name">The configuration name</param>
        /// <param name="config">The content of the config file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool SaveConfiguration(string org, string service, string name, string config);

        /// <summary>
        /// Stores the resource for a given language id
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="id">The resource language id (for example <code>nb-NO, en</code>)</param>
        /// <param name="resource">The content of the resource file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool SaveResource(string org, string service, string id, string resource);

        /// <summary>
        /// Deletes the resource for a given language id
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="id">The resource language id (for example <code>nb-NO, en</code>)</param>
        /// <returns>A boolean indicating if delete was ok</returns>
        bool DeleteLanguage(string org, string service, string id);

        /// <summary>
        /// Method that stores a code list to disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="name">The name on config</param>
        /// <param name="codelist">The content</param>
        /// <returns>A boolean indicating if the code list was successfully saved</returns>
        bool SaveCodeList(string org, string service, string name, string codelist);

        /// <summary>
        /// Method that deletes a code list from disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="name">The name on config</param>
        /// <returns>A boolean indicating the result</returns>
        bool DeleteCodeList(string org, string service, string name);

        /// <summary>
        /// Updates the serviceMetadata
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="serviceMetadata">The serviceMetadata</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool UpdateServiceMetadata(string org, string service, ServiceMetadata serviceMetadata);

        /// <summary>
        /// Updates rules for a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="rules">The rules to save</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool UpdateRules(string org, string service, List<RuleContainer> rules);

        /// <summary>
        /// Returns the rules for a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The rules for a service</returns>
        List<RuleContainer> GetRules(string org, string service);

        /// <summary>
        /// Returns a list of all service owners present in the local repository
        /// </summary>
        /// <returns>A list of all service owners</returns>
        IList<OrgConfiguration> GetOwners();

        /// <summary>
        /// Returns a list of all services for a given service owner present in the local repository
        /// </summary>
        /// <param name="org">The service owner code to use when getting services</param>
        /// <returns>A list of all services for the given org</returns>
        IList<ServiceConfiguration> GetServices(string org);

        /// <summary>
        /// Creates a new service owner folder in the repository location and saves the given configuration
        /// </summary>
        /// <param name="ownerConfig">The service owner configuration</param>
        /// <returns>Was the creation successful</returns>
        bool CreateOrg(OrgConfiguration ownerConfig);

        /// <summary>
        /// Creates a new service folder under the given <paramref name="owner">service owner</paramref> and saves the
        /// given <paramref name="serviceConfig"/>
        /// </summary>
        /// <param name="owner">The service owner to create the new service under</param>
        /// <param name="serviceConfig">The service configuration to save</param>
        /// <param name="repoCreated">whether the repo is created or not</param>
        /// <returns>The repository created in gitea</returns>
        RepositoryClient.Model.Repository CreateService(string owner, ServiceConfiguration serviceConfig, bool repoCreated = false);

        /// <summary>
        ///  Deletes a service folder from disk
        /// </summary>
        /// <param name="org">The service owner to delete the new service from</param>
        /// <param name="service">The service to delete</param>
        /// <returns>True if success, false otherwise</returns>
        bool DeleteService(string org, string service);

        /// <summary>
        /// Gets all code lists at service owner or service level
        /// </summary>
        /// <param name="org">The service owner code of the service owner to get code lists for</param>
        /// <param name="service">The service code of the service to get code lists for</param>
        /// <returns>All code lists for at the given location</returns>
        Dictionary<string, string> GetCodelists(string org, string service);

        /// <summary>
        /// Returns the service texts
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The text</returns>
        Dictionary<string, Dictionary<string, string>> GetServiceTexts(string org, string service);

        /// <summary>
        /// Returns the service languages
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The text</returns>
        List<string> GetLanguages(string org, string service);

        /// <summary>
        /// Returns the list over files in the implementation directory
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>The list of files</returns>
        List<AltinnCoreFile> GetImplementationFiles(string org, string service);

        /// <summary>
        /// Returns a list over the dynamics files for a Altinn Core service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>A list of file names</returns>
        List<AltinnCoreFile> GetDynamicsFiles(string org, string service);

        /// <summary>
        /// Returns the list over files in the Calculation directory
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>A list of file names</returns>
        List<AltinnCoreFile> GetCalculationFiles(string org, string service);

        /// <summary>
        /// Returns the file Content of a
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="fileName">The fileName</param>
        /// <returns>Content of a implementation file</returns>
        string GetImplementationFile(string org, string service, string fileName);

        /// <summary>
        /// Returns content of a resource file
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="fileName">The file Name</param>
        /// <returns>The file content</returns>
        string GetResourceFile(string org, string service, string fileName);

        /// <summary>
        /// Saving a implementation file
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="fileName">The fileName</param>
        /// <param name="fileContent">The file content</param>
        void SaveImplementationFile(string org, string service, string fileName, string fileContent);

        /// <summary>
        /// Saving a resource file
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="fileName">The fileName</param>
        /// <param name="fileContent">The file content</param>
        void SaveResourceFile(string org, string service, string fileName, string fileContent);

        /// <summary>
        /// Save service texts to resource files
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="texts">The texts to be saved</param>
        void SaveServiceTexts(string org, string service, Dictionary<string, Dictionary<string, string>> texts);

        /// <summary>
        /// Get XSD model from disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>Returns the XSD from file as a string.</returns>
        string GetXsdModel(string org, string service);

        /// <summary>
        /// Get Json Schema model from disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>Returns the Json Schema from file as a string.</returns>
        string GetJsonSchemaModel(string org, string service);

        /// <summary>
        /// Returns a given service resource embedded in a service
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="resource">The name of the resource</param>
        /// <returns>The content of the resource</returns>
        byte[] GetServiceResource(string org, string service, string resource);

        /// <summary>
        /// Get the Json form model from disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>Returns the json object as a string</returns>
        string GetJsonFormLayout(string org, string service);

        /// <summary>
        /// Get the Json third party components from disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>Returns the json object as a string</returns>
        string GetJsonThirdPartyComponents(string org, string service);

        /// <summary>
        /// Get the rule handler Json form model from disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <returns>Returns the json object as a string</returns>
        string GetRuleHandler(string org, string service);

        /// <summary>
        /// Save the JSON form layout to disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="resource">The content of the resource file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool SaveJsonFormLayout(string org, string service, string resource);

        /// <summary>
        /// Save the JSON third party components to disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="resource">The content of the resource file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool SaveJsonThirdPartyComponents(string org, string service, string resource);

        /// <summary>
        /// Save the JSON form layout to disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="resource">The content of the resource file</param>
        /// <param name="fileName">the name of the file</param>
        /// <returns>A boolean indicating if saving was ok</returns>
        bool SaveJsonFile(string org, string service, string resource, string fileName);

        /// <summary>
        /// Get the Json file from disk
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="fileName">The file name</param>
        /// <returns>Returns the json object as a string</returns>
        string GetJsonFile(string org, string service, string fileName);
    }
}
