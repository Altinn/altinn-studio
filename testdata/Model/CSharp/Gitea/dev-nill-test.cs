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
  [XmlRoot(ElementName="modell")]
  public class modell
  {
    [XmlElement("element", Order = 1)]
    [JsonProperty("element")]
    [JsonPropertyName("element")]
    public ModelType element { get; set; }

  }

  public class ModelType
  {
    [XmlElement("nonNillableRef", Order = 1)]
    [JsonProperty("nonNillableRef")]
    [JsonPropertyName("nonNillableRef")]
    public bool? nonNillableRef { get; set; }

    public bool ShouldSerializenonNillableRef() => nonNillableRef.HasValue;

    [XmlElement("nillableRef", Order = 2)]
    [JsonProperty("nillableRef")]
    [JsonPropertyName("nillableRef")]
    public bool? nillableRef { get; set; }

    [XmlElement("nonNillableBoolean", Order = 3)]
    [JsonProperty("nonNillableBoolean")]
    [JsonPropertyName("nonNillableBoolean")]
    public bool? nonNillableBoolean { get; set; }

    public bool ShouldSerializenonNillableBoolean() => nonNillableBoolean.HasValue;

    [XmlElement("nillableBoolean", Order = 4)]
    [JsonProperty("nillableBoolean")]
    [JsonPropertyName("nillableBoolean")]
    public bool? nillableBoolean { get; set; }

    [XmlElement("s1", Order = 5)]
    [JsonProperty("s1")]
    [JsonPropertyName("s1")]
    public string s1 { get; set; }

  }
}
