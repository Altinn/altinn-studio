using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Platform.Authentication.Model
{
    /// <summary>
    /// Represents a Json Wen Key set as described by "JSON Web Key (JWK) draft-ietf-jose-json-web-key-41"
    /// URL: https://tools.ietf.org/html/draft-ietf-jose-json-web-key-41
    /// </summary>
    public class JwksDocument
    {
        /// <summary>
        /// Gets or sets the list of keys in the key set.
        /// </summary>
        [JsonPropertyName("keys")]
        public List<JwkDocument> Keys { get; set; }
    }
}
