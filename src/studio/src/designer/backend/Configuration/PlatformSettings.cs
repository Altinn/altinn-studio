namespace Altinn.Studio.Designer.Configuration
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
        /// API Management subscription key for platform in AT05.
        /// </summary>
        public string SubscriptionKeyAT05 { get; set; }

        /// <summary>
        /// API Management subscription key for platform in AT21.
        /// </summary>
        public string SubscriptionKeyAT21 { get; set; }

        /// <summary>
        /// API Management subscription key for platform in AT22.
        /// </summary>
        public string SubscriptionKeyAT22 { get; set; }

        /// <summary>
        /// API Management subscription key for platform in AT23.
        /// </summary>
        public string SubscriptionKeyAT23 { get; set; }

        /// <summary>
        /// API Management subscription key for platform in AT24.
        /// </summary>
        public string SubscriptionKeyAT24 { get; set; }

        /// <summary>
        /// API Management subscription key for platform in TT02.
        /// </summary>
        public string SubscriptionKeyTT02 { get; set; }

        /// <summary>
        /// API Management subscription key for platform in YT01.
        /// Value is stored as an environment variable in the AKS cluster.
        /// </summary>
        public string SubscriptionKeyYT01 { get; set; }

        /// <summary>
        /// API Management subscription key for platform in production.
        /// Value is stored as an environment variable in the AKS cluster.
        /// </summary>
        public string SubscriptionKeyProd { get; set; }

        /// <summary>
        /// API management subscription key header name.
        /// Value is stored as an environment variable in the AKS cluster.
        /// </summary>
        public string SubscriptionKeyHeaderName { get; set; }
    }
}
