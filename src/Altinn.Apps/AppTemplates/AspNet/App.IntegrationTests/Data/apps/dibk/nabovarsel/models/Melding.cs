using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json.Serialization;
using System.Xml.Serialization;

namespace App.IntegrationTestsRef.Data.apps.dibk.nabovarsel.models
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
