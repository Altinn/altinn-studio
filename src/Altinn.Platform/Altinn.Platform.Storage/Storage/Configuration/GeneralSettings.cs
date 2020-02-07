namespace Altinn.Platform.Storage.Configuration
{
    /// <summary>
    /// Configuration object used to hold general settings for the storage application.
    /// </summary>
    public class GeneralSettings
    {
        /// <summary>
        /// Open Id Connect Well known endpoint. Related to JSON WEB token validation.
        /// </summary>
        public string OpenIdWellKnownEndpoint { get; set; }

        /// <summary>
        /// Hostname
        /// </summary>
        public string Hostname { get; set; }

        /// <summary>
        /// Name of the cookie for runtime
        /// </summary>
        public string RuntimeCookieName { get; set; }
    }
}
