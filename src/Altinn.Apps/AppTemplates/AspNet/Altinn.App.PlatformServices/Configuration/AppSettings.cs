using System;
using System.Collections.Generic;
using Altinn.App.Services.Helpers.Extensions;
using Altinn.App.Services.Models;
using Newtonsoft.Json;

namespace Altinn.App.Services.Configuration
{
    /// <summary>
    /// Class that represents the ServiceRepositorySettings
    /// </summary>
    public class AppSettings
    {
        public const string CONFIG_FOLDER_NAME = "Codelists/";

        /// <summary>
        /// Constant for the location of service code lists
        /// </summary>
        public const string CODELISTS_FOLDER_NAME = "Codelists/";

        /// <summary>
        /// Constant for the location of resource files
        /// </summary>
        public const string RESOURCE_FOLDER_NAME = "Resources/";

        /// <summary>
        /// Constant for the location of implementation files
        /// </summary>
        public const string IMPLEMENTATION_FOLDER_NAME = "Implementation/";

        /// <summary>
        /// Constant for the location of dynamics files
        /// </summary>
        public const string DYNAMICS_FOLDER_NAME = "Dynamics/";

        /// <summary>
        /// Constant for the location of calculation files
        /// </summary>
        public const string CALCULATION_FOLDER_NAME = "Calculation/";

        /// <summary>
        /// Constant for the location of validation files
        /// </summary>
        public const string VALIDATION_FOLDER_NAME = "Validation/";

        /// <summary>
        /// Constant for the location of the testdata for parties folder
        /// </summary>
        public const string TESTDATA_FOR_PARTY_FOLDER_NAME = "Testdataforparty/";

        /// <summary>
        /// Constant for the location of service tests
        /// </summary>
        public const string TEST_FOLDER_NAME = "Test/";

        /// <summary>
        /// Constant for the location of service deployment charts
        /// </summary>
        public const string DEPLOYMENT_FOLDER_NAME = "deployment/";

        /// <summary>
        /// Constant for the service binaries
        /// </summary>
        public const string BINARY_FOLDER_NAME = "bin/";

        /// <summary>
        /// Constant for the location of org level text resources
        /// </summary>
        public const string TEXTRESOURCE_ORG_FOLDER_NAME = "/text/";

        /// <summary>
        /// Constant for the location of org level text resources
        /// </summary>
        public const string TEXTRESOURCE_COMMON_FOLDER_NAME = "/altinn/common/text/";

        /// <summary>
        /// Constant for the location of app metadata
        /// </summary>
        public const string METADATA_FOLDER_NAME = "Metadata/";

        private const string PACKAGES_LOCATION = "Packages/";
        private const string TEMP_LOCATION = "Temp/";
        private const string TESTDATA_FOLDER_NAME = "Data/";

        /// <summary>
        /// Constant for the location of service metadata file
        /// </summary>
        public const string METADATA_FILENAME = "metadata.json";


        /// <summary>
        /// The app configuration baseUrl where files are stored in the container
        /// </summary>
        public string AppBasePath { get; set; } = "";

        /// <summary>
        /// The app configuration baseUrl where files are stored in the container
        /// </summary>
        public string ConfigurationFolder { get; set; } = "config/";

        /// <summary>
        /// The ui configuration baseUrl where files are stored in the container
        /// </summary>
        public string UiFolder { get; set; } = "ui/";

        /// <summary>
        /// The models folder
        /// </summary>
        public string ModelsFolder { get; set; } = "models/";

        /// <summary>
        /// The text folder
        /// </summary>
        public string TextFolder { get; set; } = "texts/";

        /// <summary>
        /// The process folder
        /// </summary>
        public string ProcessFolder { get; set; } = "process/";

        /// <summary>
        /// Gets or sets the Repository Location
        /// </summary>
        public string RepositoryLocation { get; set; }

        /// <summary>
        /// Gets or sets the BaseResourceFolderContainer that identifes where in the docker container the runtime can find files needed
        /// </summary>
        public string BaseResourceFolderContainer { get; set; }

        /// <summary>
        /// Gets or sets The name of the FormLayout json file Name
        /// </summary>
        public string FormLayoutJSONFileName { get; set; } = "FormLayout.json";

        /// <summary>
        /// Gets or sets The name of the rule configuration json file Name
        /// </summary>
        public string RuleConfigurationJSONFileName { get; set; } = "RuleConfiguration.json";

        /// <summary>
        /// Gets or sets The name of the ThirdPartyComponents json file Name
        /// </summary>
        public string ThirdPartyComponentsJSONFileName { get; set; } = RESOURCE_FOLDER_NAME + "ThirdPartyComponents.json";

        /// <summary>
        /// Gets or sets The ServiceMetadata file name
        /// </summary>
        public string ServiceMetadataFileName { get; set; } = METADATA_FILENAME;

        /// <summary>
        /// Gets or sets the filename for application meta data
        /// </summary>
        public string ApplicationMetadataFileName { get; set; } = "applicationmetadata.json";

        /// <summary>
        /// Gets or sets the filename for process file
        /// </summary>
        public string ProcessFileName { get; set; } = "process.bpmn";

        /// <summary>
        /// Gets or sets React file name
        /// </summary>
        public string RuntimeAppFileName { get; set; } = "runtime.js";

        /// <summary>
        /// Gets or sets React CSS file name
        /// </summary>
        public string RuntimeCssFileName { get; set; } = "runtime.css";

        /// <summary>
        /// Gets or sets styles config file name for the app.
        /// </summary>
        public string ServiceStylesConfigFileName { get; set; } = "Styles.json";

        /// <summary>
        /// Gets or sets default Bootstrap url
        /// </summary>
        public string DefaultBootstrapUrl { get; set; } = "https://stackpath.bootstrapcdn.com/bootstrap/4.1.0/css/bootstrap.min.css";

        /// <summary>
        /// Gets or sets the filename for the instantiation handler
        /// </summary>
        public string RuleHandlerFileName { get; set; } = "RuleHandler.js";


        /// <summary>
        /// Gets the styles config element
        /// </summary>
        public string GetStylesConfig()
        {
            StylesConfig stylesConfig = new StylesConfig();
            stylesConfig.InternalStyles = new List<string>();
            stylesConfig.InternalStyles.Add(RuntimeCssFileName);
            stylesConfig.ExternalStyles = new List<string>();
            stylesConfig.ExternalStyles.Add(DefaultBootstrapUrl);

            return JsonConvert.SerializeObject(stylesConfig);
        }

        /// <summary>
        /// Gets the full path to the app directory.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetAppPath(string org, string app, string developer = null)
        {
            org = org.AsFileName();
            app = app.AsFileName();
            developer = developer.AsFileName();

            if (developer != null)
            {
                developer += $"/{org}/{app}/";
            }

            string repositoryLocation = Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") ?? RepositoryLocation;
            return developer != null ? $"{repositoryLocation}{developer}" : $"{repositoryLocation}";
        }

           /// <summary>
        /// Gets the full path to Dynamics directory (within ResourcesDirecory)
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetDynamicsPath(string org, string app, string developer)
        {
            return GetAppPath(org, app, developer) + RESOURCE_FOLDER_NAME + DYNAMICS_FOLDER_NAME;
        }

        /// <summary>
        /// Gets The full path to Metadata directory
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetMetadataPath(string org, string app, string developer)
        {
            return METADATA_FOLDER_NAME;
        }

        /// <summary>
        /// Get Resource Folder name
        /// </summary>
        /// <returns>The resource folder</returns>
        public string GetResourceFolder()
        {
            return RESOURCE_FOLDER_NAME;
        }

        /// <summary>
        /// Returns the Metadata folder name
        /// </summary>
        /// <returns>The metadata folder</returns>
        public string GetMetadataFolder()
        {
            return METADATA_FOLDER_NAME;
        }

        /// <summary>
        /// Gets the full path to model directory
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetModelPath(string org, string app, string developer)
        {
            return  "Models/";
        } 
    }
}
