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
        /// Gets or sets the platform endpoint
        /// </summary>
        public string PlatformEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the claims identity
        /// </summary>
        public string ClaimsIdentity { get; set; }

        /// <summary>
        /// Gets or sets the number of minutes the JSON Web Token and the cookie is valid.
        /// </summary>
        public int JwtValidityMinutes { get; set; }

        /// <summary>
        /// Gets or sets the hostname
        /// </summary>
        public string HostName { get; set; }

        /// <summary>
        /// Gets or sets the BaseUrl
        /// </summary>
        public string BaseUrl { get; set; }

        /// <summary>
        /// Gets or sets URL of the well known configuration endpoint for Maskinporten.
        /// </summary>
        public string MaskinportenWellKnownConfigEndpoint { get; set; }

        /// <summary>
        /// Gets url of the well known configuration endpoint for ID-porten from environment variable.
        /// </summary>
        public string IdPortenWellKnownConfigEndpoint { get; set; }

        /// <summary>
        /// Gets or sets the url to the json file which holds the valid organisation entries (which inclides name, organisation number and org identifier)
        /// </summary>
        public string OrganisationRepositoryLocation { get; set; }

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
        /// Gets the Altinn Open ID Connect (OIDC) Issuer URL.
        /// </summary>
        public string AltinnOidcIssuerUrl
        {
            get
            {
                return PlatformEndpoint + "authentication/api/v1/openid/";
            }
        }

        /// <summary>
        /// Get or sets the value indicating if OIDC authentication is enabled
        /// </summary>
        public bool EnableOidc { get; set; }

        /// <summary>
        /// Get or sets the default oidc provider
        /// </summary>
        public string DefaultOidcProvider { get; set; }

        /// <summary>
        /// Defines if OIDC is the default authentication
        /// </summary>
        public bool ForceOidc { get; set; }

        /// <summary>
        /// Name of Oidc Nonce cookie
        /// </summary>
        public string OidcNonceCookieName { get; set; } = "oidcnonce";

        /// <summary>
        /// Cookie to store original 
        /// </summary>
        public string AuthnGotToCookieName { get; set; } = "authngoto";
    }
}
