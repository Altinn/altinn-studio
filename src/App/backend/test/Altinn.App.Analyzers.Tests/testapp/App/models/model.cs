using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;

namespace Altinn.App.Models.model
{
    [XmlRoot(ElementName = "model")]
    public class model
    {
        [XmlElement("property1", Order = 1)]
        [JsonProperty("property1")]
        [JsonPropertyName("property1")]
        public string property1 { get; set; }

        [XmlElement("property2", Order = 2)]
        [JsonProperty("property2")]
        [JsonPropertyName("property2")]
        public string property2 { get; set; }

        [XmlElement("property3", Order = 3)]
        [JsonProperty("property3")]
        [JsonPropertyName("property3")]
        public string property3 { get; set; }
    }
}
