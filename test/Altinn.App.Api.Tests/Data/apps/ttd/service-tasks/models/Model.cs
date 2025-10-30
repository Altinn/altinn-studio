#nullable disable
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;

namespace Altinn.App.Models.model;

[XmlRoot(ElementName = "Model")]
public class Model
{
    [XmlElement("Navn", Order = 1)]
    [JsonProperty(nameof(Navn))]
    [JsonPropertyName(nameof(Navn))]
    public string Navn { get; set; }
}
