using System;

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

        /// <summary>
        /// Gets or sets URL of the well known configuration endpoint for Maskinporten.
        /// </summary>
        public string MaskinportenWellKnownConfigEndpoint { get; set; }

        /// <summary>
        /// Gets or sets URL of the well known configuration endpoint for Maskinporten from kubernetes or appsettings if no environment variable is set.
        /// </summary>
        public string GetMaskinportenWellKnownConfigEndpoint
        {
            get
            {
                return Environment.GetEnvironmentVariable("GeneralSettings__" + nameof(MaskinportenWellKnownConfigEndpoint)) ??
                       MaskinportenWellKnownConfigEndpoint;
            }
        }

        /// <summary>
        /// Gets or sets the url to the json file which holds the valid organisation entries (which inclides name, organisation number and org identifier)
        /// </summary>
        public string OrganisationRepositoryLocation { get; set; }

        /// <summary>
        /// Gets the url of the list of valid organisation entries (json)
        /// </summary>
        public string GetOrganisationRepositoryLocation
        {
            get
            {
                return Environment.GetEnvironmentVariable("GeneralSettings__" + nameof(OrganisationRepositoryLocation)) ??
                    OrganisationRepositoryLocation;
            }
        }
    }
}
