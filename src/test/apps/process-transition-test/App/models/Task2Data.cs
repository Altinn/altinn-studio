#nullable disable
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Newtonsoft.Json;

namespace Altinn.App.Models.Task2Data
{
    [XmlRoot(ElementName = "Task2Data")]
    public class Task2Data
    {
        [XmlElement("note", Order = 1)]
        [JsonProperty("note")]
        [JsonPropertyName("note")]
        public string note { get; set; }
    }
}
