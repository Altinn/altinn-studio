using Newtonsoft.Json;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using System.Xml.Serialization;

namespace Altinn.App.Models
{
    [XmlRoot(ElementName = "melding")]
    public class Datalist
    {
        [XmlElement("SelectedItem", Order = 1)]
        [JsonProperty("SelectedItem")]
        [JsonPropertyName("SelectedItem")]
        public string SelectedItem { get; set; }
        
        [XmlElement("SelectedItemProfession", Order = 2)]
        [JsonProperty("SelectedItemProfession")]
        [JsonPropertyName("SelectedItemProfession")]
        public string SelectedItemProfession { get; set; }

        [XmlElement("Search", Order = 3)]
        [JsonProperty("Search")]
        [JsonPropertyName("Search")]
        public string Search { get; set; }

        [XmlElement("UseCustomConfirm", Order = 4)]
        [JsonProperty("UseCustomConfirm")]
        [JsonPropertyName("UseCustomConfirm")]
        public bool UseCustomConfirm { get; set; } = false;

    }
}
