#nullable disable
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;
namespace Altinn.App.Models.subform
{
  [XmlRoot(ElementName="subform")]
  public class subform
  {
    [XmlElement("registrationnumber", Order = 1)]
    [JsonProperty("registrationnumber")]
    [JsonPropertyName("registrationnumber")]
    public string registrationnumber { get; set; }

    [XmlElement("modelyear", Order = 2)]
    [JsonProperty("modelyear")]
    [JsonPropertyName("modelyear")]
    public string modelyear { get; set; }

    [XmlElement("brand", Order = 3)]
    [JsonProperty("brand")]
    [JsonPropertyName("brand")]
    public string brand { get; set; }

  }
}
