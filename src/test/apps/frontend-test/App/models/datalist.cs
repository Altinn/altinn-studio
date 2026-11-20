#nullable enable
using System;
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
        public string? SelectedItem { get; set; }
        
        [XmlElement("SelectedItemProfession", Order = 2)]
        [JsonProperty("SelectedItemProfession")]
        [JsonPropertyName("SelectedItemProfession")]
        public string? SelectedItemProfession { get; set; }

        [XmlElement("Search", Order = 3)]
        [JsonProperty("Search")]
        [JsonPropertyName("Search")]
        public string? Search { get; set; }

        [XmlElement("UseCustomConfirm", Order = 4)]
        [JsonProperty("UseCustomConfirm")]
        [JsonPropertyName("UseCustomConfirm")]
        public bool UseCustomConfirm { get; set; } = false;

        [XmlElement("SelectedPeople", Order = 5)]
        [JsonProperty("SelectedPeople")]
        [JsonPropertyName("SelectedPeople")]
        public List<SelectedPerson>? SelectedPeople { get; set; }
    }

    public class SelectedPerson
    {
        [XmlAttribute("altinnRowId")]
        [JsonPropertyName("altinnRowId")]
        [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
        [Newtonsoft.Json.JsonIgnore]
        public Guid AltinnRowId { get; set; }

        public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

        [XmlElement("Name", Order = 1)]
        [JsonProperty("Name")]
        [JsonPropertyName("Name")]
        public string? Name { get; set; }

        [XmlElement("Age", Order = 2)]
        [JsonProperty("Age")]
        [JsonPropertyName("Age")]
        public int? Age { get; set; }

        [XmlElement("Profession", Order = 3)]
        [JsonProperty("Profession")]
        [JsonPropertyName("Profession")]
        public string? Profession { get; set; }
    }
}
