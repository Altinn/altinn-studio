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
    [XmlRoot(ElementName="melding")]
    public class RootModel
    {
        [XmlElement("informasjonstype", Order = 1)]
        [JsonProperty("informasjonstype")]
        [JsonPropertyName("informasjonstype")]
        public List<string> informasjonstype { get; set; }

    }
}
