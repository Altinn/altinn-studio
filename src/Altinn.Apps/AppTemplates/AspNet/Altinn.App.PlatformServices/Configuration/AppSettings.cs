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
        public string AppBasePath { get; set; } = string.Empty;

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
        /// The authorization folder
        /// </summary>
        public string AuthorizationFolder { get; set; } = "authorization/";

        /// <summary>
        /// Gets or sets the BaseResourceFolderContainer that identifies where in the docker container the runtime can find files needed
        /// </summary>
        public string BaseResourceFolderContainer { get; set; }

        /// <summary>
        /// Gets or sets The name of the FormLayout json file Name
        /// </summary>
        public string FormLayoutJSONFileName { get; set; } = "FormLayout.json";

        /// <summary>
        /// Gets or sets the name of the layout setting file name
        /// </summary>
        public string FormLayoutSettingsFileName { get; set; } = "Settings.json";

        /// <summary>
        /// Gets or sets the name of the layoutsets file name
        /// </summary>
        public string LayoutSetsFileName { get; set; } = "layout-sets.json";

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
        /// Gets the location for the XACML Policy file
        /// </summary>
        public string ApplicationXACMLPolicyFileName { get; } = "policy.xml";

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
        /// App OIDC provider for application that overrides the default OIDC provider in platform
        /// </summary>
        public string AppOidcProvider { get; set; }

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

        /// <summary>
        /// Gets or sets a value indicating whether the app should send events to the Events component.
        /// </summary>
        public bool RegisterEventsWithEventsComponent { get; set; } = false;

        /// <summary>
        /// Gets or sets a value indicating whether the eFormidlingIntegration should be enabled.
        /// </summary>
        public bool EnableEFormidling { get; set; } = false;

        /// <summary>
        /// Gets or sets the sender of the eFormidling shipment.
        /// </summary>
        /// <remarks>
        /// If overriding for testing purposes, ensure to only update appsettings.Development.
        /// Integration will not work if value is overrided in staging or prodution.
        /// </remarks>
        public string EFormidlingSender { get; set; } = "910075918";

        /// <summary>
        /// Gets or sets the version of the application. 
        /// </summary>
        public string AppVersion { get; set; }
    }
}
