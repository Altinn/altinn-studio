namespace Altinn.Platform.Authorization.Functions.Configuration
{
    /// <summary>
    /// Represents a set of configuration options when communicating with the platform API.
    /// </summary>
    public class PlatformSettings
    {
        /// <summary>
        /// Base URL to Altinn Bridge
        /// </summary>
        public string BridgeApiEndpoint { get; set; }

        /// <summary>
        /// Isser to use in the generated token that will be used in calling Bridge API
        /// </summary>
        public string AccessTokenIssuer { get; set; }

    }
}
