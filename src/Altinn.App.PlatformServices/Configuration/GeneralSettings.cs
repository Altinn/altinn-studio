using System;

namespace Altinn.App.Services.Configuration
{
    /// <summary>
    /// General configuration settings
    /// </summary>
    public class GeneralSettings
    {
        /// <summary>
        /// Gets or sets the location to search for templates
        /// </summary>
        public string TemplateLocation { get; set; }

        /// <summary>
        /// Gets or sets the soft validation prefix.
        /// </summary>
        public string SoftValidationPrefix { get; set; }

        /// <summary>
        /// Gets or sets the fixed validation prefix.
        /// </summary>
        public string FixedValidationPrefix { get; set; }

        /// <summary>
        /// Gets or sets the host name.
        /// </summary>
        public string HostName { get; set; }

        /// <summary>
        /// Gets or sets the AltinnParty cookie name.
        /// </summary>
        public string AltinnPartyCookieName { get; set; }

        /// <summary>
        /// Gets the altinn party cookie from kubernetes environment variables or appSettings if environment variable is missing.
        /// </summary>
        public string GetAltinnPartyCookieName
        {
            get
            {
                return Environment.GetEnvironmentVariable("GeneralSettings__AltinnPartyCookieName") ?? AltinnPartyCookieName;
            }
        }
    }
}
