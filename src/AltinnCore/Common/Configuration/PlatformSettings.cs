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
    }
}
