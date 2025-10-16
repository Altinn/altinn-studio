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
  [XmlRoot(ElementName="data")]
  public class data
  {
    [XmlElement("form", Order = 1)]
    [JsonProperty("form")]
    [JsonPropertyName("form")]
    public form form { get; set; }

  }

  public class form
  {
    [XmlElement("name", Order = 1)]
    [JsonProperty("name")]
    [JsonPropertyName("name")]
    public string name { get; set; }

    [MinLength(9)]
    [MaxLength(9)]
    [RegularExpression(@"^\d*$")]
    [XmlElement("orgNumber", Order = 2)]
    [JsonProperty("orgNumber")]
    [JsonPropertyName("orgNumber")]
    public string orgNumber { get; set; }

    [Range(2000d, Double.MaxValue)]
    [XmlElement("year", Order = 3)]
    [JsonProperty("year")]
    [JsonPropertyName("year")]
    [Required]
    public decimal? year { get; set; }

    [Range(0d, Double.MaxValue)]
    [XmlElement("income", Order = 4)]
    [JsonProperty("income")]
    [JsonPropertyName("income")]
    [Required]
    public decimal? income { get; set; }

    [XmlElement("sources", Order = 5)]
    [JsonProperty("sources")]
    [JsonPropertyName("sources")]
    public List<sources> sources { get; set; }

  }

  public class sources
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("type", Order = 1)]
    [JsonProperty("type")]
    [JsonPropertyName("type")]
    public string type { get; set; }

  }
}
