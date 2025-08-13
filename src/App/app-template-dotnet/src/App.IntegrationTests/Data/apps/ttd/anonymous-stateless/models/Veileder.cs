using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Newtonsoft.Json;

namespace App.IntegrationTests.Mocks.Apps.Ttd.AnonymousStateless.Models
{
  [XmlRoot(ElementName="StarteBedrift")]
  public class Veileder
  {
    [XmlElement("Bransje", Order = 1)]
    [JsonProperty("Bransje")]
    [JsonPropertyName("Bransje")]
    public string Bransje { get; set; }

    [XmlElement("Kommune", Order = 2)]
    [JsonProperty("Kommune")]
    [JsonPropertyName("Kommune")]
    public string Kommune { get; set; }
  }
}
