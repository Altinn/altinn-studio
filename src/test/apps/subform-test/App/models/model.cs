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
    [XmlElement("Navn", Order = 1)]
    [JsonProperty("Navn")]
    [JsonPropertyName("Navn")]
    public string Navn { get; set; }

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("Alder", Order = 2)]
    [JsonProperty("Alder")]
    [JsonPropertyName("Alder")]
    [Required]
    public decimal? Alder { get; set; }

    [XmlElement("AttachmentId", Order = 3)]
    [JsonProperty("AttachmentId")]
    [JsonPropertyName("AttachmentId")]
    public List<string> AttachmentId { get; set; }

    [XmlElement("AttachmentName", Order = 4)]
    [JsonProperty("AttachmentName")]
    [JsonPropertyName("AttachmentName")]
    public List<string> AttachmentName { get; set; }

    [XmlElement("AttachmentIdJoined", Order = 5)]
    [JsonProperty("AttachmentIdJoined")]
    [JsonPropertyName("AttachmentIdJoined")]
    public string AttachmentIdJoined { get; set; }

    [XmlElement("AttachmentNameJoined", Order = 6)]
    [JsonProperty("AttachmentNameJoined")]
    [JsonPropertyName("AttachmentNameJoined")]
    public string AttachmentNameJoined { get; set; }

  }
}
