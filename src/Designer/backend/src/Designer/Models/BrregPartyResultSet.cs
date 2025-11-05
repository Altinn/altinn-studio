using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models
{
    public class BrregParty
    {
        [JsonPropertyName("organisasjonsnummer")]
        public required string Organisasjonsnummer { get; set; }
        [JsonPropertyName("navn")]
        public string? Navn { get; set; }
    }

    public class BrregPartyEmbedded
    {
        [JsonPropertyName("enheter")]
        public List<BrregParty>? Parties { get; set; }
        [JsonPropertyName("underenheter")]
        public List<BrregParty>? SubParties { get; set; }
    }

    public class BrregPartyResultSet
    {
        [JsonPropertyName("_embedded")]
        public BrregPartyEmbedded? Embedded { get; set; }
    }
}
