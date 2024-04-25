#nullable disable
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Newtonsoft.Json;

namespace Altinn.App.PlatformServices.Tests.Implementation.TestResources;

public class DummyModel
{
    [XmlElement("name", Order = 1)]
    [JsonProperty("name")]
    [JsonPropertyName("name")]
    public string Name { get; set; }
}
