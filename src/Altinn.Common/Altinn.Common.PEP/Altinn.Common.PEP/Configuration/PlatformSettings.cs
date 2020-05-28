namespace Altinn.Common.PEP.Configuration
{
    /// <summary>
    /// Configuratin for platform settings
    /// </summary>
    public class PlatformSettings
    {
        /// <summary>
        /// Gets or sets the url for the API Authorization endpoint
        /// </summary>
        public string ApiAuthorizationEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the subscription key value to use in requests against the platform.
        /// </summary>
        public string SubscriptionKey { get; set; }
    }
}
