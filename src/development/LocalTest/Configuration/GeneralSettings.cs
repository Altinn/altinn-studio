using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace LocalTest.Configuration
{
    /// <summary>
    /// General configuration settings
    /// </summary>
    public class GeneralSettings
    {
        /// <summary>
        /// Gets or sets the sbl cookie name
        /// </summary>
        public string SBLCookieName { get; set; }

        /// <summary>
        /// Gets the sbl cookie from kubernetes environment variables and appsettings if environment variable is not set
        /// </summary>
        public string GetSBLCookieName
        {
            get
            {
                return Environment.GetEnvironmentVariable("GeneralSettings__SBLCookieName") ?? SBLCookieName;
            }
        }

        /// <summary>
        /// Gets or sets the AltinnParty cookie name
        /// </summary>
        public string AltinnPartyCookieName { get; set; }

        /// <summary>
        /// Gets the altinnParty cookie from kubernetes environment variables and appsettings if environment variable is not set
        /// </summary>
        public string GetAltinnPartyCookieName
        {
            get
            {
                return Environment.GetEnvironmentVariable("GeneralSettings__AltinnPartyCookieName") ?? AltinnPartyCookieName;
            }
        }

        /// <summary>
        /// Gets or sets the platform endpoint
        /// </summary>
        public string PlatformEndpoint { get; set; }

        /// <summary>
        /// Gets the platform endpoint from kubernetes environment variables or appsettings if environment variable is missing
        /// </summary>
        public string GetPlatformEndpoint => GetEnvironmentOrPropertyValue(nameof(PlatformEndpoint));

        /// <summary>
        /// Gets or sets the claims identity
        /// </summary>
        public string ClaimsIdentity { get; set; }

        /// <summary>
        /// Gets the claims identity from kubernetes environment variables and appsettings if environment variable is not set
        /// </summary>
        public string GetClaimsIdentity
        {
            get
            {
                return Environment.GetEnvironmentVariable("GeneralSettings__ClaimsIdentity") ?? ClaimsIdentity;
            }
        }

        /// <summary>
        /// Gets or sets the number of minutes the jwt cookie is valid for
        /// </summary>
        public string JwtCookieValidityTime { get; set; }

        /// <summary>
        /// Gets the jwt cookie validity time from kubernetes environment variables and appsettings if environment variable is not set
        /// </summary>
        public string GetJwtCookieValidityTime
        {
            get
            {
                return Environment.GetEnvironmentVariable("GeneralSettings__GetJwtCookieValidityTime") ?? JwtCookieValidityTime;
            }
        }

        /// <summary>
        /// Gets or sets the hostname
        /// </summary>
        public string Hostname { get; set; }

        /// <summary>
        /// Gets or sets the BaseUrl
        /// </summary>
        public string BaseUrl { get; set; }

        /// <summary>
        /// Gets the jwt cookie validity time from kubernetes environment variables and appsettings if environment variable is not set
        /// </summary>
        public string GetBaseUrl
        {
            get
            {
                return Environment.GetEnvironmentVariable("GeneralSettings__BaseUrl") ?? BaseUrl;
            }
        }

        /// <summary>
        /// Get value from environment variable with key equals "GeneralSettings__" + propertyName or directly from
        /// the property if the environment variable is missing.
        /// </summary>
        /// <param name="propertyName">The name of a property in this class.</param>
        /// <returns>The identified value</returns>
        /// <remarks>This method is using reflection. Avoid it if a value is being accessed frequently. Like in a loop.</remarks>
        private string GetEnvironmentOrPropertyValue(string propertyName)
        {
            var prop = this.GetType().GetProperty(propertyName);
            if (prop == null)
            {
                throw new ArgumentException($"This class does not have any property with the name {propertyName}");
            }

            string envValue = Environment.GetEnvironmentVariable("GeneralSettings__" + propertyName);

            return envValue ?? prop.GetValue(this).ToString();
        }
    }
}
