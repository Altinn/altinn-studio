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

    [Range(0,Double.MaxValue)]
    [XmlElement("AntallAnsatte", Order = 5)]
    [JsonProperty("AntallAnsatte")]
    [JsonPropertyName("AntallAnsatte")]
    public decimal? AntallAnsatte { get; set; }

    public bool ShouldSerializeAntallAnsatte() => AntallAnsatte.HasValue;

    [XmlElement("Underenheter", Order = 6)]
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
    [XmlElement("ErIStatensVegvesen", Order = 1)]
    [JsonProperty("ErIStatensVegvesen")]
    [JsonPropertyName("ErIStatensVegvesen")]
    public bool? ErIStatensVegvesen { get; set; }

    public bool ShouldSerializeErIStatensVegvesen() => ErIStatensVegvesen.HasValue;

    [XmlElement("KunAnsvarligSkalArbeide", Order = 2)]
    [JsonProperty("KunAnsvarligSkalArbeide")]
    [JsonPropertyName("KunAnsvarligSkalArbeide")]
    public bool? KunAnsvarligSkalArbeide { get; set; }

    public bool ShouldSerializeKunAnsvarligSkalArbeide() => KunAnsvarligSkalArbeide.HasValue;

    [Range(0,Double.MaxValue)]
    [XmlElement("AntallAnsatteEgenUtfylt", Order = 3)]
    [JsonProperty("AntallAnsatteEgenUtfylt")]
    [JsonPropertyName("AntallAnsatteEgenUtfylt")]
    public decimal? AntallAnsatteEgenUtfylt { get; set; }

    public bool ShouldSerializeAntallAnsatteEgenUtfylt() => AntallAnsatteEgenUtfylt.HasValue;

    [Range(0,Double.MaxValue)]
    [XmlElement("AntallHMSKort", Order = 4)]
    [JsonProperty("AntallHMSKort")]
    [JsonPropertyName("AntallHMSKort")]
    public decimal? AntallHMSKort { get; set; }

    public bool ShouldSerializeAntallHMSKort() => AntallHMSKort.HasValue;

    [XmlElement("SkalUnderenheterJobbeMedBilpleie", Order = 5)]
    [JsonProperty("SkalUnderenheterJobbeMedBilpleie")]
    [JsonPropertyName("SkalUnderenheterJobbeMedBilpleie")]
    public bool? SkalUnderenheterJobbeMedBilpleie { get; set; }

    public bool ShouldSerializeSkalUnderenheterJobbeMedBilpleie() => SkalUnderenheterJobbeMedBilpleie.HasValue;

    [XmlElement("UnderenheterSomSkalBilpleie", Order = 6)]
    [JsonProperty("UnderenheterSomSkalBilpleie")]
    [JsonPropertyName("UnderenheterSomSkalBilpleie")]
    public string UnderenheterSomSkalBilpleie { get; set; }

    [XmlElement("OmfattetAvForurensingsforskriften", Order = 7)]
    [JsonProperty("OmfattetAvForurensingsforskriften")]
    [JsonPropertyName("OmfattetAvForurensingsforskriften")]
    public bool? OmfattetAvForurensingsforskriften { get; set; }

    public bool ShouldSerializeOmfattetAvForurensingsforskriften() => OmfattetAvForurensingsforskriften.HasValue;

    [XmlElement("UnderenheterOmfattetAvForurensingsforskriften", Order = 8)]
    [JsonProperty("UnderenheterOmfattetAvForurensingsforskriften")]
    [JsonPropertyName("UnderenheterOmfattetAvForurensingsforskriften")]
    public string UnderenheterOmfattetAvForurensingsforskriften { get; set; }

    [XmlElement("HarVerneombud", Order = 9)]
    [JsonProperty("HarVerneombud")]
    [JsonPropertyName("HarVerneombud")]
    public bool? HarVerneombud { get; set; }

    public bool ShouldSerializeHarVerneombud() => HarVerneombud.HasValue;

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("VerneombudNavn", Order = 10)]
    [JsonProperty("VerneombudNavn")]
    [JsonPropertyName("VerneombudNavn")]
    public string VerneombudNavn { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("VerneombudTelefonNr", Order = 11)]
    [JsonProperty("VerneombudTelefonNr")]
    [JsonPropertyName("VerneombudTelefonNr")]
    public string VerneombudTelefonNr { get; set; }

    [XmlElement("AlternativOrdning", Order = 12)]
    [JsonProperty("AlternativOrdning")]
    [JsonPropertyName("AlternativOrdning")]
    public bool? AlternativOrdning { get; set; }

    public bool ShouldSerializeAlternativOrdning() => AlternativOrdning.HasValue;

    [XmlElement("HarAMU", Order = 13)]
    [JsonProperty("HarAMU")]
    [JsonPropertyName("HarAMU")]
    public bool? HarAMU { get; set; }

    public bool ShouldSerializeHarAMU() => HarAMU.HasValue;

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("BHTorgnr", Order = 14)]
    [JsonProperty("BHTorgnr")]
    [JsonPropertyName("BHTorgnr")]
    public decimal? BHTorgnr { get; set; }

    public bool ShouldSerializeBHTorgnr() => BHTorgnr.HasValue;

    [XmlElement("Arbeidsavtaler", Order = 15)]
    [JsonProperty("Arbeidsavtaler")]
    [JsonPropertyName("Arbeidsavtaler")]
    public string Arbeidsavtaler { get; set; }

    [XmlElement("ErUtfyllerKontaktPerson", Order = 16)]
    [JsonProperty("ErUtfyllerKontaktPerson")]
    [JsonPropertyName("ErUtfyllerKontaktPerson")]
    public bool? ErUtfyllerKontaktPerson { get; set; }

    public bool ShouldSerializeErUtfyllerKontaktPerson() => ErUtfyllerKontaktPerson.HasValue;

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("KontaktPersonNavn", Order = 17)]
    [JsonProperty("KontaktPersonNavn")]
    [JsonPropertyName("KontaktPersonNavn")]
    public string KontaktPersonNavn { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("KontaktPersonEpost", Order = 18)]
    [JsonProperty("KontaktPersonEpost")]
    [JsonPropertyName("KontaktPersonEpost")]
    public string KontaktPersonEpost { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("KontaktPersonTelefonNr", Order = 19)]
    [JsonProperty("KontaktPersonTelefonNr")]
    [JsonPropertyName("KontaktPersonTelefonNr")]
    public string KontaktPersonTelefonNr { get; set; }

    [XmlElement("BekreftOpplysninger", Order = 20)]
    [JsonProperty("BekreftOpplysninger")]
    [JsonPropertyName("BekreftOpplysninger")]
    public bool? BekreftOpplysninger { get; set; }

    public bool ShouldSerializeBekreftOpplysninger() => BekreftOpplysninger.HasValue;

    [XmlElement("BekreftStraff", Order = 21)]
    [JsonProperty("BekreftStraff")]
    [JsonPropertyName("BekreftStraff")]
    public bool? BekreftStraff { get; set; }

    public bool ShouldSerializeBekreftStraff() => BekreftStraff.HasValue;

  }
}
