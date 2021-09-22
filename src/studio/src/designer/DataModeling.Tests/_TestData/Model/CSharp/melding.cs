#pragma warning disable SA1300 // Element should begin with upper-case letter
using System.Text.Json.Serialization;
using System.Xml.Serialization;

namespace DataModeling.Tests._TestData.Model.CSharp
{
    public class melding
    {
        [XmlElement("e1")]        
        [JsonPropertyName("e1")]
        public string E1 { get; set; }
    }
}
#pragma warning restore SA1300
