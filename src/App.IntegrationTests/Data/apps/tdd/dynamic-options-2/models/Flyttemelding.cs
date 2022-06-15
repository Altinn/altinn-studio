using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Newtonsoft.Json;

namespace App.IntegrationTests.Mocks.Apps.Ttd.DynamicOptions2.Models
{
  [XmlRoot(ElementName="Flyttemelding")]
  public class Flyttemelding
  {
    [XmlElement("FlytterFra", Order = 1)]
    [JsonProperty("FlytterFra")]
    [JsonPropertyName("FlytterFra")]
    public FylkeKommune FlytterFra { get; set; }

    [XmlElement("FlytterTil", Order = 2)]
    [JsonProperty("FlytterTil")]
    [JsonPropertyName("FlytterTil")]
    public FylkeKommune FlytterTil { get; set; }

    [XmlElement("Barn", Order = 3)]
    [JsonProperty("Barn")]
    [JsonPropertyName("Barn")]
    public string Child { get; set; }
}

  public class FylkeKommune
  {
    [XmlElement("Fylke", Order = 1)]
    [JsonProperty("Fylke")]
    [JsonPropertyName("Fylke")]
    public string Fylke { get; set; }

    [XmlElement("Kommune", Order = 2)]
    [JsonProperty("Kommune")]
    [JsonPropertyName("Kommune")]
    public string Kommune { get; set; }
  }
}
