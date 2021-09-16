using System.Text.Json.Serialization;

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
        [JsonPropertyName("expires_in")]
        public int ExpiresIn { get; set;  }

        /// <summary>
        /// An Oauth2 access token, either by reference or as a JWT depending on which scopes was requested and/or client registration properties.
        /// </summary>
        [JsonPropertyName("access_token")]
        public string AccessToken { get; set; }

        /// <summary>
        /// Type of token
        /// </summary>
        [JsonPropertyName("token_type")]
        public string TokenType { get; set; }

        /// <summary>
        /// An OpenID Connect id_token. Only returned if ‘openid’ scope was requested.
        /// </summary>
        [JsonPropertyName("id_token")]
        public string IdToken { get; set; }

        /// <summary>
        /// The list of scopes issued in the access token. Included for convenience only, and should not be trusted for access control decisions.
        /// </summary>
        [JsonPropertyName("scope")]
        public string Scope { get; set; }

        /// <summary>
        /// Issued to confidential clients
        /// </summary>
        [JsonPropertyName("refresh_token")]
        public string RefreshToken { get; set; }
    }
}
