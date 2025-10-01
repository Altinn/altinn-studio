#nullable enable
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
        public required string Issuer { get; set; }

        /// <summary>
        /// URL of the JSON Web Key Set document.
        /// </summary>
        [JsonPropertyName("jwks_uri")]
        public required string JwksUri { get; set; }

        /// <summary>
        /// URL of the OAuth 2.0 Authorization Endpoint.
        /// </summary>
        [JsonPropertyName("authorization_endpoint")]
        public required string AuthorizationEndpoint { get; set; }

        /// <summary>
        /// URL of the OAuth 2.0 Token Endpoint.
        /// </summary>
        [JsonPropertyName("token_endpoint")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? TokenEndpoint { get; set; }

        /// <summary>
        /// Url of the UserInfo Endpoint.
        /// </summary>
        [JsonPropertyName("userinfo_endpoint")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? UserinfoEndpoint { get; set; }

        /// <summary>
        /// URL of the end session Endpoint.
        /// </summary>
        [JsonPropertyName("end_session_endpoint")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? EndSessionEndpoint { get; set; }

        /// <summary>
        /// URL for the session check Endpoint.
        /// </summary>
        [JsonPropertyName("check_session_iframe")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? CheckSessionIframe { get; set; }

        /// <summary>
        /// URL for the revocation endpoint.
        /// </summary>
        [JsonPropertyName("revocation_endpoint")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? RevocationEndpoint { get; set; }

        /// <summary>
        /// URL for the introspection endpoint.
        /// </summary>
        [JsonPropertyName("introspection_endpoint")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string? IntrospectionEndpoint { get; set; }

        /// <summary>
        /// Value indicating whether there is a front channel mechanism for logout.
        /// </summary>
        [JsonPropertyName("frontchannel_logout_supported")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public bool? FrontchannelLogoutSupported { get; set; }

        /// <summary>
        /// Value indicating wheter there is a front channel mechanism for session logout.
        /// </summary>
        [JsonPropertyName("frontchannel_logout_session_supported")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public bool? FrontchannelLogoutSessionSupported { get; set; }

        /// <summary>
        /// Array of supported scopes.
        /// </summary>
        [JsonPropertyName("scopes_supported")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string[]? ScopesSupported { get; set; }

        /// <summary>
        /// Array of supported claims.
        /// </summary>
        [JsonPropertyName("claims_supported")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string[]? ClaimsSupported { get; set; }

        /// <summary>
        /// Array of supported response types.
        /// </summary>
        [JsonPropertyName("response_types_supported")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string[]? ResponseTypesSupported { get; set; }

        /// <summary>
        /// Array of supported response modes.
        /// </summary>
        [JsonPropertyName("response_modes_supported")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public  string[]? ResponseModesSupported { get; set; }

        /// <summary>
        /// Array of supported grant types.
        /// </summary>
        [JsonPropertyName("grant_types_supported")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string[]? GrantTypesSupported { get; set; }

        /// <summary>
        /// Array of supported subject types.
        /// </summary>
        [JsonPropertyName("subject_types_supported")]
        public required string[] SubjectTypesSupported { get; set; }

        /// <summary>
        /// Array of supported signing algorithms.
        /// </summary>
        [JsonPropertyName("id_token_signing_alg_values_supported")]
        public required string[] IdTokenSigningAlgValuesSupported { get; set; }

        /// <summary>
        /// Array of supported authentication methods on the token endpoint.
        /// </summary>
        [JsonPropertyName("token_endpoint_auth_methods_supported")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string[]? TokenEndpointAuthMethodsSupported { get; set; }

        /// <summary>
        /// Array of supported code challenge methods.
        /// </summary>
        [JsonPropertyName("code_challenge_methods_supported")]
        [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingNull)]
        public string[]? CodeChallengeMethodsSupported { get; set; }
    }
}