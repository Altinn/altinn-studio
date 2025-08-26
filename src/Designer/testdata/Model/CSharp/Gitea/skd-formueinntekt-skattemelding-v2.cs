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
  [XmlRoot(ElementName="skattemeldingApp", Namespace="urn:no:skatteetaten:fastsetting:formueinntekt:skattemeldingsapp:v2")]
  public class SkattemeldingApp
  {
    [RegularExpression(@"^[0-9]{4}$")]
    [XmlElement("inntektsaar", Order = 1)]
    [JsonProperty("inntektsaar")]
    [JsonPropertyName("inntektsaar")]
    public string inntektsaar { get; set; }

  }
}
