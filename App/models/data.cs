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
    [XmlElement("firstName", Order = 1)]
    [JsonProperty("firstName")]
    [JsonPropertyName("firstName")]
    public string firstName { get; set; }

    [XmlElement("lastName", Order = 2)]
    [JsonProperty("lastName")]
    [JsonPropertyName("lastName")]
    public string lastName { get; set; }

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("income", Order = 3)]
    [JsonProperty("income")]
    [JsonPropertyName("income")]
    [Required]
    public decimal? income { get; set; }

  }
}
