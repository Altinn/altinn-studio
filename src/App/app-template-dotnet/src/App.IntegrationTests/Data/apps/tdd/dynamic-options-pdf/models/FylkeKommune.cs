using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Newtonsoft.Json;

namespace App.IntegrationTests.Mocks.Apps.Ttd.DynamicOptionsPdf.Models
{
  [XmlRoot(ElementName="Melding")]
  public class FylkeKommune
  {
    [XmlElement("Fylke")]
    [JsonProperty("Fylke")]
    [JsonPropertyName("Fylke")]
    public string Fylke { get; set; }

    [XmlElement("Kommune")]
    [JsonProperty("Kommune")]
    [JsonPropertyName("Kommune")]
    public string Kommune { get; set; }

    [XmlElement("Land")]
    [JsonProperty("Land")]
    [JsonPropertyName("Land")]
    public string Land { get; set; }
  }
}
