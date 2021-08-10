using System;

namespace Altinn.Platform.Authentication.Configuration
{
    /// <summary>
    /// General configuration settings
    /// </summary>
    public class GeneralSettings
    {
        /// <summary>
        /// Gets or sets the name of the SBL authentication cookie.
        /// </summary>
        public string SblAuthCookieName { get; set; }

        /// <summary>
        /// Gets or sets the name of the JSON Web Token cookie.
        /// </summary>
        public string JwtCookieName { get; set; }

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
        /// Gets or sets the bridge authentication api endpoint
        /// </summary>
        public string BridgeAuthnApiEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the bridge authentication api endpoint
        /// </summary>
        public string BridgeProfileApiEndpoint { get; set; }

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
        /// Gets or sets the number of minutes the JSON Web Token and the cookie is valid.
        /// </summary>
        public int JwtValidityMinutes { get; set; }

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
        /// Gets url of the well known configuration endpoint for ID-porten from environment variable.
        /// </summary>
        public string IdPortenWellKnownConfigEndpoint { get; set; }

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

        /// <summary>
        /// Gets or sets the URL of the Altinn Open ID Connect well-known configuration endpoint.
        /// </summary>
        public string OpenIdWellKnownEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the number of hours to wait before a new certificate is being used to
        /// sign new JSON Web tokens.
        /// </summary>
        /// <remarks>
        /// The logic use the NotBefore property of a certificate. This means that uploading a
        /// certificate that has been valid for a few days might cause it to be used immediately.
        /// Take care not to upload "old" certificates.
        /// </remarks>
        public int JwtSigningCertificateRolloverDelayHours { get; set; }

        /// <summary>
        /// Get or sets the value indicating if OIDC authentication is enabled
        /// </summary>
        public bool EnableOidc { get; set; }

        /// <summary>
        /// Get or sets the default oidc provider
        /// </summary>
        public string DefaultOidcProvider { get; set; }

        /// <summary>
        /// Get or sets the 
        /// </summary>
        public bool OidcDefault { get; set; }

        /// <summary>
        /// Name of Oidc Nonce cookie
        /// </summary>
        public string OidcNonceCookieName { get; set; } = "oidcnonce";
    }
}
