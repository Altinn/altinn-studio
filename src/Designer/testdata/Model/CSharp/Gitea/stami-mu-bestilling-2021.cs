#nullable disable
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;
namespace Altinn.App.Models
{
  [XmlRoot(ElementName="MuOrder", Namespace="https://aip.stami.no/order.xsd")]
  public class MuOrder
  {
    [XmlElement("organisasjonsnummer", Order = 1)]
    [JsonProperty("organisasjonsnummer")]
    [JsonPropertyName("organisasjonsnummer")]
    [Required]
    public string organisasjonsnummer { get; set; }

    [XmlElement("organisasjonsnavn", Order = 2)]
    [JsonProperty("organisasjonsnavn")]
    [JsonPropertyName("organisasjonsnavn")]
    [Required]
    public string organisasjonsnavn { get; set; }

    [RegularExpression(@"[^@]+@[^\.]+\..+")]
    [XmlElement("epost", Order = 3)]
    [JsonProperty("epost")]
    [JsonPropertyName("epost")]
    [Required]
    public string epost { get; set; }

    [XmlElement("modulvalg", Order = 4)]
    [JsonProperty("modulvalg")]
    [JsonPropertyName("modulvalg")]
    [Required]
    public string modulvalg { get; set; }

    [XmlElement("moduldef", Order = 5)]
    [JsonProperty("moduldef")]
    [JsonPropertyName("moduldef")]
    [Required]
    public string moduldef { get; set; }

  }
}
