using System.Text.Json.Serialization;
using System.Xml.Serialization;

namespace DataModeling.Tests._TestData.Model.CSharp
{
    [XmlRoot(ElementName = "melding")]
    public class Melding
    {
        [XmlElement("e1")]
        [JsonPropertyName("e1")]
        public string E1 { get; set; }
    }
}
