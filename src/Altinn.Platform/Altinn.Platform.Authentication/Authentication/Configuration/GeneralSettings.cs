using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Authentication.Configuration
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
        /// Gets or sets the bridge api endpoint
        /// </summary>
        public string BridgeApiEndpoint { get; set; }

        /// <summary>
        /// Gets the bridge api endpoint from kubernetes environment variables and appsettings if environment variable is not set
        /// </summary>
        public string GetBridgeApiEndpoint
        {
            get
            {
                return Environment.GetEnvironmentVariable("GeneralSettings__BridgeApiEndpoint") ?? BridgeApiEndpoint;
            }
        }

        /// <summary>
        /// Gets or sets the sbl redirect endpoint
        /// </summary>
        public string SBLRedirectEndpoint { get; set; }

        /// <summary>
        /// Gets the sbl redirect endpoint from kubernetes environment variables and appsettings if environment variable is not set
        /// </summary>
        public string GetSBLRedirectEndpoint
        {
            get
            {
                return Environment.GetEnvironmentVariable("GeneralSettings__SBLRedirectEndpoint") ?? SBLRedirectEndpoint;
            }
        }

        /// <summary>
        /// Gets or sets the platform endpoint
        /// </summary>
        public string PlatformEndpoint { get; set; }

        /// <summary>
        /// Gets the platform endpoint from kubernetes environment variables and appsettings if environment variable is not set
        /// </summary>
        public string GetPlatformEndpoint
        {
            get
            {
                return Environment.GetEnvironmentVariable("GeneralSettings__PlatformEndpoint") ?? PlatformEndpoint;
            }
        }

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
        public string HostName { get; set; }

        /// <summary>
        /// Gets the jwt cookie validity time from kubernetes environment variables and appsettings if environment variable is not set
        /// </summary>
        public string GetHostName
        {
            get
            {
                return Environment.GetEnvironmentVariable("GeneralSettings__HostName") ?? HostName;
            }
        }

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
    }
}
