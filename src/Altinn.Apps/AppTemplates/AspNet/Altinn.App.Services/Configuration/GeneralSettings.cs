using System;

namespace Altinn.App.Services.Configuration
{
    /// <summary>
    /// General configuration settings
    /// </summary>
    public class GeneralSettings
    {
        /// <summary>
        /// Gets or sets the location to search for templates
        /// </summary>
        public string TemplateLocation { get; set; }

        /// <summary>
        /// Gets or sets the location for the deployment
        /// </summary>
        public string DeploymentLocation { get; set; }

        /// <summary>
        /// Gets or sets the location to search for language files
        /// </summary>
        public string LanguageFilesLocation { get; set; }

        /// <summary>
        /// Gets or sets the runtime mode.
        /// </summary>
        public string RuntimeMode { get; set; }

        /// <summary>
        /// Gets or sets the soft validation prefix.
        /// </summary>
        public string SoftValidationPrefix { get; set; }

        /// <summary>
        /// Gets or sets the altinn studio endpoint.
        /// </summary>
        public string AltinnStudioEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the host name.
        /// </summary>
        public string HostName { get; set; }

        /// <summary>
        /// Gets the path to the service implementation template.
        /// </summary>
        public string ServiceImplementationTemplate
        {
            get
            {
                return TemplateLocation + "/ServiceImplementation.cs";
            }
        }

        /// <summary>
        /// Gets the path to the authorization policy template (XACML).
        /// </summary>
        public string AuthorizationPolicyTemplate
        {
            get
            {
                return TemplateLocation + "/policy.xml";
            }
        }

        /// <summary>
        /// Gets the path to the calculation handler template.
        /// </summary>
        public string CalculateHandlerTemplate
        {
            get
            {
                return TemplateLocation + "/CalculationHandler.cs";
            }
        }

        /// <summary>
        /// Gets the path to the rule handler template.
        /// </summary>
        public string RuleHandlerTemplate
        {
            get
            {
                return TemplateLocation + "/RuleHandler.js";
            }
        }

        /// <summary>
        /// Gets the path to the validation handler template.
        /// </summary>
        public string ValidationHandlerTemplate
        {
            get
            {
                return TemplateLocation + "/ValidationHandler.cs";
            }
        }

        /// <summary>
        /// Gets the path to the instantiation handler template.
        /// </summary>
        public string InstantiationHandlerTemplate
        {
            get
            {
                return TemplateLocation + "/InstantiationHandler.cs";
            }
        }

        /// <summary>
        /// Gets the path to the default Dockerfile file.
        /// </summary>
        public string DefaultRepoDockerfile
        {
            get
            {
                return TemplateLocation + "/Dockerfile";
            }
        }

        /// <summary>
        /// Gets the path to the default project file.
        /// </summary>
        public string DefaultProjectFile
        {
            get
            {
                return TemplateLocation + "/AltinnService/AltinnService.csproj";
            }
        }

        /// <summary>
        /// Gets the path to the default gitIgnore file.
        /// </summary>
        public string DefaultGitIgnoreFile
        {
            get
            {
                return TemplateLocation + "/.gitignore";
            }
        }

        /// <summary>
        /// Gets or sets the AltinnParty cookie name.
        /// </summary>
        public string AltinnPartyCookieName { get; set; }

        /// <summary>
        /// Gets the altinnParty cookie from kubernetes environment variables and appsettings if environment variable is not set.
        /// </summary>
        public string GetAltinnPartyCookieName
        {
            get
            {
                return Environment.GetEnvironmentVariable("GeneralSettings__AltinnPartyCookieName") ?? AltinnPartyCookieName;
            }
        }

        /// <summary>
        /// Gets or sets the base adress for SBL.
        /// </summary>
        public string SBLBaseAdress { get; set; }

        /// <summary>
        /// Get the base adress for SBL from kubernetes environment variables and appsettings is environment variable is not set.
        /// </summary>
        public string GetSBLBaseAdress
        {
            get
            {
                return Environment.GetEnvironmentVariable("GeneralSettings_SBLBaseAdress") ?? SBLBaseAdress;
            }
        }

    }
}
