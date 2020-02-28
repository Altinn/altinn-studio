using System;

namespace Altinn.Platform.Receipt.Configuration
{
    /// <summary>
    /// Configuration for platform settings
    /// </summary>
    public class PlatformSettings
    {
        private string _subscriptionKey;
        private string _apiStorageEndpoint;
        private string _apiRegisterEndpoint;
        private string _apiProfileEndpoint;

        /// <summary>
        /// Gets or sets the url for the API Authentication endpoint
        /// </summary>
        public string ApiAuthenticationEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the url for the API profile endpoint
        /// </summary>
        public string ApiProfileEndpoint
        {
            get => Environment.GetEnvironmentVariable("PlatformSettings__ApiProfileEndpoint") ?? _apiProfileEndpoint;
            set => _apiProfileEndpoint = value;
        }

        /// <summary>
        /// Gets or sets the url for the API register endpoint
        /// </summary>
        public string ApiRegisterEndpoint
        {
            get => Environment.GetEnvironmentVariable("PlatformSettings__ApiRegisterEndpoint") ?? _apiRegisterEndpoint;
            set => _apiRegisterEndpoint = value;
        }

        /// <summary>
        /// Gets or sets the url for the API storage endpoint
        /// </summary>
        public string ApiStorageEndpoint
        {
            get => Environment.GetEnvironmentVariable("PlatformSettings__ApiStorageEndpoint") ?? _apiStorageEndpoint;
            set => _apiStorageEndpoint = value;
        }

        /// <summary>
        /// Gets or sets the subscription key value to use in requests against the platform.
        /// A new subscription key is generated automatically every time an app is deployed to an environment. The new key is then automatically
        /// added to the environment for the app code during deploy. This will override the value stored in app settings.
        /// </summary>
        public string SubscriptionKey
        {
            get => Environment.GetEnvironmentVariable("PlatformSettings__SubscriptionKey") ?? _subscriptionKey;
            set => _subscriptionKey = value;
        }
    }
}
