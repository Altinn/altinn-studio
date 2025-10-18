#nullable disable
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;
namespace Altinn.App.Models.model
{
  [XmlRoot(ElementName="model")]
  public class model
  {
    [XmlElement("firstname", Order = 1)]
    [JsonProperty("firstname")]
    [JsonPropertyName("firstname")]
    public string firstname { get; set; }

    [XmlElement("lastname", Order = 2)]
    [JsonProperty("lastname")]
    [JsonPropertyName("lastname")]
    public string lastname { get; set; }

    [Range(0d, 99d)]
    [XmlElement("age", Order = 3)]
    [JsonProperty("age")]
    [JsonPropertyName("age")]
    [Required]
    public decimal? age { get; set; }

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("birthday", Order = 4)]
    [JsonProperty("birthday")]
    [JsonPropertyName("birthday")]
    public string birthday { get; set; }

    [XmlElement("emails", Order = 5)]
    [JsonProperty("emails")]
    [JsonPropertyName("emails")]
    public List<emails> emails { get; set; }

    [XmlElement("extra", Order = 6)]
    [JsonProperty("extra")]
    [JsonPropertyName("extra")]
    public string extra { get; set; }

    [XmlElement("feedback", Order = 7)]
    [JsonProperty("feedback")]
    [JsonPropertyName("feedback")]
    public string feedback { get; set; }

  }

  public class emails
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("email", Order = 1)]
    [JsonProperty("email")]
    [JsonPropertyName("email")]
    public string email { get; set; }

  }
}
