#nullable disable
using System.IO;
using Altinn.Studio.Designer.Configuration.Marker;
using Altinn.Studio.Designer.Helpers.Extensions;

namespace Altinn.Studio.Designer.Configuration
{
    /// <summary>
    /// Class that represents the ServiceRepositorySettings
    /// </summary>
    public class ServiceRepositorySettings : ISettingsMarker
    {
        /// <summary>
        /// Constant for the location of language resource files
        /// </summary>
        public const string LANGUAGE_RESOURCE_FOLDER_NAME = "texts/";

        /// <summary>
        /// Constant for the location of config folder
        /// </summary>
        public const string CONFIG_FOLDER_PATH = "App/config/";

        /// <summary>
        /// Constant for the location of service deployment charts
        /// </summary>
        public const string DEPLOYMENT_FOLDER_NAME = "deployment/";

        /// <summary>
        /// Constant for the location of service deployment charts
        /// </summary>
        public const string APP_FOLDER_NAME = "App/";

        /// <summary>
        /// Constant for the location of widgets
        /// </summary>
        public const string WIDGETS_FOLDER_NAME = "widgets/";

        /// <summary>
        /// constant for the location of authorization policies
        /// </summary>
        public const string AUTHORIZATION_FOLDER_NAME = "App/config/authorization/";

        /// <summary>
        /// Gets or sets the Repository Location
        /// </summary>
        public string RepositoryLocation { get; set; }

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
        /// Gets or sets the BaseResourceFolderContainer that identifies where in the docker container the runtime can find files needed
        /// </summary>
        public string BaseResourceFolderContainer { get; set; }

        /// <summary>
        /// Gets or sets the filename for the Dockerfile file
        /// </summary>
        public string DockerfileFileName { get; set; } = "Dockerfile";

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
        /// Gets the full path to the org directory
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="developer">The current user, app developer</param>
        /// <returns>The full path, ending with "/"</returns>
        public string GetOrgPath(string org, string developer = null)
        {
            developer = developer.AsFileName();
            org = org.AsFileName();

            return Path.Combine(RepositoryLocation, developer ?? string.Empty, org ?? string.Empty);
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

            return Path.Combine(RepositoryLocation, developer ?? string.Empty, org ?? string.Empty, app ?? string.Empty);
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
            return Path.Combine(GetServicePath(org, app, developer), CONFIG_FOLDER_PATH, LANGUAGE_RESOURCE_FOLDER_NAME);
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
        /// Gets or sets the filename for the App.Sln file
        /// </summary>
        public string AppSlnFileName { get; set; } = "App.sln";

        /// <summary>
        /// Gets the path to widgets in app repo
        /// </summary>
        /// <param name="org">Unique identifier of the organisation responsible for the app.</param>
        /// <param name="app">Application identifier which is unique within an organisation.</param>
        /// <param name="developer">The current user, app developer.</param>
        /// <returns>The path to widget settings in the app repo, ending with "/"</returns>
        public string GetWidgetSettingsPath(string org, string app, string developer)
        {
            return Path.Combine(GetServicePath(org, app, developer), WIDGETS_FOLDER_NAME, WidgetSettingsFileName);
        }
    }
}
