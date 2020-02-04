namespace Altinn.Platform.Storage.Configuration
{
    /// <summary>
    /// Configuration object used to hold general settings for the storage application.
    /// </summary>
    public class GeneralSettings
    {
        /// <summary>
        /// Gets or sets the name of the environment. (dev, at22, tt02, prod, etc)
        /// </summary>
        public string EnvironmentName { get; set; }

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
