using System;
using System.Collections.Generic;
using System.IO;
using Altinn.Studio.Designer.Helpers.Extensions;
using Altinn.Studio.Designer.Models;
using Newtonsoft.Json;

namespace Altinn.Studio.Designer.Configuration
{
    /// <summary>
    /// Class that represents the ServiceRepositorySettings
    /// </summary>
    public class ServiceRepositorySettings
    {
        /// <summary>
        /// Constant for the location of resource files
        /// </summary>
        public const string RESOURCE_FOLDER_NAME = "Resources/";

        /// <summary>
        /// Constant for the location of language resource files
        /// </summary>
        public const string UI_RESOURCE_FOLDER_NAME = "App/ui/";

        /// <summary>
        /// Constant for the location of form layouts
        /// </summary>
        public const string FORMLAYOUTS_RESOURCE_FOLDER_NAME = "layouts/";

        /// <summary>
        /// Constant for the location of language resource files
        /// </summary>
        public const string LANGUAGE_RESOURCE_FOLDER_NAME = "texts/";

        /// <summary>
        /// Constant for the location of config folder
        /// </summary>
        public const string CONFIG_FOLDER_PATH = "App/config/";

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
        public const string CALCULATION_FOLDER_NAME = "App/logic/Calculation/";

        /// <summary>
        /// Constant for the location of validation files
        /// </summary>
        public const string VALIDATION_FOLDER_NAME = "App/logic/Validation/";

        /// <summary>
        /// Constant for the name of rule configuration file
        /// </summary>
        public const string RULE_CONFIG_FILE_NAME = "RuleConfiguration.json";

        /// <summary>
        /// Constant for the name of the layout setting file
        /// </summary>
        public const string LAYOUT_SETTING_FILE = "Settings.json";

        /// <summary>
        /// Constant for the location of app logic files
        /// </summary>
        public const string APPLOGIC_FOLDER_NAME = "App/logic/";

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
        /// Constant for the location of service deployment charts
        /// </summary>
        public const string APP_FOLDER_NAME = "App/";

        /// <summary>
        /// Constant for the location of service intergrationtests charts
        /// </summary>
        public const string INTERGRATIONTESTS_FOLDER_NAME = "App.IntegrationTests/";

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
        /// Constant for the location of widgets
        /// </summary>
        public const string WIDGETS_FOLDER_NAME = "widgets/";

        /// <summary>
        /// Constant for the location of app metadata
        /// </summary>
        public const string MODEL_METADATA_FOLDER_PATH = "App/models/";

        private const string PACKAGES_LOCATION = "Packages/";
        private const string TEMP_LOCATION = "Temp/";
        private const string TESTDATA_FOLDER_NAME = "Data/";

        /// <summary>
        /// constant for the location of authorization policies
        /// </summary>
        public const string AUTHORIZATION_FOLDER_NAME = "App/config/authorization/";

        /// <summary>
        /// Constant for the location of service metadata file
        /// </summary>
        public const string METADATA_FILENAME = "ServiceMetadata.json";

        /// <summary>
        /// Gets or sets the Repository Location
        /// </summary>
        public string RepositoryLocation { get; set; }

        /// <summary>
        /// Gets or sets a value indicating if runtime should fetch app information from database or from disk
        /// </summary>
        public bool ShouldFetchFromDatabase { get; set; }

        /// <summary>
        /// Gets or sets the url for the API Endpoint
        /// </summary>
        public string ApiEndPoint { get; set; }

        /// <summary>
        /// Gets or sets the API endpoint host
        /// </summary>
        public string ApiEndPointHost { get; set; }

        /// <summary>
        /// Gets or sets the Repository Base URL
        /// </summary>
        public string RepositoryBaseURL { get; set; }

        /// <summary>
        /// Gets or sets the GiteaCookieName
        /// </summary>
        public string GiteaCookieName { get; set; }

        /// <summary>
        /// Gets or sets the GiteaLoginUrl
        /// </summary>
        public string GiteaLoginUrl { get; set; }

        /// <summary>
        /// Gets or sets the BaseResourceFolderContainer that identifes where in the docker container the runtime can find files needed
        /// </summary>
        public string BaseResourceFolderContainer { get; set; }

        /// <summary>
        /// Gets or sets The name of the ServiceModel file Name
        /// </summary>
        public string ServiceModelFileName { get; set; } = "ServiceModel.cs";

        /// <summary>
        /// Gets or sets The name of the ServiceModel xsd file Name
        /// </summary>
        public string ServiceModelXSDFileName { get; set; } = "ServiceModel.xsd";

        /// <summary>
        /// Gets or sets The name of the ServiceModel json schema jsd file Name
        /// </summary>
        public string ServiceModelJsonSchemaFileName { get; set; } = "ServiceModel.schema.json";

        /// <summary>
        /// Gets or sets The name of the FormLayout json file Name
        /// </summary>
        public string FormLayoutJSONFileName { get; set; } = UI_RESOURCE_FOLDER_NAME + "FormLayout.json";

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
        /// Gets or sets config file name for the app.
        /// </summary>
        public string ServiceConfigFileName { get; set; } = "config.json";

        /// <summary>
        /// Gets or sets default Bootstrap url
        /// </summary>
        public string DefaultBootstrapUrl { get; set; } = "https://stackpath.bootstrapcdn.com/bootstrap/4.1.0/css/bootstrap.min.css";

        /// <summary>
        /// Gets or sets the filename for app implementation
        /// </summary>
        public string AppImplementationFileName { get; set; } = "App.cs";

        /// <summary>
        /// Gets or sets the filename for calculation handler
        /// </summary>
        public string CalculationHandlerFileName { get; set; } = "CalculationHandler.cs";

        /// <summary>
        /// Gets or sets the filename for the validation handler
        /// </summary>
        public string ValidationHandlerFileName { get; set; } = "ValidationHandler.cs";

        /// <summary>
        /// Gets or sets the filename for the instantiation handler
        /// </summary>
        public string InstantiationHandlerFileName { get; set; } = "InstantiationHandler.cs";

        /// <summary>
        /// Gets or sets the filename for the instantiation handler
        /// </summary>
        public string RuleHandlerFileName { get; set; } = "RuleHandler.js";

        /// <summary>
        /// Gets or sets the filename for the default service layout
        /// </summary>
        public string DefaultLayoutFileName { get; set; } = "_ServiceLayout.cshtml";

        /// <summary>
        /// Gets or sets the filename for the default view start file
        /// </summary>
        public string DefaultViewStartFileName { get; set; } = "_ViewStart.cshtml";

        /// <summary>
        /// Gets or sets the filename for the default view imports file
        /// </summary>
        public string DefaultViewImportsFileName { get; set; } = "_ViewImports.cshtml";

        /// <summary>
        /// Gets or sets the filename for the rules file
        /// </summary>
        public string RulesFileName { get; set; } = "Rules.json";

        /// <summary>
        /// Gets or sets the filename for the Dockerfile file
        /// </summary>
        public string DockerfileFileName { get; set; } = "Dockerfile";

        /// <summary>
        /// Gets or sets the filename for the altinn service project
        /// </summary>
        public string ProjectFileName { get; set; } = "AltinnService.csproj";

        /// <summary>
        /// Gets or sets the filename for the git ignore file
        /// </summary>
        public string GitIgnoreFileName { get; set; } = ".gitignore";

        /// <summary>
        /// Gets or sets the filename for the docker ignore file
        /// </summary>
        public string DockerIgnoreFileName { get; set; } = ".dockerignore";

        /// <summary>
        /// Gets or sets the filename for the authorization policy file (XACML)
        /// </summary>
        public string AuthorizationPolicyFileName { get; set; } = "policy.xml";

        /// <summary>
        /// Gets or sets the repo search page count used for searching repos
        /// </summary>
        public int RepoSearchPageCount { get; set; } = 1337;

        /// <summary>
        /// Gets or sets the file name for the widet settings
        /// </summary>
        public string WidgetSettingsFileName { get; set; } = "widgetSettings.json";

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
        /// Gets the full path to the org directory
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="developer">The current user, app developer</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetOrgPath(string org, string developer = null)
        {
            developer = developer.AsFileName();
            org = org.AsFileName();

            if (developer != null)
            {
                developer += "/";
            }

            return $"{RepositoryLocation}{developer}{org}/";
        }

        /// <summary>
        /// Gets the full path to the app directory.
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetServicePath(string org, string app, string developer = null)
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
        /// Gets the full path to the testdata for party directory
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">The current user, app developer.</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetTestdataForPartyPath(string org, string app, string developer = null)
        {
            org = org.AsFileName();
            app = app.AsFileName();
            developer = developer.AsFileName();

            if (developer != null)
            {
                developer += "/";
            }

            return $"{RepositoryLocation}{developer}{org}/{app}/{TESTDATA_FOR_PARTY_FOLDER_NAME}";
        }

        /// <summary>
        /// Method that returns the path to the form layout file in the old format
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">The current developer</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetOldFormLayoutPath(string org, string app, string developer)
        {
            org = org.AsFileName();
            app = app.AsFileName();
            developer = developer.AsFileName();
            return Path.Join(RepositoryLocation, developer, org, app, FormLayoutJSONFileName);
        }

        /// <summary>
        /// Method that returns the path to the a specific form layout
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">The current developer</param>
        /// <param name="formLayout">The form layout name</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetFormLayoutPath(string org, string app, string developer, string formLayout)
        {
            org = org.AsFileName();
            app = app.AsFileName();
            developer = developer.AsFileName();
            formLayout = formLayout.AsFileName();
            return Path.Join(RepositoryLocation, developer, org, app, UI_RESOURCE_FOLDER_NAME, FORMLAYOUTS_RESOURCE_FOLDER_NAME, formLayout + ".json");
        }

        /// <summary>
        /// Method that returns the path to the form layouts folder
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">The current developer</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetFormLayoutsPath(string org, string app, string developer)
        {
            org = org.AsFileName();
            app = app.AsFileName();
            developer = developer.AsFileName();

            if (developer != null)
            {
                developer += "/";
            }

            return $"{RepositoryLocation}/{developer}{org}/{app}/{UI_RESOURCE_FOLDER_NAME}/{FORMLAYOUTS_RESOURCE_FOLDER_NAME}/";
        }

        /// <summary>
        /// Method that returns the path to the third party component file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">The current developer</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetThirdPartyComponentsPath(string org, string app, string developer)
        {
            org = org.AsFileName();
            app = app.AsFileName();
            developer = developer.AsFileName();

            if (developer != null)
            {
                developer += "/";
            }

            return $"{RepositoryLocation}/{developer}{org}/{app}/{ThirdPartyComponentsJSONFileName}";
        }

        /// <summary>
        /// Get the path to rule handler file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetRuleHandlerPath(string org, string app, string developer)
        {
            return Path.Join(GetServicePath(org, app, developer), UI_RESOURCE_FOLDER_NAME, RuleHandlerFileName);
        }

        /// <summary>
        /// Get the path to the layout setttings file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path</returns>
        public string GetLayoutSettingPath(string org, string app, string developer)
        {
            return Path.Join(GetServicePath(org, app, developer), UI_RESOURCE_FOLDER_NAME, LAYOUT_SETTING_FILE);
        }
        
        /// <summary>
        /// Get name of the rule configuration file.
        /// </summary>
        /// <returns>The name of the file.</returns>
        public string GetRuleConfigFileName()
        {
            return RULE_CONFIG_FILE_NAME;
        }

        /// <summary>
        /// Gets the full path to the directory where all service packages will be placed
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetServicePackagesPath(string org, string app, string developer)
        {
            return GetServicePath(org, app, developer) + PACKAGES_LOCATION;
        }

        /// <summary>
        /// Gets the full path to a directory which can be used for temporary storage (for instance during service packaging)
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetTemporaryPath(string org, string app, string developer)
        {
            return GetServicePath(org, app, developer) + TEMP_LOCATION;
        }

        /// <summary>
        /// Gets the full path to ResourceDirectory
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetResourcePath(string org, string app, string developer)
        {
            return GetServicePath(org, app, developer) + RESOURCE_FOLDER_NAME;
        }

        /// <summary>
        /// Gets the full path to Rule configuration file
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetRuleConfigPath(string org, string app, string developer)
        {
            return GetServicePath(org, app, developer) + UI_RESOURCE_FOLDER_NAME + RULE_CONFIG_FILE_NAME;
        }

        /// <summary>
        /// Gets the full path to ResourceDirectory
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetLanguageResourcePath(string org, string app, string developer)
        {
            return GetServicePath(org, app, developer) + CONFIG_FOLDER_PATH + LANGUAGE_RESOURCE_FOLDER_NAME;
        }

        /// <summary>
        /// Gets the full path to applicationmetadata.jons
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetAppMetadataFilePath(string org, string app, string developer)
        {
            return GetServicePath(org, app, developer) + CONFIG_FOLDER_PATH + ApplicationMetadataFileName;
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
            return GetServicePath(org, app, developer) + RESOURCE_FOLDER_NAME + DYNAMICS_FOLDER_NAME;
        }

        /// <summary>
        /// Gets the full path to Calculation directory (within ImplementationDirectory)
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path to the calculation folder, ending with '/'</returns>
        public string GetCalculationPath(string org, string app, string developer)
        {
            return GetServicePath(org, app, developer) + CALCULATION_FOLDER_NAME;
        }

        /// <summary>
        /// Gets the full path to Validation directory (within ImplementationDirectory)
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path to the validation folder, ending with '/'</returns>
        public string GetValidationPath(string org, string app, string developer)
        {
            return GetServicePath(org, app, developer) + VALIDATION_FOLDER_NAME;
        }

        /// <summary>
        /// Gets the full path to InstantiationHandler.cs
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path to the validation folder, ending with '/'</returns>
        public string GetAppLogicPath(string org, string app, string developer)
        {
            return GetServicePath(org, app, developer) + APPLOGIC_FOLDER_NAME;
        }

        /// <summary>
        /// Gets the full path to TestDirectory
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetTestPath(string org, string app, string developer)
        {
            return GetServicePath(org, app, developer) + TEST_FOLDER_NAME;
        }

        /// <summary>
        /// Gets the full path to deployment directory
        /// </summary>
        /// <returns>The full path, ending with "/"</returns>
        public string GetDeploymentFolderName()
        {
            return DEPLOYMENT_FOLDER_NAME;
        }

        /// <summary>
        /// Gets the full path to deployment directory
        /// </summary>
        /// <returns>The full path, ending with "/"</returns>
        public string GetAppFolderName()
        {
            return APP_FOLDER_NAME;
        }

        /// <summary>
        /// Gets the full path to integration tests directory
        /// </summary>
        /// <returns>The full path, ending with "/"</returns>
        public string GetIntegrationTestsFolderName()
        {
            return INTERGRATIONTESTS_FOLDER_NAME;
        }

        /// <summary>
        /// Gets or sets the filename for the App.Sln file
        /// </summary>
        public string AppSlnFileName { get; set; } = "App.sln";

        /// <summary>
        /// Gets The full path to TestDataDirectory
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetTestDataPath(string org, string app, string developer)
        {
            return GetTestPath(org, app, developer) + TESTDATA_FOLDER_NAME;
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
            return GetServicePath(org, app, developer) + MODEL_METADATA_FOLDER_PATH;
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
        /// Get Implementation Folder name
        /// </summary>
        /// <returns>The implementation folder</returns>
        public string GetImplementationFolder()
        {
            return IMPLEMENTATION_FOLDER_NAME;
        }

        /// <summary>
        /// Returns the Metadata folder name
        /// </summary>
        /// <returns>The metadata folder</returns>
        public string GetMetadataFolder()
        {
            return MODEL_METADATA_FOLDER_PATH;
        }

        /// <summary>
        /// Returns the Metadata file name
        /// </summary>
        /// <returns>The metadata file name</returns>
        public string GetMetadataJsonFile()
        {
            return METADATA_FILENAME;
        }

        /// <summary>
        /// Get binary folder name
        /// </summary>
        /// <returns>The binary folder</returns>
        public string GetBinaryFolder()
        {
            return BINARY_FOLDER_NAME;
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
            return GetServicePath(org, app, developer) + "App/models/";
        }

        /// <summary>
        /// Gets the full path to the implementation directory
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetImplementationPath(string org, string app, string developer)
        {
            return GetServicePath(org, app, developer) + "Implementation/";
        }

        /// <summary>
        /// Gets the full path to the Authorization directory
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path to the Authorization directory, ending with "/"</returns>
        public string GetAuthorizationPath(string org, string app, string developer)
        {
            return GetServicePath(org, app, developer) + "Authorization/";
        }

        /// <summary>
        /// Gets the full path to the rules directory
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app.</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetRulesPath(string org, string app, string developer)
        {
            return GetServicePath(org, app, developer) + "Rules/";
        }

        /// <summary>
        /// Gets the full path to the data source directory
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">the developer for the current app</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetDataSourcePath(string org, string app, string developer)
        {
            return GetServicePath(org, app, developer) + "DataSource/";
        }

        /// <summary>
        /// Gets the path to text resources in organisation level
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="developer">The current user, app developer</param>
        /// <returns>The path to text resources in organisation level, ending with "/"</returns>
        public string GetOrgTextResourcePath(string org, string developer)
        {
            return GetOrgPath(org, developer) + TEXTRESOURCE_ORG_FOLDER_NAME;
        }

        /// <summary>
        /// Gets the path to common text resources in altinn
        /// </summary>
        /// <param name="developer">The current user, app developer.</param>
        /// <returns>The path to common text resources in altinn, ending with "/"</returns>
        public string GetCommonTextResourcePath(string developer)
        {
            developer = developer.AsFileName();
            return $"{RepositoryLocation}{developer}{TEXTRESOURCE_COMMON_FOLDER_NAME}";
        }

        /// <summary>
        /// Gets the path to widgets in app repo
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">The current user, app developer.</param>
        /// <returns>The path to widget settings in the app repo, ending with "/"</returns>
        public string GetWidgetSettingsPath(string org, string app, string developer)
        {
            return $"{GetServicePath(org, app, developer)}{WIDGETS_FOLDER_NAME}{WidgetSettingsFileName}";
        }
    }
}
