using System.Collections.Generic;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Newtonsoft.Json;
namespace Altinn.App.Models
{
    [XmlRoot(ElementName="melding")]
    public class LikertSurvey
    {
        [XmlElement("Questions", Order = 1)]
        [JsonProperty("Questions")]
        [JsonPropertyName("Questions")]
        public List<Question> Questions { get; set; }

    }

    public class Question
    {
        [XmlElement("Id", Order = 1)]
        [JsonProperty("Id")]
        [JsonPropertyName("Id")]
        public string Id { get; set; }

        [XmlElement("Answer", Order = 2)]
        [JsonProperty("Answer")]
        [JsonPropertyName("Answer")]
        public string Answer { get; set; }

    }
}