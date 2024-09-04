#nullable disable
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;
<<<<<<< HEAD
namespace Altinn.App.Models.model
{
  [XmlRoot(ElementName="model")]
  public class model
  {
    [XmlElement("biler", Order = 1)]
    [JsonProperty("biler")]
    [JsonPropertyName("biler")]
    public biler biler { get; set; }

  }

  public class biler
  {
    [XmlElement("bil", Order = 1)]
    [JsonProperty("bil")]
    [JsonPropertyName("bil")]
    public bil bil { get; set; }

  }

  public class bil
  {
    [XmlElement("registreringsnummer", Order = 1)]
    [JsonProperty("registreringsnummer")]
    [JsonPropertyName("registreringsnummer")]
    public string registreringsnummer { get; set; }

    [XmlElement("merke", Order = 2)]
    [JsonProperty("merke")]
    [JsonPropertyName("merke")]
    public string merke { get; set; }

    [XmlElement("modell", Order = 3)]
    [JsonProperty("modell")]
    [JsonPropertyName("modell")]
    public string modell { get; set; }

  }
=======

namespace Altinn.App.Models.model
{
    [XmlRoot(ElementName = "model")]
    public class model
    {
        [XmlElement("Navn", Order = 1)]
        [JsonProperty("Navn")]
        [JsonPropertyName("Navn")]
        public string Navn { get; set; }

        [Range(Double.MinValue, Double.MaxValue)]
        [XmlElement("Alder", Order = 2)]
        [JsonProperty("Alder")]
        [JsonPropertyName("Alder")]
        public decimal? Alder { get; set; }

        [XmlElement("AttachmentId", Order = 3)]
        [JsonProperty("AttachmentId")]
        [JsonPropertyName("AttachmentId")]
        public List<string> AttachmentId { get; set; }

        public bool ShouldSerializeAlder() => Alder.HasValue;
    }
>>>>>>> master
}
