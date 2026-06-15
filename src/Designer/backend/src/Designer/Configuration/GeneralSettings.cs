#nullable disable
using Altinn.Studio.Designer.Configuration.Marker;

namespace Altinn.Studio.Designer.Configuration;

/// <summary>
/// General configuration settings
/// </summary>
public class GeneralSettings : ISettingsMarker
{
    /// <summary>
    /// Gets or sets the root folder holding one sub folder per app template, e.g. "Templates/AspNet"
    /// containing "v8" and "v9". Individual template paths are derived from this root, not configured.
    /// </summary>
    public string TemplateLocation { get; set; }

    /// <summary>
    /// Gets or sets the id of the app template new applications are created from when the caller does not
    /// ask for a specific one. Must match one of the sub folders under <see cref="TemplateLocation"/>.
    /// </summary>
    public string DefaultAppTemplate { get; set; } = "v8";

    /// <summary>
    /// Gets or sets the host name.
    /// </summary>
    public string HostName { get; set; }

    /// <summary>
    /// Gets the path to the authorization policy template (XACML).
    /// </summary>
    public string AuthorizationPolicyTemplate
    {
        get { return "App/config/authorization/policy.xml"; }
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

    public string BaseUrl => HostName.Contains("localhost") ? $"http://{HostName}" : $"https://{HostName}";

    /// <summary>
    /// Gets the origin environment name based on the host name.
    /// </summary>
    public string OriginEnvironment
    {
        get
        {
            if (HostName.StartsWith("dev."))
            {
                return "dev";
            }

            if (HostName.StartsWith("staging."))
            {
                return "staging";
            }

            return "prod";
        }
    }
}
