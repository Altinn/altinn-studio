#nullable disable
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;
namespace Altinn.App.Models.Model2
{
  [XmlRoot(ElementName="Model2")]
  public class Model2
  {
    [XmlElement("property1", Order = 1)]
    [JsonProperty("property1")]
    [JsonPropertyName("property1")]
    public string property1 { get; set; }

    [XmlElement("fail", Order = 2)]
    [JsonProperty("fail")]
    [JsonPropertyName("fail")]
    [Required]
    public bool? fail { get; set; }

  }
}
