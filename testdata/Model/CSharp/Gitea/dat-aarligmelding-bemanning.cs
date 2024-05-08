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
  [XmlRoot(ElementName="Skjema")]
  public class Skjema
  {
    [XmlElement("Avsender", Order = 1)]
    [JsonProperty("Avsender")]
    [JsonPropertyName("Avsender")]
    public AvsenderAvSøknad Avsender { get; set; }

    [XmlElement("Virksomhet", Order = 2)]
    [JsonProperty("Virksomhet")]
    [JsonPropertyName("Virksomhet")]
    public Virksomhet Virksomhet { get; set; }

    [XmlElement("Innhold", Order = 3)]
    [JsonProperty("Innhold")]
    [JsonPropertyName("Innhold")]
    public InnholdSkjema Innhold { get; set; }

  }

  public class AvsenderAvSøknad
  {
    [XmlElement("Organisasjonsnummer", Order = 1)]
    [JsonProperty("Organisasjonsnummer")]
    [JsonPropertyName("Organisasjonsnummer")]
    public string Organisasjonsnummer { get; set; }

    [XmlElement("Navn", Order = 2)]
    [JsonProperty("Navn")]
    [JsonPropertyName("Navn")]
    public string Navn { get; set; }

    [XmlElement("Oppdragsfullmakt", Order = 3)]
    [JsonProperty("Oppdragsfullmakt")]
    [JsonPropertyName("Oppdragsfullmakt")]
    [Required]
    public bool? Oppdragsfullmakt { get; set; }

    [XmlElement("Adresse", Order = 4)]
    [JsonProperty("Adresse")]
    [JsonPropertyName("Adresse")]
    public Adresse Adresse { get; set; }

    [XmlElement("InnloggetBruker", Order = 5)]
    [JsonProperty("InnloggetBruker")]
    [JsonPropertyName("InnloggetBruker")]
    public string InnloggetBruker { get; set; }

    [XmlElement("Spraak", Order = 6)]
    [JsonProperty("Spraak")]
    [JsonPropertyName("Spraak")]
    public string Spraak { get; set; }

  }

  public class Adresse
  {
    [XmlElement("Gateadresse", Order = 1)]
    [JsonProperty("Gateadresse")]
    [JsonPropertyName("Gateadresse")]
    public string Gateadresse { get; set; }

    [XmlElement("Postnr", Order = 2)]
    [JsonProperty("Postnr")]
    [JsonPropertyName("Postnr")]
    public string Postnr { get; set; }

    [XmlElement("Poststed", Order = 3)]
    [JsonProperty("Poststed")]
    [JsonPropertyName("Poststed")]
    public string Poststed { get; set; }

    [XmlElement("Land", Order = 4)]
    [JsonProperty("Land")]
    [JsonPropertyName("Land")]
    public string Land { get; set; }

    [XmlElement("Landkode", Order = 5)]
    [JsonProperty("Landkode")]
    [JsonPropertyName("Landkode")]
    public string Landkode { get; set; }

  }

  public class Virksomhet
  {
    [XmlElement("Organisasjonsnummer", Order = 1)]
    [JsonProperty("Organisasjonsnummer")]
    [JsonPropertyName("Organisasjonsnummer")]
    public string Organisasjonsnummer { get; set; }

    [XmlElement("Navn", Order = 2)]
    [JsonProperty("Navn")]
    [JsonPropertyName("Navn")]
    public string Navn { get; set; }

    [XmlElement("Adresse", Order = 3)]
    [JsonProperty("Adresse")]
    [JsonPropertyName("Adresse")]
    public Adresse Adresse { get; set; }

    [XmlElement("Organisasjonsform", Order = 4)]
    [JsonProperty("Organisasjonsform")]
    [JsonPropertyName("Organisasjonsform")]
    public string Organisasjonsform { get; set; }

  }

  public class InnholdSkjema
  {
    [XmlElement("MeldingTilArbeidstilsynet", Order = 1)]
    [JsonProperty("MeldingTilArbeidstilsynet")]
    [JsonPropertyName("MeldingTilArbeidstilsynet")]
    public string MeldingTilArbeidstilsynet { get; set; }

  }
}
