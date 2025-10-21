#nullable enable

namespace LocalTest.Models
{
    /// <summary>
    /// Request model for app registration
    /// </summary>
    public class AppRegistrationRequest
    {
        /// <summary>
        /// Application ID in org/app format
        /// </summary>
        public string AppId { get; set; } = string.Empty;

        /// <summary>
        /// Port number the app is running on
        /// </summary>
        public int Port { get; set; }

        /// <summary>
        /// Hostname or IP address where the app is accessible from localtest.
        /// If not provided, defaults to "host.docker.internal" for apps running on the host machine.
        /// </summary>
        public string? Hostname { get; set; }
    }
}
