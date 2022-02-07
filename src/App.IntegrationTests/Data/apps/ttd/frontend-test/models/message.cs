using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;

namespace Altinn.App.Models
{
#pragma warning disable SA1649 // File name should match first type name
    public class MessageV1
#pragma warning restore SA1649 // File name should match first type name
    {
    [XmlElement("ProcessTask")]
    [JsonProperty("ProcessTask")]
    [JsonPropertyName("ProcessTask")]
    public string ProcessTask { get; set; }

    [XmlElement("Title")]
    [JsonProperty("Title")]
    [JsonPropertyName("Title")]
    public string Title { get; set; }

    [XmlElement("Body")]
    [JsonProperty("Body")]
    [JsonPropertyName("Body")]
    public string Body { get; set; }

    [XmlElement("Reference")]
    [JsonProperty("Reference")]
    [JsonPropertyName("Reference")]
    public string Reference { get; set; }

    [XmlElement("Sender")]
    [JsonProperty("Sender")]
    [JsonPropertyName("Sender")]
    public string Sender { get; set; }
  }
}
