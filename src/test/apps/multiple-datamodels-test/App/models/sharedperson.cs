using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Newtonsoft.Json;

namespace Altinn.App.Models.sharedperson
{
    [XmlRoot(ElementName = "sharedperson")]
    public class sharedperson
    {
        [XmlElement("name", Order = 1)]
        [JsonProperty("name")]
        [JsonPropertyName("name")]
        public string name { get; set; }

        [XmlElement("address", Order = 2)]
        [JsonProperty("address")]
        [JsonPropertyName("address")]
        public address address { get; set; }
    }

    public class address
    {
        [XmlElement("streetAddress", Order = 1)]
        [JsonProperty("streetAddress")]
        [JsonPropertyName("streetAddress")]
        public string streetAddress { get; set; }

        [XmlElement("zipCode", Order = 2)]
        [JsonProperty("zipCode")]
        [JsonPropertyName("zipCode")]
        public string zipCode { get; set; }

        [XmlElement("city", Order = 3)]
        [JsonProperty("city")]
        [JsonPropertyName("city")]
        public string city { get; set; }
    }
}
