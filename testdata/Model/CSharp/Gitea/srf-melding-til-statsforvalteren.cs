using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;
namespace Altinn.App.Models
{
  [XmlRoot(ElementName="skjema")]
  public class MeldingTilStatsforvalteren
  {
    [XmlElement("felles", Order = 1)]
    [JsonProperty("felles")]
    [JsonPropertyName("felles")]
    public Felles felles { get; set; }

    [XmlElement("skjemaSpesifikt", Order = 2)]
    [JsonProperty("skjemaSpesifikt")]
    [JsonPropertyName("skjemaSpesifikt")]
    public SkjemaSpesifikt skjemaSpesifikt { get; set; }

  }

  public class Felles
  {
    [XmlElement("innsenderPerson", Order = 1)]
    [JsonProperty("innsenderPerson")]
    [JsonPropertyName("innsenderPerson")]
    public InnsenderPerson innsenderPerson { get; set; }

    [XmlElement("innsenderOrganisasjon", Order = 2)]
    [JsonProperty("innsenderOrganisasjon")]
    [JsonPropertyName("innsenderOrganisasjon")]
    public InnsenderOrganisasjon innsenderOrganisasjon { get; set; }

    [XmlElement("hvemGjelderHenvendelsen", Order = 3)]
    [JsonProperty("hvemGjelderHenvendelsen")]
    [JsonPropertyName("hvemGjelderHenvendelsen")]
    public HvemGjelderHenvendelsen hvemGjelderHenvendelsen { get; set; }

    [XmlElement("hvorSkalHenvendelsenSendes", Order = 4)]
    [JsonProperty("hvorSkalHenvendelsenSendes")]
    [JsonPropertyName("hvorSkalHenvendelsenSendes")]
    public HvorSkalHenvendelsenSendes hvorSkalHenvendelsenSendes { get; set; }

  }

  public class InnsenderPerson
  {
    [XmlElement("navn", Order = 1)]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    public string navn { get; set; }

    [XmlElement("bostedsadresse", Order = 2)]
    [JsonProperty("bostedsadresse")]
    [JsonPropertyName("bostedsadresse")]
    public Adresse bostedsadresse { get; set; }

    [XmlElement("postadresse", Order = 3)]
    [JsonProperty("postadresse")]
    [JsonPropertyName("postadresse")]
    public Adresse postadresse { get; set; }

    [RegularExpression(@"^\S+@\S+\.[A-Za-z]{2,}$")]
    [XmlElement("epost", Order = 4)]
    [JsonProperty("epost")]
    [JsonPropertyName("epost")]
    public string epost { get; set; }

    [RegularExpression(@"[0-9]{11}")]
    [XmlElement("foedselsnummer", Order = 5)]
    [JsonProperty("foedselsnummer")]
    [JsonPropertyName("foedselsnummer")]
    public string foedselsnummer { get; set; }

    [RegularExpression(@"^([+]?(\d{8,15}))$")]
    [XmlElement("telefonnummer", Order = 6)]
    [JsonProperty("telefonnummer")]
    [JsonPropertyName("telefonnummer")]
    public string telefonnummer { get; set; }

  }

  public class Adresse
  {
    [XmlElement("adresse1", Order = 1)]
    [JsonProperty("adresse1")]
    [JsonPropertyName("adresse1")]
    public string adresse1 { get; set; }

    [XmlElement("adresse2", Order = 2)]
    [JsonProperty("adresse2")]
    [JsonPropertyName("adresse2")]
    public string adresse2 { get; set; }

    [XmlElement("postnummer", Order = 3)]
    [JsonProperty("postnummer")]
    [JsonPropertyName("postnummer")]
    public string postnummer { get; set; }

    [XmlElement("poststed", Order = 4)]
    [JsonProperty("poststed")]
    [JsonPropertyName("poststed")]
    public string poststed { get; set; }

    [XmlElement("land", Order = 5)]
    [JsonProperty("land")]
    [JsonPropertyName("land")]
    public string land { get; set; }

  }

  public class InnsenderOrganisasjon
  {
    [XmlElement("kontaktperson", Order = 1)]
    [JsonProperty("kontaktperson")]
    [JsonPropertyName("kontaktperson")]
    public string kontaktperson { get; set; }

    [XmlElement("organisasjonsnavn", Order = 2)]
    [JsonProperty("organisasjonsnavn")]
    [JsonPropertyName("organisasjonsnavn")]
    public string organisasjonsnavn { get; set; }

    [RegularExpression(@"[0-9]{9}")]
    [XmlElement("organisasjonsnummer", Order = 3)]
    [JsonProperty("organisasjonsnummer")]
    [JsonPropertyName("organisasjonsnummer")]
    public string organisasjonsnummer { get; set; }

    [XmlElement("postadresse", Order = 4)]
    [JsonProperty("postadresse")]
    [JsonPropertyName("postadresse")]
    public Adresse postadresse { get; set; }

    [XmlElement("forretningsadresse", Order = 5)]
    [JsonProperty("forretningsadresse")]
    [JsonPropertyName("forretningsadresse")]
    public Adresse forretningsadresse { get; set; }

    [RegularExpression(@"^\S+@\S+\.[A-Za-z]{2,}$")]
    [XmlElement("epost", Order = 6)]
    [JsonProperty("epost")]
    [JsonPropertyName("epost")]
    public string epost { get; set; }

    [RegularExpression(@"^([+]?(\d{8,15}))$")]
    [XmlElement("telefonnummer", Order = 7)]
    [JsonProperty("telefonnummer")]
    [JsonPropertyName("telefonnummer")]
    public string telefonnummer { get; set; }

  }

  public class HvemGjelderHenvendelsen
  {
    [XmlElement("navn", Order = 1)]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    public string navn { get; set; }

    [RegularExpression(@"[0-9]{11}")]
    [XmlElement("foedselsnummer", Order = 2)]
    [JsonProperty("foedselsnummer")]
    [JsonPropertyName("foedselsnummer")]
    public string foedselsnummer { get; set; }

    [RegularExpression(@"[0-9]{5,7}")]
    [XmlElement("saksId", Order = 3)]
    [JsonProperty("saksId")]
    [JsonPropertyName("saksId")]
    public string saksId { get; set; }

  }

  public class HvorSkalHenvendelsenSendes
  {
    [XmlElement("fylke", Order = 1)]
    [JsonProperty("fylke")]
    [JsonPropertyName("fylke")]
    public string fylke { get; set; }

  }

  public class SkjemaSpesifikt
  {
    [XmlElement("hvaGjelderHenvendelsen", Order = 1)]
    [JsonProperty("hvaGjelderHenvendelsen")]
    [JsonPropertyName("hvaGjelderHenvendelsen")]
    public HvaGjelderHenvendelsen hvaGjelderHenvendelsen { get; set; }

  }

  public class HvaGjelderHenvendelsen
  {
    [XmlElement("melding", Order = 1)]
    [JsonProperty("melding")]
    [JsonPropertyName("melding")]
    public string melding { get; set; }

    [XmlElement("emne", Order = 2)]
    [JsonProperty("emne")]
    [JsonPropertyName("emne")]
    public string emne { get; set; }

    [XmlElement("tema", Order = 3)]
    [JsonProperty("tema")]
    [JsonPropertyName("tema")]
    public string tema { get; set; }

  }
}
