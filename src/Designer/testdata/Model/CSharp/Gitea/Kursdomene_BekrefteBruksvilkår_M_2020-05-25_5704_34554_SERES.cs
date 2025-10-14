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
  [XmlRoot(ElementName="melding")]
  public class BekrefteBruksvilkaar_M
  {
    [XmlAttribute("dataFormatProvider")]
    [BindNever]
    public string dataFormatProvider { get; set; } = "SERES";

    [XmlAttribute("dataFormatId")]
    [BindNever]
    public string dataFormatId { get; set; } = "5704";

    [XmlAttribute("dataFormatVersion")]
    [BindNever]
    public string dataFormatVersion { get; set; } = "34554";

    [XmlElement("Tjenesteeier", Order = 1)]
    [JsonProperty("Tjenesteeier")]
    [JsonPropertyName("Tjenesteeier")]
    public Tjenesteeier Tjenesteeier { get; set; }

    [XmlElement("Vilkaar", Order = 2)]
    [JsonProperty("Vilkaar")]
    [JsonPropertyName("Vilkaar")]
    public Vilkaar Vilkaar { get; set; }

  }

  public class Tjenesteeier
  {
    [XmlElement("navn", Order = 1)]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    [Required]
    public string navn { get; set; }

    [RegularExpression(@"[0-9]{9}")]
    [XmlElement("organisasjonsnummer", Order = 2)]
    [JsonProperty("organisasjonsnummer")]
    [JsonPropertyName("organisasjonsnummer")]
    [Required]
    public string organisasjonsnummer { get; set; }

    [XmlElement("navnPaaGodkjenner", Order = 3)]
    [JsonProperty("navnPaaGodkjenner")]
    [JsonPropertyName("navnPaaGodkjenner")]
    [Required]
    public string navnPaaGodkjenner { get; set; }

  }

  public class Vilkaar
  {
    [XmlElement("harGjortRisikovurdering", Order = 1)]
    [JsonProperty("harGjortRisikovurdering")]
    [JsonPropertyName("harGjortRisikovurdering")]
    [Required]
    public bool? harGjortRisikovurdering { get; set; }

    [XmlElement("harGjortPersonvernUtredning", Order = 2)]
    [JsonProperty("harGjortPersonvernUtredning")]
    [JsonPropertyName("harGjortPersonvernUtredning")]
    [Required]
    public bool? harGjortPersonvernUtredning { get; set; }

    [XmlElement("godtarOppdatertDatabehandleravtale", Order = 3)]
    [JsonProperty("godtarOppdatertDatabehandleravtale")]
    [JsonPropertyName("godtarOppdatertDatabehandleravtale")]
    [Required]
    public bool? godtarOppdatertDatabehandleravtale { get; set; }

    [XmlElement("godtarTjenestenivaaOgAnsvarsfordeling", Order = 4)]
    [JsonProperty("godtarTjenestenivaaOgAnsvarsfordeling")]
    [JsonPropertyName("godtarTjenestenivaaOgAnsvarsfordeling")]
    [Required]
    public bool? godtarTjenestenivaaOgAnsvarsfordeling { get; set; }

  }
}
