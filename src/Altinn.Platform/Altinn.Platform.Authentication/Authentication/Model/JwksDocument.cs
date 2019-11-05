using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Platform.Authentication.Model
{
    public class JwksDocument
    {
        [JsonPropertyName("keys")]
        public List<JwkDocument> Keys { get; set; }
    }
}
