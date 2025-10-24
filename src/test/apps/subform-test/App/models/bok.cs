#nullable disable
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;

namespace Altinn.App.Models.Bok
{
    [XmlRoot(ElementName = "Bok")]
    public class Bok
    {
        [XmlElement("Tittel", Order = 1)]
        [JsonProperty("Tittel")]
        [JsonPropertyName("Tittel")]
        public string Tittel { get; set; }

        [XmlElement("Forfatter", Order = 2)]
        [JsonProperty("Forfatter")]
        [JsonPropertyName("Forfatter")]
        public string Forfatter { get; set; }

        [XmlElement("Serie", Order = 3)]
        [JsonProperty("Serie")]
        [JsonPropertyName("Serie")]
        public string Serie { get; set; }

        [Range(Double.MinValue, Double.MaxValue)]
        [XmlElement("Publikasjonsaar", Order = 4)]
        [JsonProperty("Publikasjonsaar")]
        [JsonPropertyName("Publikasjonsaar")]
        [Required]
        public decimal? Publikasjonsaar { get; set; }
    }
}
