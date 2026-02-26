#nullable disable
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;

namespace Altinn.App.Models.Moped
{
    [XmlRoot(ElementName = "Moped")]
    public class Moped
    {
        [XmlElement("RegNo", Order = 1)]
        [JsonProperty("RegNo")]
        [JsonPropertyName("RegNo")]
        public string RegNo { get; set; }

        [XmlElement("Merke", Order = 2)]
        [JsonProperty("Merke")]
        [JsonPropertyName("Merke")]
        public string Merke { get; set; }

        [XmlElement("Modell", Order = 3)]
        [JsonProperty("Modell")]
        [JsonPropertyName("Modell")]
        public string Modell { get; set; }

        [XmlElement("EkstraInfoCheck", Order = 4)]
        [JsonProperty("EkstraInfoCheck")]
        [JsonPropertyName("EkstraInfoCheck")]
        public bool EkstraInfoCheck { get; set; }

        [XmlElement("EkstraInfoData", Order = 5)]
        [JsonProperty("EkstraInfoData")]
        [JsonPropertyName("EkstraInfoData")]
        public string EkstraInfoData { get; set; }

        [Range(Double.MinValue, Double.MaxValue)]
        [XmlElement("Produksjonsaar", Order = 6)]
        [JsonProperty("Produksjonsaar")]
        [JsonPropertyName("Produksjonsaar")]
        [Required]
        public decimal? Produksjonsaar { get; set; }
    }
}
