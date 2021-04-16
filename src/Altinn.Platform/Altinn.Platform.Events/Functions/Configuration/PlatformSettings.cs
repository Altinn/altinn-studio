namespace Altinn.Platform.Events.Functions.Configuration
{
    /// <summary>
    /// Represents a set of configuration options when communicating with the platform API.
    /// </summary>
    public class PlatformSettings
    {
        /// <summary>
        /// Gets or sets the url for the PushEvents API endpoint.
        /// </summary>
        public string ApiPushEventsEndpoint { get; set; }
    }
}
