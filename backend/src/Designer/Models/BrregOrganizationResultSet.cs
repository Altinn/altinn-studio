#nullable enable
using System.Collections.Generic;
using System.Text.Json.Serialization;

namespace Altinn.Studio.Designer.Models
{
    public class BrregOrganization
    {
        [JsonPropertyName("organisasjonsnummer")]
        public string Organisasjonsnummer { get; set; }
        [JsonPropertyName("navn")]
        public string? Navn { get; set; }
    }

    public class BrregEnheterEmbedded
    {
        [JsonPropertyName("enheter")]
        public List<BrregOrganization>? Enheter { get; set; }
        [JsonPropertyName("underenheter")]
        public List<BrregOrganization>? Underenheter { get; set; }
    }

    public class BrregOrganizationResultSet
    {
        [JsonPropertyName("_embedded")]
        public BrregEnheterEmbedded? Embedded { get; set; }
    }
}
