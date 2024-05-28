#nullable disable
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;
namespace Altinn.App.Models.modell3
{
  [XmlRoot(ElementName="modell3")]
  public class modell3
  {
    [XmlElement("tekstfelt", Order = 1)]
    [JsonProperty("tekstfelt")]
    [JsonPropertyName("tekstfelt")]
    public string tekstfelt { get; set; }

    [XmlElement("kontaktinfo", Order = 2)]
    [JsonProperty("kontaktinfo")]
    [JsonPropertyName("kontaktinfo")]
    public List<kontaktinfo> kontaktinfo { get; set; }

  }

  public class kontaktinfo
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("epost", Order = 1)]
    [JsonProperty("epost")]
    [JsonPropertyName("epost")]
    public string epost { get; set; }

    [XmlElement("mobilnummer", Order = 2)]
    [JsonProperty("mobilnummer")]
    [JsonPropertyName("mobilnummer")]
    public string mobilnummer { get; set; }

  }
}
