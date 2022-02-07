namespace Altinn.App.Services.Configuration
{
    /// <summary>
    /// Represents a set of configuration options when communicating with the platform API.
    /// Instances of this class is initialised with values from app settings. Some values can be overridden by environment variables.
    /// </summary>
    public class PlatformSettings
    {
        /// <summary>
        /// Gets or sets the url for the Storage API endpoint.
        /// </summary>
        public string ApiStorageEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the url for the Register API endpoint.
        /// </summary>
        public string ApiRegisterEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the url for the Profile API endpoint.
        /// </summary>
        public string ApiProfileEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the url for the Authentication API endpoint.
        /// </summary>
        public string ApiAuthenticationEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the url for the Authorization API endpoint.
        /// </summary>
        public string ApiAuthorizationEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the url for the Events API endpoint.
        /// </summary>
        public string ApiEventsEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the the url for the PDF API endpoint.
        /// </summary>
        public string ApiPdfEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the subscription key value to use in requests against the platform.
        /// A new subscription key is generated automatically every time an app is deployed to an environment. The new key is then automatically
        /// added to the environment for the app code during deploy. This will override the value stored in app settings.
        /// </summary>
        public string SubscriptionKey { get; set; }
    }
}
