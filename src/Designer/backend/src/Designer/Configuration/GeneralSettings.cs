using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration
{
    /// <summary>
    /// General configuration settings
    /// </summary>
    public class GeneralSettings : ISettingsMarker
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
        /// Gets or sets the location for the app
        /// </summary>
        public string AppLocation { get; set; }

        /// <summary>
        /// Gets or sets the host name.
        /// </summary>
        public string HostName { get; set; }

        /// <summary>
        /// Gets the path to the authorization policy template (XACML).
        /// </summary>
        public string AuthorizationPolicyTemplate
        {
            get
            {
                return "App/config/authorization/policy.xml";
            }
        }

        /// <summary>
        /// Gets the path to the app templates
        /// </summary>
        public string TemplatePath
        {
            get
            {
                return TemplateLocation;
            }
        }

        /// <summary>
        /// Gets the duration for a session in Altinn Studio.
        /// </summary>
        public int SessionDurationInMinutes { get; set; } = 200;

        /// <summary>
        /// Gets the name of the session timeout cookie
        /// </summary>
        public string SessionTimeoutCookieName { get; set; } = "DesignerSessionTimeout";

        /// <summary>
        /// Gets or sets the url to the environment file.
        /// </summary>
        public string EnvironmentsUrl { get; set; }

        public string OrganizationsUrl { get; set; }
    }
}
