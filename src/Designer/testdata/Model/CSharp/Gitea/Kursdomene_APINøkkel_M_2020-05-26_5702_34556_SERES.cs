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
  public class APINoekkel_M
  {
    [XmlAttribute("dataFormatProvider")]
    [BindNever]
    public string dataFormatProvider { get; set; } = "SERES";

    [XmlAttribute("dataFormatId")]
    [BindNever]
    public string dataFormatId { get; set; } = "5702";

    [XmlAttribute("dataFormatVersion")]
    [BindNever]
    public string dataFormatVersion { get; set; } = "34556";

    [XmlElement("Applikasjon", Order = 1)]
    [JsonProperty("Applikasjon")]
    [JsonPropertyName("Applikasjon")]
    public Applikasjon Applikasjon { get; set; }

    [XmlElement("Produsent", Order = 2)]
    [JsonProperty("Produsent")]
    [JsonPropertyName("Produsent")]
    public Produsent Produsent { get; set; }

  }

  public class Applikasjon
  {
    [XmlElement("aPIRessurs", Order = 1)]
    [JsonProperty("aPIRessurs")]
    [JsonPropertyName("aPIRessurs")]
    public APIRessurs aPIRessurs { get; set; }

    [XmlElement("applikasjonNavn", Order = 2)]
    [JsonProperty("applikasjonNavn")]
    [JsonPropertyName("applikasjonNavn")]
    [Required]
    public string applikasjonNavn { get; set; }

    [XmlElement("applikasjonType", Order = 3)]
    [JsonProperty("applikasjonType")]
    [JsonPropertyName("applikasjonType")]
    [Required]
    public string applikasjonType { get; set; }

    [XmlElement("begrunnelse", Order = 4)]
    [JsonProperty("begrunnelse")]
    [JsonPropertyName("begrunnelse")]
    [Required]
    public string begrunnelse { get; set; }

    [XmlElement("beskrivelse", Order = 5)]
    [JsonProperty("beskrivelse")]
    [JsonPropertyName("beskrivelse")]
    [Required]
    public string beskrivelse { get; set; }

    [XmlElement("miljoe", Order = 6, IsNullable = true)]
    [JsonProperty("miljoe")]
    [JsonPropertyName("miljoe")]
    public string miljoe { get; set; }

    [XmlElement("nettleserApplikasjonWebadresse", Order = 7, IsNullable = true)]
    [JsonProperty("nettleserApplikasjonWebadresse")]
    [JsonPropertyName("nettleserApplikasjonWebadresse")]
    public string nettleserApplikasjonWebadresse { get; set; }

  }

  public class APIRessurs
  {
    [XmlElement("profile", Order = 1, IsNullable = true)]
    [JsonProperty("profile")]
    [JsonPropertyName("profile")]
    public string profile { get; set; }

    [XmlElement("organizationReportee", Order = 2, IsNullable = true)]
    [JsonProperty("organizationReportee")]
    [JsonPropertyName("organizationReportee")]
    public string organizationReportee { get; set; }

    [XmlElement("meldingsboks", Order = 3, IsNullable = true)]
    [JsonProperty("meldingsboks")]
    [JsonPropertyName("meldingsboks")]
    public string meldingsboks { get; set; }

    [XmlElement("lookup", Order = 4, IsNullable = true)]
    [JsonProperty("lookup")]
    [JsonPropertyName("lookup")]
    public string lookup { get; set; }

    [XmlElement("broker", Order = 5, IsNullable = true)]
    [JsonProperty("broker")]
    [JsonPropertyName("broker")]
    public string broker { get; set; }

    [XmlElement("autorisasjon", Order = 6, IsNullable = true)]
    [JsonProperty("autorisasjon")]
    [JsonPropertyName("autorisasjon")]
    public string autorisasjon { get; set; }

  }

  public class Produsent
  {
    [XmlElement("kontaktpersonEpost", Order = 1)]
    [JsonProperty("kontaktpersonEpost")]
    [JsonPropertyName("kontaktpersonEpost")]
    [Required]
    public string kontaktpersonEpost { get; set; }

    [XmlElement("kontaktpersonNavn", Order = 2)]
    [JsonProperty("kontaktpersonNavn")]
    [JsonPropertyName("kontaktpersonNavn")]
    [Required]
    public string kontaktpersonNavn { get; set; }

    [XmlElement("kontaktpersonTelefon", Order = 3)]
    [JsonProperty("kontaktpersonTelefon")]
    [JsonPropertyName("kontaktpersonTelefon")]
    [Required]
    public string kontaktpersonTelefon { get; set; }

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("organisasjonsEllerFoedselsNr", Order = 4)]
    [JsonProperty("organisasjonsEllerFoedselsNr")]
    [JsonPropertyName("organisasjonsEllerFoedselsNr")]
    [Required]
    public decimal? organisasjonsEllerFoedselsNr { get; set; }

    [XmlElement("produsentNavn", Order = 5)]
    [JsonProperty("produsentNavn")]
    [JsonPropertyName("produsentNavn")]
    [Required]
    public string produsentNavn { get; set; }

  }
}
