using System.Collections.Generic;
using Altinn.App.Services.Models;

using Newtonsoft.Json;

namespace Altinn.App.Services.Configuration
{
    /// <summary>
    /// Class that represents the ServiceRepositorySettings
    /// </summary>
    public class AppSettings
    {
        /// <summary>
        /// Constant for the location of resource files
        /// </summary>
        public const string RESOURCE_FOLDER_NAME = "Resources/";

        /// <summary>
        /// Constant for the location of service metadata file
        /// </summary>
        public const string METADATA_FILENAME = "metadata.json";

        /// <summary>
        /// Constant for the location of json schema file
        /// </summary>
        public const string JSON_SCHEMA_FILENAME = "schema.json";

        /// <summary>
        /// The app configuration baseUrl where files are stored in the container
        /// </summary>
        public string AppBasePath { get; set; } = "";

        /// <summary>
        /// The app configuration baseUrl where files are stored in the container
        /// </summary>
        public string ConfigurationFolder { get; set; } = "config/";

        /// <summary>
        /// The app options base folder where files are stored in the container
        /// </summary>
        public string OptionsFolder { get; set; } = "options/";

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
        /// Gets or sets the BaseResourceFolderContainer that identifies where in the docker container the runtime can find files needed
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
        /// Gets or sets The ServiceMetadata file name
        /// </summary>
        public string ServiceMetadataFileName { get; set; } = METADATA_FILENAME;

        /// <summary>
        /// Gets or sets The JSON schema file name
        /// </summary>
        public string JsonSchemaFileName { get; set; } = JSON_SCHEMA_FILENAME;

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
        /// Open Id Connect Well known endpoint
        /// </summary>
        public string OpenIdWellKnownEndpoint { get; set; }

        /// <summary>
        /// Hostname
        /// </summary>
        public string Hostname { get; set; }

        /// <summary>
        /// Name of the cookie for runtime
        /// </summary>
        public string RuntimeCookieName { get; set; }

        /// <summary>
        /// Option to disable csrf check
        /// </summary>
        public bool DisableCsrfCheck { get; set; }

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
        /// Get Resource Folder name
        /// </summary>
        /// <returns>The resource folder</returns>
        public string GetResourceFolder()
        {
            return RESOURCE_FOLDER_NAME;
        }

        /// <summary>
        /// Cache lifetime for app resources
        /// </summary>
        public int CacheResourceLifeTimeInSeconds { get; set; } = 3600;
    }
}
