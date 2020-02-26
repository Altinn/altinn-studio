using System;

namespace Altinn.Platform.Receipt.Configuration
{
    /// <summary>
    /// Configuration for platform settings
    /// </summary>
    public class PlatformSettings
    {
        /// <summary>
        /// Gets or sets the url for the API Profile endpoint
        /// The config value was needed for test purposes
        /// </summary>
        public string ApiProfileEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the url for the API Authentication endpoint
        /// </summary>
        public string ApiAuthenticationEndpoint { get; set; }

        /// <summary>
        /// Gets or sets url for the API Authorization endpoint
        /// </summary>
        public string ApiAuthorizationEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the subscription key for API management 
        /// </summary>
        public string SubscriptionKey { get; set; }

        /// <summary>
        /// Get url for the API Authorization endpoint
        /// </summary>
        /// <returns>Returns url</returns>
        public string GetApiAuthorizationEndpoint()
        {
            return Environment.GetEnvironmentVariable("Platformsettings__ApiAuthorizationEndpoint") ?? ApiAuthorizationEndpoint;
        }

        /// <summary>
        /// Gets subscription key for API management to access platform components
        /// </summary>
        /// <returns></returns>
        public string GetSubscriptionKey()
        {
            return Environment.GetEnvironmentVariable("Platformsettings__SubscriptionKey") ?? SubscriptionKey;
        }
    }
}
