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
    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Organisasjonsnummer", Order = 1)]
    [JsonProperty("Organisasjonsnummer")]
    [JsonPropertyName("Organisasjonsnummer")]
    public string Organisasjonsnummer { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
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

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("InnloggetBruker", Order = 5)]
    [JsonProperty("InnloggetBruker")]
    [JsonPropertyName("InnloggetBruker")]
    public string InnloggetBruker { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Spraak", Order = 6)]
    [JsonProperty("Spraak")]
    [JsonPropertyName("Spraak")]
    public string Spraak { get; set; }

  }

  public class Adresse
  {
    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Gateadresse", Order = 1)]
    [JsonProperty("Gateadresse")]
    [JsonPropertyName("Gateadresse")]
    public string Gateadresse { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Postnr", Order = 2)]
    [JsonProperty("Postnr")]
    [JsonPropertyName("Postnr")]
    public string Postnr { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Poststed", Order = 3)]
    [JsonProperty("Poststed")]
    [JsonPropertyName("Poststed")]
    public string Poststed { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Land", Order = 4)]
    [JsonProperty("Land")]
    [JsonPropertyName("Land")]
    public string Land { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Landkode", Order = 5)]
    [JsonProperty("Landkode")]
    [JsonPropertyName("Landkode")]
    public string Landkode { get; set; }

  }

  public class Virksomhet
  {
    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Organisasjonsnummer", Order = 1)]
    [JsonProperty("Organisasjonsnummer")]
    [JsonPropertyName("Organisasjonsnummer")]
    public string Organisasjonsnummer { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Navn", Order = 2)]
    [JsonProperty("Navn")]
    [JsonPropertyName("Navn")]
    public string Navn { get; set; }

    [XmlElement("Adresse", Order = 3)]
    [JsonProperty("Adresse")]
    [JsonPropertyName("Adresse")]
    public Adresse Adresse { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Organisasjonsform", Order = 4)]
    [JsonProperty("Organisasjonsform")]
    [JsonPropertyName("Organisasjonsform")]
    public string Organisasjonsform { get; set; }

    [XmlElement("Underenheter", Order = 5)]
    [JsonProperty("Underenheter")]
    [JsonPropertyName("Underenheter")]
    public ArrayOfUnderenhet Underenheter { get; set; }

  }

  public class ArrayOfUnderenhet
  {
    [XmlElement("Underenhet", Order = 1)]
    [JsonProperty("Underenhet")]
    [JsonPropertyName("Underenhet")]
    public List<Underenhet> Underenhet { get; set; }

  }

  public class Underenhet
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Organisasjonsnummer", Order = 1)]
    [JsonProperty("Organisasjonsnummer")]
    [JsonPropertyName("Organisasjonsnummer")]
    public string Organisasjonsnummer { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Navn", Order = 2)]
    [JsonProperty("Navn")]
    [JsonPropertyName("Navn")]
    public string Navn { get; set; }

    [XmlElement("Adresse", Order = 3)]
    [JsonProperty("Adresse")]
    [JsonPropertyName("Adresse")]
    public Adresse Adresse { get; set; }

  }

  public class InnholdSkjema
  {
    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("AntallAnsatte", Order = 1)]
    [JsonProperty("AntallAnsatte")]
    [JsonPropertyName("AntallAnsatte")]
    public decimal? AntallAnsatte { get; set; }

    public bool ShouldSerializeAntallAnsatte() => AntallAnsatte.HasValue;

    [XmlElement("ASellerASAiHjemland", Order = 2)]
    [JsonProperty("ASellerASAiHjemland")]
    [JsonPropertyName("ASellerASAiHjemland")]
    public bool? ASellerASAiHjemland { get; set; }

    [XmlElement("BekreftRiktig", Order = 3)]
    [JsonProperty("BekreftRiktig")]
    [JsonPropertyName("BekreftRiktig")]
    public bool? BekreftRiktig { get; set; }

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("AnsatteInnen", Order = 4, IsNullable = true)]
    [JsonProperty("AnsatteInnen")]
    [JsonPropertyName("AnsatteInnen")]
    public string AnsatteInnen { get; set; }

    [XmlElement("FastRepresentant", Order = 5)]
    [JsonProperty("FastRepresentant")]
    [JsonPropertyName("FastRepresentant")]
    public FastRepresentant FastRepresentant { get; set; }

  }

  public class FastRepresentant
  {
    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Navn", Order = 1)]
    [JsonProperty("Navn")]
    [JsonPropertyName("Navn")]
    public string Navn { get; set; }

    [XmlElement("Adresse", Order = 2)]
    [JsonProperty("Adresse")]
    [JsonPropertyName("Adresse")]
    public Adresse Adresse { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Telefonnummer", Order = 3)]
    [JsonProperty("Telefonnummer")]
    [JsonPropertyName("Telefonnummer")]
    public string Telefonnummer { get; set; }

    [RegularExpression(@"[^@]+@[^\.]+\..+")]
    [XmlElement("Epost", Order = 4)]
    [JsonProperty("Epost")]
    [JsonPropertyName("Epost")]
    public string Epost { get; set; }

    [XmlElement("ErInformert", Order = 5)]
    [JsonProperty("ErInformert")]
    [JsonPropertyName("ErInformert")]
    public bool? ErInformert { get; set; }

  }
}
