namespace AltinnCore.Common.Configuration
{
    /// <summary>
    /// Configuration for platform settings
    /// </summary>
    public class PlatformSettings
    {
        /// <summary>
        /// Uniform resource identifier for Platform.Storage Applications
        /// The config value was needed for test purposes
        /// </summary>
        public string ApiStorageApplicationUri { get; set; }

        /// <summary>
        /// Uniform resource locator for Platform.Authorization policies
        /// </summary>
        public string ApiAuthorizationPolicyUri { get; set; }

        /// <summary>
        /// Uniform resource identifier for Platform.Authentication Applications
        /// </summary>
        public string ApiAuthenticationConvertUri { get; set; }

        /// <summary>
        /// API Management subscription key for platform in TT02.
        /// </summary>
        public string SubscriptionKeyTT02 { get; set; }

        /// <summary>
        /// API management subscription key header name.
        /// </summary>
        public string SubscriptionKeyHeaderName { get; set; }
    }
}
