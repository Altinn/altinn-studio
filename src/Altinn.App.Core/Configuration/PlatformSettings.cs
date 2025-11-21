namespace Altinn.App.Core.Configuration;

/// <summary>
/// Represents a set of configuration options when communicating with the platform API.
/// Instances of this class is initialised with values from app settings. Some values can be overridden by environment variables.
/// </summary>
public class PlatformSettings
{
    /// <summary>
    /// Gets or sets the url for the Storage API endpoint.
    /// </summary>
    public string ApiStorageEndpoint { get; set; } = "http://localhost:5101/storage/api/v1/";

    /// <summary>
    /// Gets or sets the url for the Register API endpoint.
    /// </summary>
    public string ApiRegisterEndpoint { get; set; } = "http://localhost:5101/register/api/v1/";

    /// <summary>
    /// Gets or sets the url for the Profile API endpoint.
    /// </summary>
    public string ApiProfileEndpoint { get; set; } = "http://localhost:5101/profile/api/v1/";

    /// <summary>
    /// Gets or sets the url for the Authentication API endpoint.
    /// </summary>
    public string ApiAuthenticationEndpoint { get; set; } = "http://localhost:5101/authentication/api/v1/";

    /// <summary>
    /// Gets or sets the url for the Authorization API endpoint.
    /// </summary>
    public string ApiAuthorizationEndpoint { get; set; } = "http://localhost:5101/authorization/api/v1/";

    /// <summary>
    /// Gets or sets the url for the Events API endpoint.
    /// </summary>
    public string ApiEventsEndpoint { get; set; } = "http://localhost:5101/events/api/v1/";

    /// <summary>
    /// Gets or sets the url for the new browser based PDF API endpoint.
    /// </summary>
    public string ApiPdf2Endpoint { get; set; } = "http://localhost:5300/pdf";

    /// <summary>
    /// Gets or sets the url for the Notification API endpoint.
    /// </summary>
    public string ApiNotificationEndpoint { get; set; } = "http://localhost:5101/notifications/api/v1/";

    /// <summary>
    /// Gets or sets the url for the Correspondence API endpoint.
    /// </summary>
    public string ApiCorrespondenceEndpoint { get; set; } = "http://localhost:5101/correspondence/api/v1/"; // TODO: which port for localtest?

    /// <summary>
    /// Gets or sets the url for the Access Management (Delegation) API endpoint.
    /// </summary>
    public string ApiAccessManagementEndpoint { get; set; } = "http://localhost:5101/accessmanagement/api/v1/";

    /// <summary>
    /// Gets or sets the subscription key value to use in requests against the platform.
    /// A new subscription key is generated automatically every time an app is deployed to an environment. The new key is then automatically
    /// added to the environment for the app code during deploy. This will override the value stored in app settings.
    /// </summary>
#nullable disable
    public string SubscriptionKey { get; set; }

#nullable restore

    /// <summary>
    /// Url to Altinn3 library api endpoint that serves shared and updated resources like codelists...
    /// </summary>
    public string Altinn3LibraryApiEndpoint { get; set; } =
        "https://studiostagingsc.blob.core.windows.net/studiostagingsharedcontentcontainer/";
}
