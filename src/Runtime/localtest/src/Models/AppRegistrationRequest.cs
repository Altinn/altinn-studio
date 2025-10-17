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
    }
}
