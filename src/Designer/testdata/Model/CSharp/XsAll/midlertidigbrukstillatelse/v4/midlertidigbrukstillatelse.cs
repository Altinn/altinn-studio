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

    [XmlElement("eiendomByggested", IsNullable = true)]
    [JsonProperty("eiendomByggested")]
    [JsonPropertyName("eiendomByggested")]
    public EiendomListe eiendomByggested { get; set; }

    [XmlElement("kommunensSaksnummer", IsNullable = true)]
    [JsonProperty("kommunensSaksnummer")]
    [JsonPropertyName("kommunensSaksnummer")]
    public SaksnummerType kommunensSaksnummer { get; set; }

    [XmlElement("metadata", IsNullable = true)]
    [JsonProperty("metadata")]
    [JsonPropertyName("metadata")]
    public MetadataType metadata { get; set; }

    [XmlElement("generelleVilkaar", IsNullable = true)]
    [JsonProperty("generelleVilkaar")]
    [JsonPropertyName("generelleVilkaar")]
    public GenerelleVilkaarType generelleVilkaar { get; set; }

    [XmlElement("soeknadGjelder", IsNullable = true)]
    [JsonProperty("soeknadGjelder")]
    [JsonPropertyName("soeknadGjelder")]
    public SoeknadGjelderType soeknadGjelder { get; set; }

    [XmlElement("delsoeknader", IsNullable = true)]
    [JsonProperty("delsoeknader")]
    [JsonPropertyName("delsoeknader")]
    public DelsoeknadListe delsoeknader { get; set; }

    [XmlElement("utfallBesvarelse", IsNullable = true)]
    [JsonProperty("utfallBesvarelse")]
    [JsonPropertyName("utfallBesvarelse")]
    public UtfallSvarListe utfallBesvarelse { get; set; }

    [XmlElement("tiltakshaver", IsNullable = true)]
    [JsonProperty("tiltakshaver")]
    [JsonPropertyName("tiltakshaver")]
    public PartType tiltakshaver { get; set; }

    [XmlElement("ansvarligSoeker", IsNullable = true)]
    [JsonProperty("ansvarligSoeker")]
    [JsonPropertyName("ansvarligSoeker")]
    public PartType ansvarligSoeker { get; set; }

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("datoFerdigattest", IsNullable = true)]
    [JsonProperty("datoFerdigattest")]
    [JsonPropertyName("datoFerdigattest")]
    public string datoFerdigattest { get; set; }

    [XmlElement("gjenstaaendeArbeider", IsNullable = true)]
    [JsonProperty("gjenstaaendeArbeider")]
    [JsonPropertyName("gjenstaaendeArbeider")]
    public GjenstaaendeArbeiderType gjenstaaendeArbeider { get; set; }

    [XmlElement("sikkerhetsnivaa", IsNullable = true)]
    [JsonProperty("sikkerhetsnivaa")]
    [JsonPropertyName("sikkerhetsnivaa")]
    public SikkerhetsnivaaType sikkerhetsnivaa { get; set; }

    [XmlElement("ansvarForByggesaken", IsNullable = true)]
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

    [XmlElement("eiendomsidentifikasjon", IsNullable = true)]
    [JsonProperty("eiendomsidentifikasjon")]
    [JsonPropertyName("eiendomsidentifikasjon")]
    public MatrikkelnummerType eiendomsidentifikasjon { get; set; }

    [XmlElement("adresse", IsNullable = true)]
    [JsonProperty("adresse")]
    [JsonPropertyName("adresse")]
    public EiendommensAdresseType adresse { get; set; }

    [XmlElement("bygningsnummer", IsNullable = true)]
    [JsonProperty("bygningsnummer")]
    [JsonPropertyName("bygningsnummer")]
    public string bygningsnummer { get; set; }

    [XmlElement("bolignummer", IsNullable = true)]
    [JsonProperty("bolignummer")]
    [JsonPropertyName("bolignummer")]
    public string bolignummer { get; set; }

    [XmlElement("kommunenavn", IsNullable = true)]
    [JsonProperty("kommunenavn")]
    [JsonPropertyName("kommunenavn")]
    public string kommunenavn { get; set; }

  }

  public class MatrikkelnummerType
  {
    [XmlElement("kommunenummer", IsNullable = true)]
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
    [XmlElement("adresselinje1", IsNullable = true)]
    [JsonProperty("adresselinje1")]
    [JsonPropertyName("adresselinje1")]
    public string adresselinje1 { get; set; }

    [XmlElement("adresselinje2", IsNullable = true)]
    [JsonProperty("adresselinje2")]
    [JsonPropertyName("adresselinje2")]
    public string adresselinje2 { get; set; }

    [XmlElement("adresselinje3", IsNullable = true)]
    [JsonProperty("adresselinje3")]
    [JsonPropertyName("adresselinje3")]
    public string adresselinje3 { get; set; }

    [XmlElement("postnr", IsNullable = true)]
    [JsonProperty("postnr")]
    [JsonPropertyName("postnr")]
    public string postnr { get; set; }

    [XmlElement("poststed", IsNullable = true)]
    [JsonProperty("poststed")]
    [JsonPropertyName("poststed")]
    public string poststed { get; set; }

    [XmlElement("landkode", IsNullable = true)]
    [JsonProperty("landkode")]
    [JsonPropertyName("landkode")]
    public string landkode { get; set; }

    [XmlElement("gatenavn", IsNullable = true)]
    [JsonProperty("gatenavn")]
    [JsonPropertyName("gatenavn")]
    public string gatenavn { get; set; }

    [XmlElement("husnr", IsNullable = true)]
    [JsonProperty("husnr")]
    [JsonPropertyName("husnr")]
    public string husnr { get; set; }

    [XmlElement("bokstav", IsNullable = true)]
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
    [XmlElement("fraSluttbrukersystem", IsNullable = true)]
    [JsonProperty("fraSluttbrukersystem")]
    [JsonPropertyName("fraSluttbrukersystem")]
    public string fraSluttbrukersystem { get; set; }

    [XmlElement("ftbId", IsNullable = true)]
    [JsonProperty("ftbId")]
    [JsonPropertyName("ftbId")]
    public string ftbId { get; set; }

    [XmlElement("prosjektnavn", IsNullable = true)]
    [JsonProperty("prosjektnavn")]
    [JsonPropertyName("prosjektnavn")]
    public string prosjektnavn { get; set; }

    [XmlElement("prosjektnr", IsNullable = true)]
    [JsonProperty("prosjektnr")]
    [JsonPropertyName("prosjektnr")]
    public string prosjektnr { get; set; }

    [XmlElement("foretrukketSpraak", IsNullable = true)]
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

    [XmlElement("kodeverdi", IsNullable = true)]
    [JsonProperty("kodeverdi")]
    [JsonPropertyName("kodeverdi")]
    public string kodeverdi { get; set; }

    [XmlElement("kodebeskrivelse", IsNullable = true)]
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

    [XmlElement("delAvTiltaket", IsNullable = true)]
    [JsonProperty("delAvTiltaket")]
    [JsonPropertyName("delAvTiltaket")]
    public string delAvTiltaket { get; set; }

    [XmlElement("type", IsNullable = true)]
    [JsonProperty("type")]
    [JsonPropertyName("type")]
    public KodeListe type { get; set; }

    [XmlElement("delsoeknadsnummer", IsNullable = true)]
    [JsonProperty("delsoeknadsnummer")]
    [JsonPropertyName("delsoeknadsnummer")]
    public string delsoeknadsnummer { get; set; }

    [XmlElement("foelgebrev", IsNullable = true)]
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

    [XmlElement("delAvTiltaket", IsNullable = true)]
    [JsonProperty("delAvTiltaket")]
    [JsonPropertyName("delAvTiltaket")]
    public string delAvTiltaket { get; set; }

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("tillatelsedato", IsNullable = true)]
    [JsonProperty("tillatelsedato")]
    [JsonPropertyName("tillatelsedato")]
    public string tillatelsedato { get; set; }

    [XmlElement("kommentar", IsNullable = true)]
    [JsonProperty("kommentar")]
    [JsonPropertyName("kommentar")]
    public string kommentar { get; set; }

    [XmlElement("type", IsNullable = true)]
    [JsonProperty("type")]
    [JsonPropertyName("type")]
    public KodeListe type { get; set; }

    [XmlElement("delsoeknadsnummer", IsNullable = true)]
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

    [XmlElement("utfallId", IsNullable = true)]
    [JsonProperty("utfallId")]
    [JsonPropertyName("utfallId")]
    public string utfallId { get; set; }

    [XmlElement("utfallType", IsNullable = true)]
    [JsonProperty("utfallType")]
    [JsonPropertyName("utfallType")]
    public KodeType utfallType { get; set; }

    [XmlElement("utloestFraSjekkpunkt", IsNullable = true)]
    [JsonProperty("utloestFraSjekkpunkt")]
    [JsonPropertyName("utloestFraSjekkpunkt")]
    public SjekkpunktType utloestFraSjekkpunkt { get; set; }

    [XmlElement("tema", IsNullable = true)]
    [JsonProperty("tema")]
    [JsonPropertyName("tema")]
    public KodeType tema { get; set; }

    [XmlElement("tittel", IsNullable = true)]
    [JsonProperty("tittel")]
    [JsonPropertyName("tittel")]
    public string tittel { get; set; }

    [XmlElement("beskrivelse", IsNullable = true)]
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

    [XmlElement("kommentar", IsNullable = true)]
    [JsonProperty("kommentar")]
    [JsonPropertyName("kommentar")]
    public string kommentar { get; set; }

    [XmlElement("vedleggsliste", IsNullable = true)]
    [JsonProperty("vedleggsliste")]
    [JsonPropertyName("vedleggsliste")]
    public VedleggListe vedleggsliste { get; set; }

  }

  public class SjekkpunktType
  {
    [XmlElement("sjekkpunktId", IsNullable = true)]
    [JsonProperty("sjekkpunktId")]
    [JsonPropertyName("sjekkpunktId")]
    public string sjekkpunktId { get; set; }

    [XmlElement("sjekkpunktEier", IsNullable = true)]
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

    [XmlElement("versjonsnummer", IsNullable = true)]
    [JsonProperty("versjonsnummer")]
    [JsonPropertyName("versjonsnummer")]
    public string versjonsnummer { get; set; }

    [XmlElement("vedleggstype", IsNullable = true)]
    [JsonProperty("vedleggstype")]
    [JsonPropertyName("vedleggstype")]
    public KodeType vedleggstype { get; set; }

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("versjonsdato", IsNullable = true)]
    [JsonProperty("versjonsdato")]
    [JsonPropertyName("versjonsdato")]
    public string versjonsdato { get; set; }

    [XmlElement("filnavn", IsNullable = true)]
    [JsonProperty("filnavn")]
    [JsonPropertyName("filnavn")]
    public string filnavn { get; set; }

  }

  public class PartType
  {
    [XmlElement("partstype", IsNullable = true)]
    [JsonProperty("partstype")]
    [JsonPropertyName("partstype")]
    public KodeType partstype { get; set; }

    [XmlElement("foedselsnummer", IsNullable = true)]
    [JsonProperty("foedselsnummer")]
    [JsonPropertyName("foedselsnummer")]
    public string foedselsnummer { get; set; }

    [XmlElement("organisasjonsnummer", IsNullable = true)]
    [JsonProperty("organisasjonsnummer")]
    [JsonPropertyName("organisasjonsnummer")]
    public string organisasjonsnummer { get; set; }

    [XmlElement("navn", IsNullable = true)]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    public string navn { get; set; }

    [XmlElement("adresse", IsNullable = true)]
    [JsonProperty("adresse")]
    [JsonPropertyName("adresse")]
    public EnkelAdresseType adresse { get; set; }

    [XmlElement("telefonnummer", IsNullable = true)]
    [JsonProperty("telefonnummer")]
    [JsonPropertyName("telefonnummer")]
    public string telefonnummer { get; set; }

    [XmlElement("mobilnummer", IsNullable = true)]
    [JsonProperty("mobilnummer")]
    [JsonPropertyName("mobilnummer")]
    public string mobilnummer { get; set; }

    [XmlElement("epost", IsNullable = true)]
    [JsonProperty("epost")]
    [JsonPropertyName("epost")]
    public string epost { get; set; }

    [XmlElement("kontaktperson", IsNullable = true)]
    [JsonProperty("kontaktperson")]
    [JsonPropertyName("kontaktperson")]
    public KontaktpersonType kontaktperson { get; set; }

  }

  public class EnkelAdresseType
  {
    [XmlElement("adresselinje1", IsNullable = true)]
    [JsonProperty("adresselinje1")]
    [JsonPropertyName("adresselinje1")]
    public string adresselinje1 { get; set; }

    [XmlElement("adresselinje2", IsNullable = true)]
    [JsonProperty("adresselinje2")]
    [JsonPropertyName("adresselinje2")]
    public string adresselinje2 { get; set; }

    [XmlElement("adresselinje3", IsNullable = true)]
    [JsonProperty("adresselinje3")]
    [JsonPropertyName("adresselinje3")]
    public string adresselinje3 { get; set; }

    [XmlElement("postnr", IsNullable = true)]
    [JsonProperty("postnr")]
    [JsonPropertyName("postnr")]
    public string postnr { get; set; }

    [XmlElement("poststed", IsNullable = true)]
    [JsonProperty("poststed")]
    [JsonPropertyName("poststed")]
    public string poststed { get; set; }

    [XmlElement("landkode", IsNullable = true)]
    [JsonProperty("landkode")]
    [JsonPropertyName("landkode")]
    public string landkode { get; set; }

  }

  public class KontaktpersonType
  {
    [XmlElement("navn", IsNullable = true)]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    public string navn { get; set; }

    [XmlElement("telefonnummer", IsNullable = true)]
    [JsonProperty("telefonnummer")]
    [JsonPropertyName("telefonnummer")]
    public string telefonnummer { get; set; }

    [XmlElement("mobilnummer", IsNullable = true)]
    [JsonProperty("mobilnummer")]
    [JsonPropertyName("mobilnummer")]
    public string mobilnummer { get; set; }

    [XmlElement("epost", IsNullable = true)]
    [JsonProperty("epost")]
    [JsonPropertyName("epost")]
    public string epost { get; set; }

  }

  public class GjenstaaendeArbeiderType
  {
    [XmlElement("gjenstaaendeInnenfor", IsNullable = true)]
    [JsonProperty("gjenstaaendeInnenfor")]
    [JsonPropertyName("gjenstaaendeInnenfor")]
    public string gjenstaaendeInnenfor { get; set; }

    [XmlElement("gjenstaaendeUtenfor", IsNullable = true)]
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

    [XmlElement("typeArbeider", IsNullable = true)]
    [JsonProperty("typeArbeider")]
    [JsonPropertyName("typeArbeider")]
    public string typeArbeider { get; set; }

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("utfoertInnen", IsNullable = true)]
    [JsonProperty("utfoertInnen")]
    [JsonPropertyName("utfoertInnen")]
    public string utfoertInnen { get; set; }

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("bekreftelseInnen", IsNullable = true)]
    [JsonProperty("bekreftelseInnen")]
    [JsonPropertyName("bekreftelseInnen")]
    public string bekreftelseInnen { get; set; }

  }
}
