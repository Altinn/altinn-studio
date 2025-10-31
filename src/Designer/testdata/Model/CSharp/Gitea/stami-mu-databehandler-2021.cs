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
  [XmlRoot(ElementName="DataBehandler", Namespace="https://aip.stami.no/dataAgreement.xsd")]
  public class DataBehandler
  {
    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("userId", Order = 1)]
    [JsonProperty("userId")]
    [JsonPropertyName("userId")]
    [Required]
    public decimal? userId { get; set; }

    [XmlElement("signatorNavn", Order = 2)]
    [JsonProperty("signatorNavn")]
    [JsonPropertyName("signatorNavn")]
    [Required]
    public string signatorNavn { get; set; }

    [XmlElement("organisasjonsnummer", Order = 3)]
    [JsonProperty("organisasjonsnummer")]
    [JsonPropertyName("organisasjonsnummer")]
    [Required]
    public string organisasjonsnummer { get; set; }

    [XmlElement("organisasjonsnavn", Order = 4)]
    [JsonProperty("organisasjonsnavn")]
    [JsonPropertyName("organisasjonsnavn")]
    [Required]
    public string organisasjonsnavn { get; set; }

    [XmlElement("agreementCheckbox", Order = 5)]
    [JsonProperty("agreementCheckbox")]
    [JsonPropertyName("agreementCheckbox")]
    [Required]
    public string agreementCheckbox { get; set; }

    [XmlElement("authorizedCheckbox", Order = 6)]
    [JsonProperty("authorizedCheckbox")]
    [JsonPropertyName("authorizedCheckbox")]
    [Required]
    public string authorizedCheckbox { get; set; }

    [XmlElement("contactEmail", Order = 7)]
    [JsonProperty("contactEmail")]
    [JsonPropertyName("contactEmail")]
    public string contactEmail { get; set; }

  }
}
