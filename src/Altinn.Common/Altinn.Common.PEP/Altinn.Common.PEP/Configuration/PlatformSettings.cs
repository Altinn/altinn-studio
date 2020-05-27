using System;

namespace Altinn.Common.PEP.Configuration
{
    /// <summary>
    /// Configuratin for platform settings
    /// </summary>
    public class PlatformSettings
    {
        private string _subscriptionKey;
        private string _apiAuthorizationEndpoint;

        /// <summary>
        /// Gets or sets the url for the API Authorization endpoint
        /// </summary>
        public string ApiAuthorizationEndpoint
        {
            get => Environment.GetEnvironmentVariable("PlatformSettings__ApiAuthorizationEndpoint") ?? _apiAuthorizationEndpoint;
            set => _apiAuthorizationEndpoint = value;
        }

        /// <summary>
        /// Gets or sets the subscription key value to use in requests against the platform.
        /// </summary>
        public string SubscriptionKey
        {
            get => Environment.GetEnvironmentVariable("PlatformSettings__SubscriptionKey") ?? _subscriptionKey;
            set => _subscriptionKey = value;
        }


    }
}
