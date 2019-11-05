using System.Text.Json.Serialization;

namespace Altinn.Platform.Authentication.Model
{
    /// <summary>
    /// Represents the well known discovery document described by "OpenID Connect Discovery 1.0 incorporating errata set 1"
    /// URL: https://openid.net/specs/openid-connect-discovery-1_0.html (and other specifications)
    /// </summary>
    public class DiscoveryDocument
    {
        /// <summary>
        /// URL of the issuer
        /// </summary>
        [JsonPropertyName("issuer")]
        public string Issuer { get; set; }

        /// <summary>
        /// URL of the JSON Web Key Set document.
        /// </summary>
        [JsonPropertyName("jwks_uri")]
        public string JwksUri { get; set; }

        /// <summary>
        /// URL of the OAuth 2.0 Authorization Endpoint.
        /// </summary>
        [JsonPropertyName("authorization_endpoint")]
        public string AuthorizationEndpoint { get; set; }

        /// <summary>
        /// URL of the OAuth 2.0 Token Endpoint.
        /// </summary>
        [JsonPropertyName("token_endpoint")]
        public string TokenEndpoint { get; set; }

        /// <summary>
        /// Url of the UserInfo Endpoint.
        /// </summary>
        [JsonPropertyName("userinfo_endpoint")]
        public string UserinfoEndpoint { get; set; }

        /// <summary>
        /// URL of the end session Endpoint.
        /// </summary>
        [JsonPropertyName("end_session_endpoint")]
        public string EndSessionEndpoint { get; set; }

        /// <summary>
        /// URL for the session check Endpoint.
        /// </summary>
        [JsonPropertyName("check_session_iframe")]
        public string CheckSessionIframe { get; set; }

        [JsonPropertyName("revocation_endpoint")]
        public string RevocationEndpoint { get; set; }

        [JsonPropertyName("introspection_endpoint")]
        public string IntrospectionEndpoint { get; set; }

        [JsonPropertyName("frontchannel_logout_supported")]
        public bool? FrontchannelLogoutSupported { get; set; }

        [JsonPropertyName("frontchannel_logout_session_supported")]
        public bool? FrontchannelLogoutSessionSupported { get; set; }

        [JsonPropertyName("scopes_supported")]
        public string[] ScopesSupported { get; set; }
        
        [JsonPropertyName("claims_supported")]
        public string[] ClaimsSupported { get; set; }
        
        [JsonPropertyName("response_types_supported")]
        public string[] ResponseTypesSupported { get; set; }

        [JsonPropertyName("response_modes_supported")]
        public string[] ResponseModesSupported { get; set; }

        [JsonPropertyName("grant_types_supported")]
        public string[] GrantTypesSupported { get; set; }

        [JsonPropertyName("subject_types_supported")]
        public string[] SubjectTypesSupported { get; set; }

        [JsonPropertyName("id_token_signing_alg_values_supported")]
        public string[] IdTokenSigningAlgValuesSupported { get; set; }

        [JsonPropertyName("token_endpoint_auth_methods_supported")]
        public string[] TokenEndpointAuthMethodsSupported { get; set; }

        [JsonPropertyName("code_challenge_methods_supported")]
        public string[] CodeChallengeMethodsSupported { get; set; }
    }
}
