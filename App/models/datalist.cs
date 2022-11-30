using Newtonsoft.Json;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using System.Xml.Serialization;

namespace Altinn.App.Models
{
    [XmlRoot(ElementName = "melding")]
    public class Datalist
    {
        [XmlElement("DataListItem", Order = 1)]
        [JsonProperty("DataListItem")]
        [JsonPropertyName("DataListItem")]
        public string SelectedItem { get; set; }
        
        [XmlElement("SelectedItemProfession", Order = 2)]
        [JsonProperty("SelectedItemProfession")]
        [JsonPropertyName("SelectedItemProfession")]
        public string SelectedItemProfession { get; set; }
    }
}
