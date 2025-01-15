#nullable disable
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;
namespace Altinn.App.Models.subform
{
  [XmlRoot(ElementName="subform")]
  public class subform
  {
    [XmlElement("registreringsnummer", Order = 1)]
    [JsonProperty("registreringsnummer")]
    [JsonPropertyName("registreringsnummer")]
    public string registreringsnummer { get; set; }

    [XmlElement("aarsmodell", Order = 2)]
    [JsonProperty("aarsmodell")]
    [JsonPropertyName("aarsmodell")]
    public string aarsmodell { get; set; }

    [XmlElement("merke", Order = 3)]
    [JsonProperty("merke")]
    [JsonPropertyName("merke")]
    public string merke { get; set; }

  }
}
