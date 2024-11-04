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
  [XmlRoot(ElementName="midlertidigbrukstillatelse", Namespace="https://skjema.ft.dibk.no/midlertidigbrukstillatelse/v4")]
  public class MidlertidigBrukstillatelseType
  {
    [XmlAttribute("dataFormatProvider")]
    [BindNever]
    public string dataFormatProvider { get; set; } = "DIBK";

    [XmlAttribute("dataFormatId")]
    [BindNever]
    public string dataFormatId { get; set; } = "10004";

    [XmlAttribute("dataFormatVersion")]
    [BindNever]
    public string dataFormatVersion { get; set; } = "4";

    [XmlElement("eiendomByggested")]
    [JsonProperty("eiendomByggested")]
    [JsonPropertyName("eiendomByggested")]
    public EiendomListe eiendomByggested { get; set; }

    [XmlElement("kommunensSaksnummer")]
    [JsonProperty("kommunensSaksnummer")]
    [JsonPropertyName("kommunensSaksnummer")]
    public SaksnummerType kommunensSaksnummer { get; set; }

    [XmlElement("metadata")]
    [JsonProperty("metadata")]
    [JsonPropertyName("metadata")]
    public MetadataType metadata { get; set; }

    [XmlElement("generelleVilkaar")]
    [JsonProperty("generelleVilkaar")]
    [JsonPropertyName("generelleVilkaar")]
    public GenerelleVilkaarType generelleVilkaar { get; set; }

    [XmlElement("soeknadGjelder")]
    [JsonProperty("soeknadGjelder")]
    [JsonPropertyName("soeknadGjelder")]
    public SoeknadGjelderType soeknadGjelder { get; set; }

    [XmlElement("delsoeknader")]
    [JsonProperty("delsoeknader")]
    [JsonPropertyName("delsoeknader")]
    public DelsoeknadListe delsoeknader { get; set; }

    [XmlElement("utfallBesvarelse")]
    [JsonProperty("utfallBesvarelse")]
    [JsonPropertyName("utfallBesvarelse")]
    public UtfallSvarListe utfallBesvarelse { get; set; }

    [XmlElement("tiltakshaver")]
    [JsonProperty("tiltakshaver")]
    [JsonPropertyName("tiltakshaver")]
    public PartType tiltakshaver { get; set; }

    [XmlElement("ansvarligSoeker")]
    [JsonProperty("ansvarligSoeker")]
    [JsonPropertyName("ansvarligSoeker")]
    public PartType ansvarligSoeker { get; set; }

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("datoFerdigattest")]
    [JsonProperty("datoFerdigattest")]
    [JsonPropertyName("datoFerdigattest")]
    public string datoFerdigattest { get; set; }

    [XmlElement("gjenstaaendeArbeider")]
    [JsonProperty("gjenstaaendeArbeider")]
    [JsonPropertyName("gjenstaaendeArbeider")]
    public GjenstaaendeArbeiderType gjenstaaendeArbeider { get; set; }

    [XmlElement("sikkerhetsnivaa")]
    [JsonProperty("sikkerhetsnivaa")]
    [JsonPropertyName("sikkerhetsnivaa")]
    public SikkerhetsnivaaType sikkerhetsnivaa { get; set; }

    [XmlElement("ansvarForByggesaken")]
    [JsonProperty("ansvarForByggesaken")]
    [JsonPropertyName("ansvarForByggesaken")]
    public KodeType ansvarForByggesaken { get; set; }

  }

  public class EiendomListe
  {
    [XmlElement("eiendom")]
    [JsonProperty("eiendom")]
    [JsonPropertyName("eiendom")]
    public List<EiendomType> eiendom { get; set; }

  }

  public class EiendomType
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("eiendomsidentifikasjon")]
    [JsonProperty("eiendomsidentifikasjon")]
    [JsonPropertyName("eiendomsidentifikasjon")]
    public MatrikkelnummerType eiendomsidentifikasjon { get; set; }

    [XmlElement("adresse")]
    [JsonProperty("adresse")]
    [JsonPropertyName("adresse")]
    public EiendommensAdresseType adresse { get; set; }

    [XmlElement("bygningsnummer")]
    [JsonProperty("bygningsnummer")]
    [JsonPropertyName("bygningsnummer")]
    public string bygningsnummer { get; set; }

    [XmlElement("bolignummer")]
    [JsonProperty("bolignummer")]
    [JsonPropertyName("bolignummer")]
    public string bolignummer { get; set; }

    [XmlElement("kommunenavn")]
    [JsonProperty("kommunenavn")]
    [JsonPropertyName("kommunenavn")]
    public string kommunenavn { get; set; }

  }

  public class MatrikkelnummerType
  {
    [XmlElement("kommunenummer")]
    [JsonProperty("kommunenummer")]
    [JsonPropertyName("kommunenummer")]
    public string kommunenummer { get; set; }

    [Range(Int32.MinValue,Int32.MaxValue)]
    [XmlElement("gaardsnummer")]
    [JsonProperty("gaardsnummer")]
    [JsonPropertyName("gaardsnummer")]
    public int? gaardsnummer { get; set; }

    [Range(Int32.MinValue,Int32.MaxValue)]
    [XmlElement("bruksnummer")]
    [JsonProperty("bruksnummer")]
    [JsonPropertyName("bruksnummer")]
    public int? bruksnummer { get; set; }

    [Range(Int32.MinValue,Int32.MaxValue)]
    [XmlElement("festenummer")]
    [JsonProperty("festenummer")]
    [JsonPropertyName("festenummer")]
    public int? festenummer { get; set; }

    [Range(Int32.MinValue,Int32.MaxValue)]
    [XmlElement("seksjonsnummer")]
    [JsonProperty("seksjonsnummer")]
    [JsonPropertyName("seksjonsnummer")]
    public int? seksjonsnummer { get; set; }

  }

  public class EiendommensAdresseType
  {
    [XmlElement("adresselinje1")]
    [JsonProperty("adresselinje1")]
    [JsonPropertyName("adresselinje1")]
    public string adresselinje1 { get; set; }

    [XmlElement("adresselinje2")]
    [JsonProperty("adresselinje2")]
    [JsonPropertyName("adresselinje2")]
    public string adresselinje2 { get; set; }

    [XmlElement("adresselinje3")]
    [JsonProperty("adresselinje3")]
    [JsonPropertyName("adresselinje3")]
    public string adresselinje3 { get; set; }

    [XmlElement("postnr")]
    [JsonProperty("postnr")]
    [JsonPropertyName("postnr")]
    public string postnr { get; set; }

    [XmlElement("poststed")]
    [JsonProperty("poststed")]
    [JsonPropertyName("poststed")]
    public string poststed { get; set; }

    [XmlElement("landkode")]
    [JsonProperty("landkode")]
    [JsonPropertyName("landkode")]
    public string landkode { get; set; }

    [XmlElement("gatenavn")]
    [JsonProperty("gatenavn")]
    [JsonPropertyName("gatenavn")]
    public string gatenavn { get; set; }

    [XmlElement("husnr")]
    [JsonProperty("husnr")]
    [JsonPropertyName("husnr")]
    public string husnr { get; set; }

    [XmlElement("bokstav")]
    [JsonProperty("bokstav")]
    [JsonPropertyName("bokstav")]
    public string bokstav { get; set; }

  }

  public class SaksnummerType
  {
    [Range(Int32.MinValue,Int32.MaxValue)]
    [XmlElement("saksaar")]
    [JsonProperty("saksaar")]
    [JsonPropertyName("saksaar")]
    public int? saksaar { get; set; }

    [Range(Int32.MinValue,Int32.MaxValue)]
    [XmlElement("sakssekvensnummer")]
    [JsonProperty("sakssekvensnummer")]
    [JsonPropertyName("sakssekvensnummer")]
    public int? sakssekvensnummer { get; set; }

  }

  public class MetadataType
  {
    [XmlElement("fraSluttbrukersystem")]
    [JsonProperty("fraSluttbrukersystem")]
    [JsonPropertyName("fraSluttbrukersystem")]
    public string fraSluttbrukersystem { get; set; }

    [XmlElement("ftbId")]
    [JsonProperty("ftbId")]
    [JsonPropertyName("ftbId")]
    public string ftbId { get; set; }

    [XmlElement("prosjektnavn")]
    [JsonProperty("prosjektnavn")]
    [JsonPropertyName("prosjektnavn")]
    public string prosjektnavn { get; set; }

    [XmlElement("prosjektnr")]
    [JsonProperty("prosjektnr")]
    [JsonPropertyName("prosjektnr")]
    public string prosjektnr { get; set; }

    [XmlElement("foretrukketSpraak")]
    [JsonProperty("foretrukketSpraak")]
    [JsonPropertyName("foretrukketSpraak")]
    public KodeType foretrukketSpraak { get; set; }

  }

  public class KodeType
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("kodeverdi")]
    [JsonProperty("kodeverdi")]
    [JsonPropertyName("kodeverdi")]
    public string kodeverdi { get; set; }

    [XmlElement("kodebeskrivelse")]
    [JsonProperty("kodebeskrivelse")]
    [JsonPropertyName("kodebeskrivelse")]
    public string kodebeskrivelse { get; set; }

  }

  public class GenerelleVilkaarType
  {
    [XmlElement("norskSvenskDansk")]
    [JsonProperty("norskSvenskDansk")]
    [JsonPropertyName("norskSvenskDansk")]
    public bool? norskSvenskDansk { get; set; }

  }

  public class SoeknadGjelderType
  {
    [XmlElement("gjelderHeleTiltaket")]
    [JsonProperty("gjelderHeleTiltaket")]
    [JsonPropertyName("gjelderHeleTiltaket")]
    public bool? gjelderHeleTiltaket { get; set; }

    [XmlElement("delAvTiltaket")]
    [JsonProperty("delAvTiltaket")]
    [JsonPropertyName("delAvTiltaket")]
    public string delAvTiltaket { get; set; }

    [XmlElement("type")]
    [JsonProperty("type")]
    [JsonPropertyName("type")]
    public KodeListe type { get; set; }

    [XmlElement("delsoeknadsnummer")]
    [JsonProperty("delsoeknadsnummer")]
    [JsonPropertyName("delsoeknadsnummer")]
    public string delsoeknadsnummer { get; set; }

    [XmlElement("foelgebrev")]
    [JsonProperty("foelgebrev")]
    [JsonPropertyName("foelgebrev")]
    public string foelgebrev { get; set; }

  }

  public class KodeListe
  {
    [XmlElement("kode")]
    [JsonProperty("kode")]
    [JsonPropertyName("kode")]
    public List<KodeType> kode { get; set; }

  }

  public class DelsoeknadListe
  {
    [XmlElement("delsoeknad")]
    [JsonProperty("delsoeknad")]
    [JsonPropertyName("delsoeknad")]
    public List<DelsoeknadType> delsoeknad { get; set; }

  }

  public class DelsoeknadType
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("delAvTiltaket")]
    [JsonProperty("delAvTiltaket")]
    [JsonPropertyName("delAvTiltaket")]
    public string delAvTiltaket { get; set; }

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("tillatelsedato")]
    [JsonProperty("tillatelsedato")]
    [JsonPropertyName("tillatelsedato")]
    public string tillatelsedato { get; set; }

    [XmlElement("kommentar")]
    [JsonProperty("kommentar")]
    [JsonPropertyName("kommentar")]
    public string kommentar { get; set; }

    [XmlElement("type")]
    [JsonProperty("type")]
    [JsonPropertyName("type")]
    public KodeListe type { get; set; }

    [XmlElement("delsoeknadsnummer")]
    [JsonProperty("delsoeknadsnummer")]
    [JsonPropertyName("delsoeknadsnummer")]
    public string delsoeknadsnummer { get; set; }

  }

  public class UtfallSvarListe
  {
    [XmlElement("utfallSvar")]
    [JsonProperty("utfallSvar")]
    [JsonPropertyName("utfallSvar")]
    public List<UtfallSvarType> utfallSvar { get; set; }

  }

  public class UtfallSvarType
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("utfallId")]
    [JsonProperty("utfallId")]
    [JsonPropertyName("utfallId")]
    public string utfallId { get; set; }

    [XmlElement("utfallType")]
    [JsonProperty("utfallType")]
    [JsonPropertyName("utfallType")]
    public KodeType utfallType { get; set; }

    [XmlElement("utloestFraSjekkpunkt")]
    [JsonProperty("utloestFraSjekkpunkt")]
    [JsonPropertyName("utloestFraSjekkpunkt")]
    public SjekkpunktType utloestFraSjekkpunkt { get; set; }

    [XmlElement("tema")]
    [JsonProperty("tema")]
    [JsonPropertyName("tema")]
    public KodeType tema { get; set; }

    [XmlElement("tittel")]
    [JsonProperty("tittel")]
    [JsonPropertyName("tittel")]
    public string tittel { get; set; }

    [XmlElement("beskrivelse")]
    [JsonProperty("beskrivelse")]
    [JsonPropertyName("beskrivelse")]
    public string beskrivelse { get; set; }

    [XmlElement("erUtfallBesvaresSenere")]
    [JsonProperty("erUtfallBesvaresSenere")]
    [JsonPropertyName("erUtfallBesvaresSenere")]
    public bool? erUtfallBesvaresSenere { get; set; }

    [XmlElement("erUtfallBesvart")]
    [JsonProperty("erUtfallBesvart")]
    [JsonPropertyName("erUtfallBesvart")]
    public bool? erUtfallBesvart { get; set; }

    [XmlElement("kommentar")]
    [JsonProperty("kommentar")]
    [JsonPropertyName("kommentar")]
    public string kommentar { get; set; }

    [XmlElement("vedleggsliste")]
    [JsonProperty("vedleggsliste")]
    [JsonPropertyName("vedleggsliste")]
    public VedleggListe vedleggsliste { get; set; }

  }

  public class SjekkpunktType
  {
    [XmlElement("sjekkpunktId")]
    [JsonProperty("sjekkpunktId")]
    [JsonPropertyName("sjekkpunktId")]
    public string sjekkpunktId { get; set; }

    [XmlElement("sjekkpunktEier")]
    [JsonProperty("sjekkpunktEier")]
    [JsonPropertyName("sjekkpunktEier")]
    public string sjekkpunktEier { get; set; }

  }

  public class VedleggListe
  {
    [XmlElement("vedlegg")]
    [JsonProperty("vedlegg")]
    [JsonPropertyName("vedlegg")]
    public List<VedleggType> vedlegg { get; set; }

  }

  public class VedleggType
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("versjonsnummer")]
    [JsonProperty("versjonsnummer")]
    [JsonPropertyName("versjonsnummer")]
    public string versjonsnummer { get; set; }

    [XmlElement("vedleggstype")]
    [JsonProperty("vedleggstype")]
    [JsonPropertyName("vedleggstype")]
    public KodeType vedleggstype { get; set; }

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("versjonsdato")]
    [JsonProperty("versjonsdato")]
    [JsonPropertyName("versjonsdato")]
    public string versjonsdato { get; set; }

    [XmlElement("filnavn")]
    [JsonProperty("filnavn")]
    [JsonPropertyName("filnavn")]
    public string filnavn { get; set; }

  }

  public class PartType
  {
    [XmlElement("partstype")]
    [JsonProperty("partstype")]
    [JsonPropertyName("partstype")]
    public KodeType partstype { get; set; }

    [XmlElement("foedselsnummer")]
    [JsonProperty("foedselsnummer")]
    [JsonPropertyName("foedselsnummer")]
    public string foedselsnummer { get; set; }

    [XmlElement("organisasjonsnummer")]
    [JsonProperty("organisasjonsnummer")]
    [JsonPropertyName("organisasjonsnummer")]
    public string organisasjonsnummer { get; set; }

    [XmlElement("navn")]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    public string navn { get; set; }

    [XmlElement("adresse")]
    [JsonProperty("adresse")]
    [JsonPropertyName("adresse")]
    public EnkelAdresseType adresse { get; set; }

    [XmlElement("telefonnummer")]
    [JsonProperty("telefonnummer")]
    [JsonPropertyName("telefonnummer")]
    public string telefonnummer { get; set; }

    [XmlElement("mobilnummer")]
    [JsonProperty("mobilnummer")]
    [JsonPropertyName("mobilnummer")]
    public string mobilnummer { get; set; }

    [XmlElement("epost")]
    [JsonProperty("epost")]
    [JsonPropertyName("epost")]
    public string epost { get; set; }

    [XmlElement("kontaktperson")]
    [JsonProperty("kontaktperson")]
    [JsonPropertyName("kontaktperson")]
    public KontaktpersonType kontaktperson { get; set; }

  }

  public class EnkelAdresseType
  {
    [XmlElement("adresselinje1")]
    [JsonProperty("adresselinje1")]
    [JsonPropertyName("adresselinje1")]
    public string adresselinje1 { get; set; }

    [XmlElement("adresselinje2")]
    [JsonProperty("adresselinje2")]
    [JsonPropertyName("adresselinje2")]
    public string adresselinje2 { get; set; }

    [XmlElement("adresselinje3")]
    [JsonProperty("adresselinje3")]
    [JsonPropertyName("adresselinje3")]
    public string adresselinje3 { get; set; }

    [XmlElement("postnr")]
    [JsonProperty("postnr")]
    [JsonPropertyName("postnr")]
    public string postnr { get; set; }

    [XmlElement("poststed")]
    [JsonProperty("poststed")]
    [JsonPropertyName("poststed")]
    public string poststed { get; set; }

    [XmlElement("landkode")]
    [JsonProperty("landkode")]
    [JsonPropertyName("landkode")]
    public string landkode { get; set; }

  }

  public class KontaktpersonType
  {
    [XmlElement("navn")]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    public string navn { get; set; }

    [XmlElement("telefonnummer")]
    [JsonProperty("telefonnummer")]
    [JsonPropertyName("telefonnummer")]
    public string telefonnummer { get; set; }

    [XmlElement("mobilnummer")]
    [JsonProperty("mobilnummer")]
    [JsonPropertyName("mobilnummer")]
    public string mobilnummer { get; set; }

    [XmlElement("epost")]
    [JsonProperty("epost")]
    [JsonPropertyName("epost")]
    public string epost { get; set; }

  }

  public class GjenstaaendeArbeiderType
  {
    [XmlElement("gjenstaaendeInnenfor")]
    [JsonProperty("gjenstaaendeInnenfor")]
    [JsonPropertyName("gjenstaaendeInnenfor")]
    public string gjenstaaendeInnenfor { get; set; }

    [XmlElement("gjenstaaendeUtenfor")]
    [JsonProperty("gjenstaaendeUtenfor")]
    [JsonPropertyName("gjenstaaendeUtenfor")]
    public string gjenstaaendeUtenfor { get; set; }

  }

  public class SikkerhetsnivaaType
  {
    [XmlElement("harTilstrekkeligSikkerhet")]
    [JsonProperty("harTilstrekkeligSikkerhet")]
    [JsonPropertyName("harTilstrekkeligSikkerhet")]
    public bool? harTilstrekkeligSikkerhet { get; set; }

    [XmlElement("typeArbeider")]
    [JsonProperty("typeArbeider")]
    [JsonPropertyName("typeArbeider")]
    public string typeArbeider { get; set; }

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("utfoertInnen")]
    [JsonProperty("utfoertInnen")]
    [JsonPropertyName("utfoertInnen")]
    public string utfoertInnen { get; set; }

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("bekreftelseInnen")]
    [JsonProperty("bekreftelseInnen")]
    [JsonPropertyName("bekreftelseInnen")]
    public string bekreftelseInnen { get; set; }

  }
}
