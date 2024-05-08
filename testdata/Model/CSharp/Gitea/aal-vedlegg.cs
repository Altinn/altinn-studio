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
  [XmlRoot(ElementName="vedlegg", Namespace="http://aal.kartverket.no/v1/modell")]
  public class vedlegg
  {
    [XmlElement("personid", Order = 1)]
    [JsonProperty("personid")]
    [JsonPropertyName("personid")]
    public string personid { get; set; }

    [XmlElement("personidtype", Order = 2)]
    [JsonProperty("personidtype")]
    [JsonPropertyName("personidtype")]
    public string personidtype { get; set; }

    [XmlElement("navn", Order = 3)]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    public Navn navn { get; set; }

    [XmlElement("soeknadsreferense", Order = 4)]
    [JsonProperty("soeknadsreferense")]
    [JsonPropertyName("soeknadsreferense")]
    public string soeknadsreferense { get; set; }

    [XmlElement("vedleggsbeskrivelse", Order = 5)]
    [JsonProperty("vedleggsbeskrivelse")]
    [JsonPropertyName("vedleggsbeskrivelse")]
    public string vedleggsbeskrivelse { get; set; }

    [XmlElement("innsendingsbekreftelse", Order = 6)]
    [JsonProperty("innsendingsbekreftelse")]
    [JsonPropertyName("innsendingsbekreftelse")]
    public string innsendingsbekreftelse { get; set; }

  }

  public class Navn
  {
    [XmlElement("fornavn", Order = 1)]
    [JsonProperty("fornavn")]
    [JsonPropertyName("fornavn")]
    public string fornavn { get; set; }

    [XmlElement("mellomnavn", Order = 2)]
    [JsonProperty("mellomnavn")]
    [JsonPropertyName("mellomnavn")]
    public string mellomnavn { get; set; }

    [XmlElement("etternavn", Order = 3)]
    [JsonProperty("etternavn")]
    [JsonPropertyName("etternavn")]
    public string etternavn { get; set; }

  }
}
