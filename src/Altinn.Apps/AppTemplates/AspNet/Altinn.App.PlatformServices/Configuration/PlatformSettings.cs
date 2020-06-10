using System;

namespace Altinn.App.Services.Configuration
{
    /// <summary>
    /// Represents a set of configuration options when communicating with the platform API.
    /// Instances of this class is initialised with values from app settings. Some values can be overridden by environment variables.
    /// </summary>
    public class PlatformSettings
    {
        private string _apiPdfEndpoint;
        private string _apiAuthorizationEndpoint;
        private string _apiAuthenticationEndpoint;
        private string _apiProfileEndpoint;
        private string _apiRegisterEndpoint;
        private string _apiStorageEndpoint;
        private string _subscriptionKey;

        /// <summary>
        /// Gets or sets the url for the API storage endpoint
        /// </summary>
        public string ApiStorageEndpoint
        {
            get => Environment.GetEnvironmentVariable("PlatformSettings__ApiStorageEndpoint") ?? _apiStorageEndpoint;
            set => _apiStorageEndpoint = value;
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
        /// Gets or sets the url for the API profile endpoint
        /// </summary>
        public string ApiProfileEndpoint
        {
            get => Environment.GetEnvironmentVariable("PlatformSettings__ApiProfileEndpoint") ?? _apiProfileEndpoint;
            set => _apiProfileEndpoint = value;
        }

        /// <summary>
        /// Gets or sets the url for the API Authentication endpoint
        /// </summary>
        public string ApiAuthenticationEndpoint
        {
            get => Environment.GetEnvironmentVariable("PlatformSettings__ApiAuthenticationEndpoint") ?? _apiAuthenticationEndpoint;
            set => _apiAuthenticationEndpoint = value;
        }

        /// <summary>
        /// Gets or sets the url for the API Authorization endpoint
        /// </summary>
        public string ApiAuthorizationEndpoint
        {
            get => Environment.GetEnvironmentVariable("PlatformSettings__ApiAuthorizationEndpoint") ?? _apiAuthorizationEndpoint;
            set => _apiAuthorizationEndpoint = value;
        }

        /// <summary>
        /// Gets or sets the the url for the API PDF
        /// </summary>
        public string ApiPdfEndpoint
        {
            get => Environment.GetEnvironmentVariable("PlatformSettings__ApiPdfEndpoint") ?? _apiPdfEndpoint;
            set => _apiPdfEndpoint = value;
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
