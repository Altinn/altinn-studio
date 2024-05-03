using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;
namespace Altinn.App.Models.modell2
{
  [XmlRoot(ElementName="modell2")]
  public class modell2
  {
    [MaxLength(10)]
    [XmlElement("tekstfelt", Order = 1)]
    [JsonProperty("tekstfelt")]
    [JsonPropertyName("tekstfelt")]
    public string tekstfelt { get; set; }

    [XmlElement("postnummer", Order = 2)]
    [JsonProperty("postnummer")]
    [JsonPropertyName("postnummer")]
    public string postnummer { get; set; }

    [XmlElement("sektor", Order = 3)]
    [JsonProperty("sektor")]
    [JsonPropertyName("sektor")]
    public string sektor { get; set; }

    [XmlElement("personer", Order = 4)]
    [JsonProperty("personer")]
    [JsonPropertyName("personer")]
    public List<personer> personer { get; set; }

    [XmlElement("questions", Order = 5)]
    [JsonProperty("questions")]
    [JsonPropertyName("questions")]
    public List<questions> questions { get; set; }

    [XmlElement("randomchar", Order = 6)]
    [JsonProperty("randomchar")]
    [JsonPropertyName("randomchar")]
    public string randomchar { get; set; }

  }

  public class personer
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId()
    {
      return AltinnRowId != default;
    }

    [XmlElement("fornavn", Order = 1)]
    [JsonProperty("fornavn")]
    [JsonPropertyName("fornavn")]
    public string fornavn { get; set; }

    [XmlElement("etternavn", Order = 2)]
    [JsonProperty("etternavn")]
    [JsonPropertyName("etternavn")]
    public string etternavn { get; set; }

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("alder", Order = 3)]
    [JsonProperty("alder")]
    [JsonPropertyName("alder")]
    public decimal? alder { get; set; }

    public bool ShouldSerializealder()
    {
      return alder.HasValue;
    }

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("fødselsdato", Order = 4)]
    [JsonProperty("fødselsdato")]
    [JsonPropertyName("fødselsdato")]
    public string fødselsdato { get; set; }

  }

  public class questions
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId()
    {
      return AltinnRowId != default;
    }

    [XmlElement("Id", Order = 1)]
    [JsonProperty("Id")]
    [JsonPropertyName("Id")]
    public string Id { get; set; }

    [XmlElement("Answer", Order = 2)]
    [JsonProperty("Answer")]
    [JsonPropertyName("Answer")]
    public string Answer { get; set; }

  }
}
