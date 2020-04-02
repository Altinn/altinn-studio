namespace Altinn.Platform.Receipt.Configuration
{
    /// <summary>
    /// Configuration for platform settings
    /// </summary>
    public class PlatformSettings
    {
        /// <summary>
        /// Gets or sets the url for the API Authentication endpoint
        /// </summary>
        public string ApiAuthenticationEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the url for the API profile endpoint
        /// </summary>
        public string ApiProfileEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the url for the API register endpoint
        /// </summary>
        public string ApiRegisterEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the url for the API storage endpoint
        /// </summary>
        public string ApiStorageEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the subscription key value to use in requests against the platform.
        /// A new subscription key is generated automatically every time an app is deployed to an environment. The new key is then automatically
        /// added to the environment for the app code during deploy. This will override the value stored in app settings.
        /// </summary>
        public string SubscriptionKey { get; set; }

        /// <summary>
        /// The name of the subscription header for Api management. 
        /// </summary>
        public string SubscriptionKeyHeaderName { get; set; } = "Ocp-Apim-Subscription-Key";
    }
}
