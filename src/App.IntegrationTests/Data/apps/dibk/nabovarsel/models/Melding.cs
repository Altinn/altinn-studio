using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Newtonsoft.Json;

#pragma warning disable SA1300 // Element should begin with upper-case letter
namespace App.IntegrationTestsRef.Data.apps.dibk.nabovarsel
#pragma warning restore SA1300 // Element should begin with upper-case letter
{
    public class Melding
    {
        [XmlElement("Task")]
        [JsonProperty("Task")]
        [JsonPropertyName("Task")]
        public string Task { get; set; }

        [XmlElement("MessageTitle")]
        [JsonProperty("MessageTitle")]
        [JsonPropertyName("MessageTitle")]
        public string MessageTitle { get; set; }

        [XmlElement("MessageBody")]
        [JsonProperty("MessageBody")]
        [JsonPropertyName("MessageBody")]
        public string MessageBody { get; set; }

        [XmlElement("Reference")]
        [JsonProperty("Reference")]
        [JsonPropertyName("Reference")]
        public string Reference { get; set; }

        [XmlElement("MessageSender")]
        [JsonProperty("MessageSender")]
        [JsonPropertyName("MessageSender")]
        public string MessageSender { get; set; }
    }
}
