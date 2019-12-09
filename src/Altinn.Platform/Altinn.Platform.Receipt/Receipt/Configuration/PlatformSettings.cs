namespace AltinnCore.Common.Configuration
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
        public string ApiProfileEndpoint{ get; set; }

        /// <summary>
        /// Gets or sets the url for the API Authentication endpoint
        /// </summary>
        public string ApiAuthenticationEndpoint { get; set; }
    }
}
