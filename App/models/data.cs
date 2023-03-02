using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
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

    [Range(2000, 2022)]
    [XmlElement("year", Order = 3)]
    [JsonProperty("year")]
    [JsonPropertyName("year")]
    [Required]
    public decimal? year { get; set; }

    [Range(0,Double.MaxValue)]
    [XmlElement("income", Order = 4)]
    [JsonProperty("income")]
    [JsonPropertyName("income")]
    [Required]
    public decimal? income { get; set; }

  }
}
