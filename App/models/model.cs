#nullable disable
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
  [XmlRoot(ElementName="model")]
  public class model
  {
    [XmlElement("streetnr", Order = 1)]
    [JsonProperty("streetnr")]
    [JsonPropertyName("streetnr")]
    public string streetnr { get; set; }

    [XmlElement("postnr", Order = 2)]
    [JsonProperty("postnr")]
    [JsonPropertyName("postnr")]
    public string postnr { get; set; }

    [XmlElement("city", Order = 3)]
    [JsonProperty("city")]
    [JsonPropertyName("city")]
    public string city { get; set; }

    [XmlElement("co", Order = 4)]
    [JsonProperty("co")]
    [JsonPropertyName("co")]
    public string co { get; set; }

    [XmlElement("street", Order = 5)]
    [JsonProperty("street")]
    [JsonPropertyName("street")]
    public string street { get; set; }

  }
}
