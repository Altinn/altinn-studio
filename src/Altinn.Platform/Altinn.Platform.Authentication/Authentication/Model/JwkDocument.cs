using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Platform.Authentication.Model
{
    public class JwkDocument
    {
        [JsonPropertyName("kty")]
        public string KeyType { get; set; }

        [JsonPropertyName("use")]
        public string PublicKeyUse { get; set; }

        [JsonPropertyName("kid")]
        public string KeyId { get; set; }

        [JsonPropertyName("e")]
        public string Exponent { get; set; }

        [JsonPropertyName("n")]
        public string Modulus { get; set; }

        [JsonPropertyName("x5c")]
        public List<string> X509Chain { get; set; }
    }
}
