using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;
namespace Altinn.App.Models.modell1
{
  [XmlRoot(ElementName="modell1")]
  public class modell1
  {
    [MaxLength(10)]
    [XmlElement("tekstfelt", Order = 1)]
    [JsonProperty("tekstfelt")]
    [JsonPropertyName("tekstfelt")]
    public string tekstfelt { get; set; }

    [XmlElement("gateadresse", Order = 2)]
    [JsonProperty("gateadresse")]
    [JsonPropertyName("gateadresse")]
    public string gateadresse { get; set; }

    [XmlElement("poststed", Order = 3)]
    [JsonProperty("poststed")]
    [JsonPropertyName("poststed")]
    public string poststed { get; set; }

    [XmlElement("bransje", Order = 4)]
    [JsonProperty("bransje")]
    [JsonPropertyName("bransje")]
    public string bransje { get; set; }

  }
}
