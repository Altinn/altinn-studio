using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;
namespace App.IntegrationTests.Mocks.Apps.Ttd.Abandon.Models
{
  [XmlRoot(ElementName="Simpel")]
  public class Skjema
  {
    [XmlElement("Felt1", Order = 1)]
    [JsonProperty("Felt1")]
    [JsonPropertyName("Felt1")]
    public string Felt1 { get; set; }

    [XmlElement("Felt2", Order = 2)]
    [JsonProperty("Felt2")]
    [JsonPropertyName("Felt2")]
    public string Felt2 { get; set; }

  }
}
