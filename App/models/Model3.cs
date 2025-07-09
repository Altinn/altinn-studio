#nullable disable
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;
namespace Altinn.App.Models.Model3
{
  [XmlRoot(ElementName="Model3")]
  public class Model3
  {
    [XmlElement("fail", Order = 1)]
    [JsonProperty("fail")]
    [JsonPropertyName("fail")]
    [Required]
    public bool? fail { get; set; }

  }
}
