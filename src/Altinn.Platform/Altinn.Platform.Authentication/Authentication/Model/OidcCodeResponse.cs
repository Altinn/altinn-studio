using System;
using System.Collections.Generic;
using System.Linq;
using System.Runtime.Serialization;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using Newtonsoft.Json;

namespace Altinn.Platform.Authentication.Model
{
    /// <summary>
    /// The response is a set of tokens and associated metadata, and will depend upon what was requested.
    /// </summary>
    public class OidcCodeResponse
    {
        /// <summary>
        /// Number of seconds until this access_token is no longer valid
        /// </summary>
        public int Expires_in { get; set;  }

        /// <summary>
        /// An Oauth2 access token, either by reference or as a JWT depending on which scopes was requested and/or client registration properties.
        /// </summary>
        public string Access_token { get; set; }

        /// <summary>
        /// Type of token
        /// </summary>
        public string Token_type { get; set; }

        /// <summary>
        /// An OpenID Connect id_token. Only returned if ‘openid’ scope was requested.
        /// </summary>
        [JsonPropertyName("id_token")]
        public string Id_token { get; set; }

        /// <summary>
        /// The list of scopes issued in the access token. Included for convenience only, and should not be trusted for access control decisions.
        /// </summary>
        public string Scope { get; set; }

        /// <summary>
        /// Issued to confidential clients
        /// </summary>
        public string Refresh_token { get; set; }
    }
}
