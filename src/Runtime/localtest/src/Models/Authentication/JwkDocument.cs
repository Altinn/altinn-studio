using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Platform.Authentication.Model
{
    /// <summary>
    /// Represents a Json Wen Key as described by "JSON Web Key (JWK) draft-ietf-jose-json-web-key-41"
    /// URL: https://tools.ietf.org/html/draft-ietf-jose-json-web-key-41
    /// </summary>
    /// <remarks>
    /// This class can currently only represent a certificate chain based on an x509 certificate.
    /// </remarks>
    public class JwkDocument
    {
        /// <summary>
        /// Gets or sets the type of key this is. E.g. RSA
        /// </summary>
        [JsonPropertyName("kty")]
        public string KeyType { get; set; }

        /// <summary>
        /// Gets or sets the type of use. E.g. sig
        /// </summary>
        [JsonPropertyName("use")]
        public string PublicKeyUse { get; set; }

        /// <summary>
        /// Gets or sets a unique id for the key.
        /// </summary>
        [JsonPropertyName("kid")]
        public string KeyId { get; set; }

        /// <summary>
        /// Gets or sets the RSA exponent value of the key.
        /// </summary>
        [JsonPropertyName("e")]
        public string Exponent { get; set; }

        /// <summary>
        /// Gets or sets the RSA modulus value of the key.
        /// </summary>
        [JsonPropertyName("n")]
        public string Modulus { get; set; }

        /// <summary>
        /// Gets or sets a list of base64 encoded certificate where each new item is the parent certificate of the previous in a certificate chain.
        /// </summary>
        [JsonPropertyName("x5c")]
        public List<string> X509Chain { get; set; }
    }
}
