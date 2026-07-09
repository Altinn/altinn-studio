#nullable disable
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Newtonsoft.Json;

namespace Altinn.App.Models.TransitionControl
{
    [XmlRoot(ElementName = "TransitionControl")]
    public class TransitionControl
    {
        [XmlElement("delayMs", Order = 1)]
        [JsonProperty("delayMs")]
        [JsonPropertyName("delayMs")]
        public int? delayMs { get; set; }

        [XmlElement("failCount", Order = 2)]
        [JsonProperty("failCount")]
        [JsonPropertyName("failCount")]
        public int? failCount { get; set; }

        [XmlElement("failKind", Order = 3)]
        [JsonProperty("failKind")]
        [JsonPropertyName("failKind")]
        public string failKind { get; set; }

        [XmlElement("phase", Order = 4)]
        [JsonProperty("phase")]
        [JsonPropertyName("phase")]
        public string phase { get; set; }
    }
}
