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
    [MaxLength(50)]
    [XmlElement("Organisasjonsnummer", Order = 1)]
    [JsonProperty("Organisasjonsnummer")]
    [JsonPropertyName("Organisasjonsnummer")]
    [Required]
    public string Organisasjonsnummer { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Navn", Order = 2)]
    [JsonProperty("Navn")]
    [JsonPropertyName("Navn")]
    [Required]
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
    [Required]
    public string InnloggetBruker { get; set; }

  }

  public class Adresse
  {
    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Gateadresse", Order = 1)]
    [JsonProperty("Gateadresse")]
    [JsonPropertyName("Gateadresse")]
    [Required]
    public string Gateadresse { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Postnr", Order = 2)]
    [JsonProperty("Postnr")]
    [JsonPropertyName("Postnr")]
    [Required]
    public string Postnr { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Poststed", Order = 3)]
    [JsonProperty("Poststed")]
    [JsonPropertyName("Poststed")]
    [Required]
    public string Poststed { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Land", Order = 4)]
    [JsonProperty("Land")]
    [JsonPropertyName("Land")]
    public string Land { get; set; }

    [MinLength(0)]
    [MaxLength(50)]
    [XmlElement("Landkode", Order = 5)]
    [JsonProperty("Landkode")]
    [JsonPropertyName("Landkode")]
    public string Landkode { get; set; }

    [MinLength(0)]
    [MaxLength(50)]
    [XmlElement("Gardsnummer", Order = 6)]
    [JsonProperty("Gardsnummer")]
    [JsonPropertyName("Gardsnummer")]
    public string Gardsnummer { get; set; }

    [MinLength(0)]
    [MaxLength(50)]
    [XmlElement("Bruksnummer", Order = 7)]
    [JsonProperty("Bruksnummer")]
    [JsonPropertyName("Bruksnummer")]
    public string Bruksnummer { get; set; }

    [MinLength(0)]
    [MaxLength(50)]
    [XmlElement("Bygningsnummer", Order = 8)]
    [JsonProperty("Bygningsnummer")]
    [JsonPropertyName("Bygningsnummer")]
    public string Bygningsnummer { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Bruksenhetsnummer", Order = 9)]
    [JsonProperty("Bruksenhetsnummer")]
    [JsonPropertyName("Bruksenhetsnummer")]
    public string Bruksenhetsnummer { get; set; }

    [MinLength(0)]
    [MaxLength(50)]
    [XmlElement("Kommunenummer", Order = 10)]
    [JsonProperty("Kommunenummer")]
    [JsonPropertyName("Kommunenummer")]
    public string Kommunenummer { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Kommune", Order = 11)]
    [JsonProperty("Kommune")]
    [JsonPropertyName("Kommune")]
    public string Kommune { get; set; }

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

    [XmlElement("NorskRepresentant", Order = 6)]
    [JsonProperty("NorskRepresentant")]
    [JsonPropertyName("NorskRepresentant")]
    public NorskRepresentant NorskRepresentant { get; set; }

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
    [MaxLength(50)]
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

  public class NorskRepresentant
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

  }

  public class InnholdSkjema
  {
    [XmlElement("Innkvarteringsadresse", Order = 1)]
    [JsonProperty("Innkvarteringsadresse")]
    [JsonPropertyName("Innkvarteringsadresse")]
    public Adresse Innkvarteringsadresse { get; set; }

    [XmlElement("ErBrakkerigg", Order = 2)]
    [JsonProperty("ErBrakkerigg")]
    [JsonPropertyName("ErBrakkerigg")]
    public bool? ErBrakkerigg { get; set; }

    [XmlElement("MobilBoenhet", Order = 3)]
    [JsonProperty("MobilBoenhet")]
    [JsonPropertyName("MobilBoenhet")]
    public bool? MobilBoenhet { get; set; }

    [Range(1d, 999d)]
    [XmlElement("AntallEnerom", Order = 4)]
    [JsonProperty("AntallEnerom")]
    [JsonPropertyName("AntallEnerom")]
    public decimal? AntallEnerom { get; set; }

    public bool ShouldSerializeAntallEnerom() => AntallEnerom.HasValue;

    [XmlElement("AlleRomHarBadOgToalett", Order = 5)]
    [JsonProperty("AlleRomHarBadOgToalett")]
    [JsonPropertyName("AlleRomHarBadOgToalett")]
    public bool? AlleRomHarBadOgToalett { get; set; }

    [XmlElement("TvEllerInternett", Order = 6)]
    [JsonProperty("TvEllerInternett")]
    [JsonPropertyName("TvEllerInternett")]
    public bool? TvEllerInternett { get; set; }

    [Range(0d, 999d)]
    [XmlElement("AntallRomMedKjokken", Order = 7)]
    [JsonProperty("AntallRomMedKjokken")]
    [JsonPropertyName("AntallRomMedKjokken")]
    public decimal? AntallRomMedKjokken { get; set; }

    public bool ShouldSerializeAntallRomMedKjokken() => AntallRomMedKjokken.HasValue;

    [XmlElement("TilbysMatservering", Order = 8)]
    [JsonProperty("TilbysMatservering")]
    [JsonPropertyName("TilbysMatservering")]
    public bool? TilbysMatservering { get; set; }

    [MinLength(0)]
    [MaxLength(50)]
    [XmlElement("SoknadForelagtTillitsvalgt", Order = 9)]
    [JsonProperty("SoknadForelagtTillitsvalgt")]
    [JsonPropertyName("SoknadForelagtTillitsvalgt")]
    public string SoknadForelagtTillitsvalgt { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("KontaktpersonNavn", Order = 10)]
    [JsonProperty("KontaktpersonNavn")]
    [JsonPropertyName("KontaktpersonNavn")]
    public string KontaktpersonNavn { get; set; }

    [MinLength(0)]
    [MaxLength(50)]
    [XmlElement("KontaktpersonTelefon", Order = 11)]
    [JsonProperty("KontaktpersonTelefon")]
    [JsonPropertyName("KontaktpersonTelefon")]
    public string KontaktpersonTelefon { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("KontaktpersonEpost", Order = 12)]
    [JsonProperty("KontaktpersonEpost")]
    [JsonPropertyName("KontaktpersonEpost")]
    public string KontaktpersonEpost { get; set; }

    [XmlElement("Samfunnskritisk", Order = 13)]
    [JsonProperty("Samfunnskritisk")]
    [JsonPropertyName("Samfunnskritisk")]
    public bool? Samfunnskritisk { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("SamfunnskritiskBransje", Order = 14)]
    [JsonProperty("SamfunnskritiskBransje")]
    [JsonPropertyName("SamfunnskritiskBransje")]
    public string SamfunnskritiskBransje { get; set; }

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("BenyttesFraDato", Order = 15, IsNullable = true)]
    [JsonProperty("BenyttesFraDato")]
    [JsonPropertyName("BenyttesFraDato")]
    public string BenyttesFraDato { get; set; }

    [XmlElement("BekreftetRiktig", Order = 16)]
    [JsonProperty("BekreftetRiktig")]
    [JsonPropertyName("BekreftetRiktig")]
    public bool? BekreftetRiktig { get; set; }

    public bool ShouldSerializeBekreftetRiktig() => BekreftetRiktig.HasValue;

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("Innsender", Order = 17)]
    [JsonProperty("Innsender")]
    [JsonPropertyName("Innsender")]
    public string Innsender { get; set; }

    [MinLength(0)]
    [MaxLength(50)]
    [XmlElement("SoknadGjelderFor", Order = 18)]
    [JsonProperty("SoknadGjelderFor")]
    [JsonPropertyName("SoknadGjelderFor")]
    public string SoknadGjelderFor { get; set; }

    [XmlElement("HarNorskBostedsadresse", Order = 19)]
    [JsonProperty("HarNorskBostedsadresse")]
    [JsonPropertyName("HarNorskBostedsadresse")]
    public bool? HarNorskBostedsadresse { get; set; }

    [XmlElement("HarJobbetIUtlandet", Order = 20)]
    [JsonProperty("HarJobbetIUtlandet")]
    [JsonPropertyName("HarJobbetIUtlandet")]
    public bool? HarJobbetIUtlandet { get; set; }

    [XmlElement("PersonerUtenKaranteneIBoligen", Order = 21)]
    [JsonProperty("PersonerUtenKaranteneIBoligen")]
    [JsonPropertyName("PersonerUtenKaranteneIBoligen")]
    public bool? PersonerUtenKaranteneIBoligen { get; set; }

    [XmlElement("HarBoligenKjokken", Order = 22)]
    [JsonProperty("HarBoligenKjokken")]
    [JsonPropertyName("HarBoligenKjokken")]
    public bool? HarBoligenKjokken { get; set; }

    [XmlElement("HarBoligenBadOgToalett", Order = 23)]
    [JsonProperty("HarBoligenBadOgToalett")]
    [JsonPropertyName("HarBoligenBadOgToalett")]
    public bool? HarBoligenBadOgToalett { get; set; }

    [MinLength(0)]
    [MaxLength(255)]
    [XmlElement("InnkvarteringMerknad", Order = 24)]
    [JsonProperty("InnkvarteringMerknad")]
    [JsonPropertyName("InnkvarteringMerknad")]
    public string InnkvarteringMerknad { get; set; }

    [XmlElement("OppdragUtlandTilbysMatservering", Order = 25)]
    [JsonProperty("OppdragUtlandTilbysMatservering")]
    [JsonPropertyName("OppdragUtlandTilbysMatservering")]
    public bool? OppdragUtlandTilbysMatservering { get; set; }

    [XmlElement("OppdragUtlandTvOgInternett", Order = 26)]
    [JsonProperty("OppdragUtlandTvOgInternett")]
    [JsonPropertyName("OppdragUtlandTvOgInternett")]
    public bool? OppdragUtlandTvOgInternett { get; set; }

  }
}
