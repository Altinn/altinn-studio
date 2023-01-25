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
  [XmlRoot(ElementName="Message")]
  public class MessageV1
  {
    [XmlElement("ProcessTask", Order = 1)]
    [JsonProperty("ProcessTask")]
    [JsonPropertyName("ProcessTask")]
    public string ProcessTask { get; set; }

    [XmlElement("ServiceName", Order = 2)]
    [JsonProperty("ServiceName")]
    [JsonPropertyName("ServiceName")]
    public string ServiceName { get; set; }

    [XmlElement("Title", Order = 3)]
    [JsonProperty("Title")]
    [JsonPropertyName("Title")]
    public string Title { get; set; }

    [XmlElement("Body", Order = 4)]
    [JsonProperty("Body")]
    [JsonPropertyName("Body")]
    public string Body { get; set; }

    [XmlElement("Reference", Order = 5)]
    [JsonProperty("Reference")]
    [JsonPropertyName("Reference")]
    public string Reference { get; set; }

    [XmlElement("Sender", Order = 6)]
    [JsonProperty("Sender")]
    [JsonPropertyName("Sender")]
    public string Sender { get; set; }

  }
}
