using System;

namespace AltinnCore.Common.Configuration
{
    /// <summary>
    /// Class that represents the ServiceRepositorySettings
    /// </summary>
    public class ServiceRepositorySettings
    {
        /// <summary>
        /// Constant for the location of service code lists
        /// </summary>
        public const string CODELISTS_FOLDER_NAME = "Codelists/";

        /// <summary>
        /// Constant for the location of resource files
        /// </summary>
        public const string RESOURCE_FOLDER_NAME = "Resources/";

        /// <summary>
        /// Constant for the location of the testdata for parties folder
        /// </summary>
        public const string TESTDATA_FOR_PARTY_FOLDER_NAME = "Testdataforparty/";
        
        /// <summary>
        /// Constant for the location of service tests
        /// </summary>
        public const string TEST_FOLDER_NAME = "Test/";

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
        /// Constant for the location of service metadata
        /// </summary>
        public const string METADATA_FOLDER_NAME = "Metadata/";

        private const string PACKAGES_LOCATION = "Packages/";
        private const string TEMP_LOCATION = "Temp/";
        private const string TESTDATA_FOLDER_NAME = "Data/";

        private const string METADATA_FILENAME = "ServiceMetadata.json";
        private const string GENERATED_METHODS_FILENAME = "GeneratedMethods.cs";

        /// <summary>
        /// Gets or sets the Repository Location
        /// </summary>
        public string RepositoryLocation { get; set; }

        /// <summary>
        /// Gets or sets a valude indicating
        /// </summary>
        public bool EnableGitAutentication { get; set; }

        /// <summary>
        /// Gets or sets a value indicating if user should be forced to log in in Gitea
        /// </summary>
        public bool ForceGiteaAuthentication { get; set; }

        /// <summary>
        /// Gets or sets a value indicating if runtime should fetch service information from database or from disk
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
        /// Gets or sets the Runtime API endpoint
        /// </summary>
        public string RuntimeAPIEndPoint { get; set; }

        /// <summary>
        /// Gets or sets the Internal repository BaseURL
        /// </summary>
        public string InternalRepositoryBaseURL { get; set; }

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
        /// Gets or sets The name of the FormLayout json file Name
        /// </summary>
        public string FormLayoutJSONFileName { get; set; } = RESOURCE_FOLDER_NAME + "FormLayout.json";

        /// <summary>
        /// Gets or sets The name of the ThirdPartyComponents json file Name
        /// </summary>
        public string ThirdPartyComponentsJSONFileName { get; set; } = RESOURCE_FOLDER_NAME + "ThirdPartyComponents.json";

        /// <summary>
        /// Gets or sets The ServiceMetadata file name
        /// </summary>
        public string ServiceMetadataFileName { get; set; } = METADATA_FILENAME;

        /// <summary>
        /// Gets or sets the Workflow file name
        /// </summary>
        public string WorkFlowFileName { get; set; } = "workflow.json";

        /// <summary>
        /// Gets or sets React file name
        /// </summary>
        public string ReactAppFileName { get; set; } = "react-app.js";

        /// <summary>
        /// Gets or sets React CSS file name
        /// </summary>
        public string ReactAppCssFileName { get; set; } = "react-app.css";

        /// <summary>
        /// Gets or sets styles config file name for service
        /// </summary>
        public string ServiceStylesConfigFileName { get; set; } = "Styles.json";

        /// <summary>
        /// Gets or sets default Bootstrap url
        /// </summary>
        public string DefaultBootstrapUrl { get; set; } = "https://stackpath.bootstrapcdn.com/bootstrap/4.1.0/css/bootstrap.min.css";

        /// <summary>
        /// Gets or sets the filename for serviceImplementation
        /// </summary>
        public string ServiceImplementationFileName { get; set; } = "ServiceImplementation.cs";

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
        /// Gets or sets the filename for the generated methods class
        /// </summary>
        public string GeneratedMethodsFileName { get; set; } = GENERATED_METHODS_FILENAME;

        /// <summary>
        /// Gets the full path to the org directory
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="developer">The current user, service developer</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetOrgPath(string org, string developer = null)
        {
            if (developer != null)
            {
                developer += "/";
            }

            return $"{RepositoryLocation}{developer}{org}/";
        }

        /// <summary>
        /// Gets the full path to the service directory
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="developer">the developer for the current service</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetServicePath(string org, string service, string developer = null)
        {
            if (developer != null)
            {
                developer += "/";
            }

            string repositoryLocation = Environment.GetEnvironmentVariable("ServiceRepositorySettings__RepositoryLocation") ?? RepositoryLocation;
            return $"{repositoryLocation}{developer}{org}/{service}/";
        }

        /// <summary>
        /// Gets the full path to the testdata for party directory
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="developer">The current user, service developer</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetTestdataForPartyPath(string org, string service, string developer = null)
        {
            if (developer != null)
            {
                developer += "/";
            }

            return $"{RepositoryLocation}{developer}{org}/{service}/{TESTDATA_FOR_PARTY_FOLDER_NAME}";
        }

        /// <summary>
        /// Method that returns the path to the form layout file
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="developer">The current developer</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetFormLayoutPath(string org, string service, string developer)
        {
            if (developer != null)
            {
                developer += "/";
            }

            return $"{RepositoryLocation}/{developer}{org}/{service}/{FormLayoutJSONFileName}";
        }

        /// <summary>
        /// Method that returns the path to the third party component file
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="developer">The current developer</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetThirdPartyComponentsPath(string org, string service, string developer)
        {
            if (developer != null)
            {
                developer += "/";
            }

            return $"{RepositoryLocation}/{developer}{org}/{service}/{ThirdPartyComponentsJSONFileName}";
        }

        /// <summary>
        /// Get the path to rule handler file
        /// </summary
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="developer">the developer for the current service</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetRuleHandlerPath(string org, string service, string developer)
        {
            if (developer != null)
            {
                developer += "/";
            }

            return $"{RepositoryLocation}/{developer}{org}/{service}/{RESOURCE_FOLDER_NAME}";
        }

        /// <summary>
        /// Gets the full path to the directory where all service packages will be placed
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="developer">the developer for the current service</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetServicePackagesPath(string org, string service, string developer)
        {
            return GetServicePath(org, service, developer) + PACKAGES_LOCATION;
        }

        /// <summary>
        /// Gets the full path to a directory which can be used for temporary storage (for instance during service packaging)
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="developer">the developer for the current service</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetTemporaryPath(string org, string service, string developer)
        {
            return GetServicePath(org, service, developer) + TEMP_LOCATION;
        }

        /// <summary>
        /// Gets the full path to ResourceDirectory
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="developer">the developer for the current service</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetResourcePath(string org, string service, string developer)
        {
            return GetServicePath(org, service, developer) + RESOURCE_FOLDER_NAME;
        }

        /// <summary>
        /// Gets the full path to TestDirectory
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="developer">the developer for the current service</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetTestPath(string org, string service, string developer)
        {
            return GetServicePath(org, service, developer) + TEST_FOLDER_NAME;
        }

        /// <summary>
        /// Gets The full path to TestDataDirectory
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="developer">the developer for the current service</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetTestDataPath(string org, string service, string developer)
        {
            return GetTestPath(org, service, developer) + TESTDATA_FOLDER_NAME;
        }

        /// <summary>
        /// Gets The full path to Metadata directory
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="developer">the developer for the current service</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetMetadataPath(string org, string service, string developer)
        {
            return GetServicePath(org, service, developer) + METADATA_FOLDER_NAME;
        }

        /// <summary>
        /// Gets the full path to code list directory
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="developer">the developer for the current service</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetCodelistPath(string org, string service, string developer)
        {
            return GetServicePath(org, service, developer) + CODELISTS_FOLDER_NAME;
        }

        /// <summary>
        /// Gets the CodeList folder
        /// </summary>
        /// <returns>The codelist folder</returns>
        public string GetCodeListFolder()
        {
            return CODELISTS_FOLDER_NAME;
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
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="developer">the developer for the current service</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetModelPath(string org, string service, string developer)
        {
            return GetServicePath(org, service, developer) + "Model/";
        }

        /// <summary>
        /// Gets the full path to the implementation directory
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="developer">the developer for the current service</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetImplementationPath(string org, string service, string developer)
        {
            return GetServicePath(org, service, developer) + "Implementation/";
        }

        /// <summary>
        /// Gets the full path to the rules directory
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="developer">the developer for the current service</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetRulesPath(string org, string service, string developer)
        {
            return GetServicePath(org, service, developer) + "Rules/";
        }

        /// <summary>
        /// Gets the full path to the data source directory
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="service">The service code for the current service</param>
        /// <param name="developer">the developer for the current service</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetDataSourcePath(string org, string service, string developer)
        {
            return GetServicePath(org, service, developer) + "DataSource/";
        }

        /// <summary>
        /// Gets the path to text resources in organisation level
        /// </summary>
        /// <param name="org">The Organization code for the service owner</param>
        /// <param name="developer">The current user, service developer</param>
        /// <returns>The path to text resources in organisation level, ending with "/"</returns>
        public string GetOrgTextResourcePath(string org, string developer)
        {
            return GetOrgPath(org, developer) + TEXTRESOURCE_ORG_FOLDER_NAME;
        }

        /// <summary>
        /// Gets the path to common text resources in altinn
        /// </summary>
        /// <param name="developer">The current user, service developer</param>
        /// <returns>The path to common text resources in altinn, ending with "/"</returns>
        public string GetCommonTextResourcePath(string developer)
        {
            return $"{RepositoryLocation}{developer}{TEXTRESOURCE_COMMON_FOLDER_NAME}";
        }

        /// <summary>
        /// Gets the path to the runtime api for sharing files between runtime and designer
        /// </summary>
        /// <param name="nameOfMethod">The name of the method to call in the runtime api controller</param>
        /// <param name="org">The organization for the service</param>
        /// <param name="service">The name of the service</param>
        /// <param name="developer">The name of the developer of the service</param>
        /// <param name="partyId">The party id of the test user</param>
        /// <returns>The url path to the runtime api</returns>
        public string GetRuntimeAPIPath(string nameOfMethod, string org, string service, string developer, int partyId = 0)
        {
            string runtimeAPIEndPoint = Environment.GetEnvironmentVariable("ServiceRepositorySettings__RuntimeAPIEndPoint") ?? RuntimeAPIEndPoint;

            if (partyId == 0)
            {
                return $"{runtimeAPIEndPoint}designer/{org}/{service}/RuntimeAPI/{nameOfMethod}?developer={developer}";
            }
            else
            {
                return $"{runtimeAPIEndPoint}designer/{org}/{service}/RuntimeAPI/{nameOfMethod}?developer={developer}&partyId={partyId}";
            }
        }
    }
}
