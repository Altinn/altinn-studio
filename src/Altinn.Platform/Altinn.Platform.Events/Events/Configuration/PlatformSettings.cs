namespace Altinn.Platform.Events.Configuration
{
    /// <summary>
    /// Represents a set of configuration options when communicating with the platform API.
    /// Instances of this class is initialised with values from app settings. Some values can be overridden by environment variables.
    /// </summary>
    public class PlatformSettings
    {
        /// <summary>
        /// Gets or sets the url for the Register API endpoint.
        /// </summary>
        public string ApiRegisterEndpoint { get; set; }
    }
}
