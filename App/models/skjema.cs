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
  [XmlRoot(ElementName="skjema")]
  public class skjema
  {
    [XmlElement("root", Order = 1)]
    [JsonProperty("root")]
    [JsonPropertyName("root")]
    public root root { get; set; }

  }

  public class root
  {
    [XmlElement("fornavn", Order = 1)]
    [JsonProperty("fornavn")]
    [JsonPropertyName("fornavn")]
    public string fornavn { get; set; }

    [XmlElement("etternavn", Order = 2)]
    [JsonProperty("etternavn")]
    [JsonPropertyName("etternavn")]
    public string etternavn { get; set; }

    [Range(15d, 76d)]
    [XmlElement("alder", Order = 3)]
    [JsonProperty("alder")]
    [JsonPropertyName("alder")]
    public decimal? alder { get; set; }

    public bool ShouldSerializealder() => alder.HasValue;

    [XmlElement("arbeidserfaring", Order = 4)]
    [JsonProperty("arbeidserfaring")]
    [JsonPropertyName("arbeidserfaring")]
    public List<arbeidserfaring> arbeidserfaring { get; set; }

    [XmlElement("epost", Order = 5)]
    [JsonProperty("epost")]
    [JsonPropertyName("epost")]
    public string epost { get; set; }

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("telefonnummer", Order = 6)]
    [JsonProperty("telefonnummer")]
    [JsonPropertyName("telefonnummer")]
    public decimal? telefonnummer { get; set; }

    public bool ShouldSerializetelefonnummer() => telefonnummer.HasValue;

    [XmlElement("bosted", Order = 7)]
    [JsonProperty("bosted")]
    [JsonPropertyName("bosted")]
    public string bosted { get; set; }

    [XmlElement("kjonn", Order = 8)]
    [JsonProperty("kjonn")]
    [JsonPropertyName("kjonn")]
    public string kjonn { get; set; }

    [XmlElement("SF_skjul-felter", Order = 9)]
    [JsonProperty("SF_skjul-felter")]
    [JsonPropertyName("SF_skjul-felter")]
    public string SF_skjulfelter { get; set; }

    [XmlElement("SF_skjul-arbeidsgiver", Order = 10)]
    [JsonProperty("SF_skjul-arbeidsgiver")]
    [JsonPropertyName("SF_skjul-arbeidsgiver")]
    public string SF_skjularbeidsgiver { get; set; }

    [XmlElement("SF_skjul-prosjekt", Order = 11)]
    [JsonProperty("SF_skjul-prosjekt")]
    [JsonPropertyName("SF_skjul-prosjekt")]
    public string SF_skjulprosjekt { get; set; }

    [XmlElement("vedlegg", Order = 12)]
    [JsonProperty("vedlegg")]
    [JsonPropertyName("vedlegg")]
    public List<string> vedlegg { get; set; }

  }

  public class arbeidserfaring
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("arbeidsgiver", Order = 1)]
    [JsonProperty("arbeidsgiver")]
    [JsonPropertyName("arbeidsgiver")]
    public string arbeidsgiver { get; set; }

    [XmlElement("fortsattAnsatt", Order = 2)]
    [JsonProperty("fortsattAnsatt")]
    [JsonPropertyName("fortsattAnsatt")]
    public bool? fortsattAnsatt { get; set; }

    public bool ShouldSerializefortsattAnsatt() => fortsattAnsatt.HasValue;

    [XmlElement("fra", Order = 3)]
    [JsonProperty("fra")]
    [JsonPropertyName("fra")]
    public string fra { get; set; }

    [XmlElement("til", Order = 4)]
    [JsonProperty("til")]
    [JsonPropertyName("til")]
    public string til { get; set; }

    [XmlElement("stilling", Order = 5)]
    [JsonProperty("stilling")]
    [JsonPropertyName("stilling")]
    public string stilling { get; set; }

    [XmlElement("beskrivelse", Order = 6)]
    [JsonProperty("beskrivelse")]
    [JsonPropertyName("beskrivelse")]
    public string beskrivelse { get; set; }

    [XmlElement("prosjekter", Order = 7)]
    [JsonProperty("prosjekter")]
    [JsonPropertyName("prosjekter")]
    public List<prosjekter> prosjekter { get; set; }

    [XmlElement("vedlegg", Order = 8)]
    [JsonProperty("vedlegg")]
    [JsonPropertyName("vedlegg")]
    public List<string> vedlegg { get; set; }

  }

  public class prosjekter
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [MaxLength(32)]
    [XmlElement("tittel", Order = 1)]
    [JsonProperty("tittel")]
    [JsonPropertyName("tittel")]
    public string tittel { get; set; }

    [XmlElement("beskrivelse", Order = 2)]
    [JsonProperty("beskrivelse")]
    [JsonPropertyName("beskrivelse")]
    public string beskrivelse { get; set; }

  }
}
