using System.Runtime.Serialization;

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

        /// <summary>
        /// Gets or sets the url for the Profile API endpoint
        /// </summary>
        public string ApiProfileEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the apps domain used to match events source
        /// </summary>
        public string AppsDomain { get; set; }

        /// <summary>
        /// The lifetime to cache subscriptions
        /// </summary>
        public int SubscriptionCachingLifetimeInSeconds { get; set; }
    }
}
