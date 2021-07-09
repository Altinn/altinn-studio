using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;

namespace Altinn.Platform.Authentication.Model
{
    /// <summary>
    /// Oidc provider config
    /// </summary>
    public class OidcProvider
    {
        /// <summary>
        /// The OIDC issuer in token
        /// </summary>
        public string Issuer { get; set; }

        /// <summary>
        /// The authorization endpoint
        /// </summary>
        public string AuthorizationEndpoint { get; set; }

        /// <summary>
        /// Token endpoint
        /// </summary>
        public string TokenEndpoint { get; set; }

        /// <summary>
        /// Issuer key
        /// </summary>
        public string IssuerKey { get; set; }

        /// <summary>
        /// Well known endpoint
        /// </summary>
        public string WellKnownConfigEndpoint { get; set; }

        /// <summary>
        /// Scope to request
        /// </summary>
        public string Scope { get; set; } = "openid";

        /// <summary>
        /// The client Id
        /// </summary>
        public string ClientId { get; set; }

        /// <summary>
        /// The response type
        /// </summary>
        public string ResponseType { get; set; } = "code";
    }
}
