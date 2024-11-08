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
  [XmlRoot(ElementName="Planvarsel", Namespace="https://skjema.ft.dibk.no/planvarsel/2.0")]
  public class PlanvarselType
  {
    [XmlAttribute("dataFormatProvider")]
    [BindNever]
    public string dataFormatProvider { get; set; } = "DIBK";

    [XmlAttribute("dataFormatId")]
    [BindNever]
    public string dataFormatId { get; set; } = "11000";

    [XmlAttribute("dataFormatVersion")]
    [BindNever]
    public string dataFormatVersion { get; set; } = "2.0";

    [XmlElement("forslagsstiller")]
    [JsonProperty("forslagsstiller")]
    [JsonPropertyName("forslagsstiller")]
    public PartType forslagsstiller { get; set; }

    [XmlElement("beroerteParter")]
    [JsonProperty("beroerteParter")]
    [JsonPropertyName("beroerteParter")]
    public BeroertPartListe beroerteParter { get; set; }

    [XmlElement("kommunenavn")]
    [JsonProperty("kommunenavn")]
    [JsonPropertyName("kommunenavn")]
    public string kommunenavn { get; set; }

    [XmlElement("eiendomByggested")]
    [JsonProperty("eiendomByggested")]
    [JsonPropertyName("eiendomByggested")]
    public EiendomListe eiendomByggested { get; set; }

    [XmlElement("signatur")]
    [JsonProperty("signatur")]
    [JsonPropertyName("signatur")]
    public SignaturType signatur { get; set; }

    [XmlElement("gjeldendePlan")]
    [JsonProperty("gjeldendePlan")]
    [JsonPropertyName("gjeldendePlan")]
    public GjeldendePlanListe gjeldendePlan { get; set; }

    [XmlElement("plankonsulent")]
    [JsonProperty("plankonsulent")]
    [JsonPropertyName("plankonsulent")]
    public PartType plankonsulent { get; set; }

    [XmlElement("metadata")]
    [JsonProperty("metadata")]
    [JsonPropertyName("metadata")]
    public MetadataType metadata { get; set; }

    [XmlElement("planforslag")]
    [JsonProperty("planforslag")]
    [JsonPropertyName("planforslag")]
    public PlanType planforslag { get; set; }

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

    [XmlElement("epost")]
    [JsonProperty("epost")]
    [JsonPropertyName("epost")]
    public string epost { get; set; }

    [XmlElement("adresse")]
    [JsonProperty("adresse")]
    [JsonPropertyName("adresse")]
    public EnkelAdresseType adresse { get; set; }

    [XmlElement("telefon")]
    [JsonProperty("telefon")]
    [JsonPropertyName("telefon")]
    public string telefon { get; set; }

  }

  public class KodeType
  {
    [XmlElement("kodeverdi")]
    [JsonProperty("kodeverdi")]
    [JsonPropertyName("kodeverdi")]
    public string kodeverdi { get; set; }

    [XmlElement("kodebeskrivelse")]
    [JsonProperty("kodebeskrivelse")]
    [JsonPropertyName("kodebeskrivelse")]
    public string kodebeskrivelse { get; set; }

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

  public class BeroertPartListe
  {
    [XmlElement("beroertpart")]
    [JsonProperty("beroertpart")]
    [JsonPropertyName("beroertpart")]
    public List<BeroertPartType> beroertpart { get; set; }

  }

  public class BeroertPartType
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

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

    [XmlElement("telefon")]
    [JsonProperty("telefon")]
    [JsonPropertyName("telefon")]
    public string telefon { get; set; }

    [XmlElement("epost")]
    [JsonProperty("epost")]
    [JsonPropertyName("epost")]
    public string epost { get; set; }

    [XmlElement("adresse")]
    [JsonProperty("adresse")]
    [JsonPropertyName("adresse")]
    public EnkelAdresseType adresse { get; set; }

    [XmlElement("beskrivelseForVarsel")]
    [JsonProperty("beskrivelseForVarsel")]
    [JsonPropertyName("beskrivelseForVarsel")]
    public string beskrivelseForVarsel { get; set; }

    [XmlElement("systemReferanse")]
    [JsonProperty("systemReferanse")]
    [JsonPropertyName("systemReferanse")]
    public string systemReferanse { get; set; }

    [XmlElement("erHoeringsmyndighet")]
    [JsonProperty("erHoeringsmyndighet")]
    [JsonPropertyName("erHoeringsmyndighet")]
    public bool? erHoeringsmyndighet { get; set; }

    [XmlElement("gjelderEiendom")]
    [JsonProperty("gjelderEiendom")]
    [JsonPropertyName("gjelderEiendom")]
    public GjelderEiendomListe gjelderEiendom { get; set; }

  }

  public class GjelderEiendomListe
  {
    [XmlElement("gjeldereiendom")]
    [JsonProperty("gjeldereiendom")]
    [JsonPropertyName("gjeldereiendom")]
    public List<EiendomType> gjeldereiendom { get; set; }

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

  public class EiendomListe
  {
    [XmlElement("eiendom")]
    [JsonProperty("eiendom")]
    [JsonPropertyName("eiendom")]
    public List<EiendomType> eiendom { get; set; }

  }

  public class SignaturType
  {
    [XmlElement("signaturdato")]
    [JsonProperty("signaturdato")]
    [JsonPropertyName("signaturdato")]
    public DateTime? signaturdato { get; set; }

    [XmlElement("signertAv")]
    [JsonProperty("signertAv")]
    [JsonPropertyName("signertAv")]
    public string signertAv { get; set; }

    [XmlElement("signertPaaVegneAv")]
    [JsonProperty("signertPaaVegneAv")]
    [JsonPropertyName("signertPaaVegneAv")]
    public string signertPaaVegneAv { get; set; }

  }

  public class GjeldendePlanListe
  {
    [XmlElement("gjeldendeplan")]
    [JsonProperty("gjeldendeplan")]
    [JsonPropertyName("gjeldendeplan")]
    public List<GjeldendePlanType> gjeldendeplan { get; set; }

  }

  public class GjeldendePlanType
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("navn")]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    public string navn { get; set; }

    [XmlElement("plantype")]
    [JsonProperty("plantype")]
    [JsonPropertyName("plantype")]
    public KodeType plantype { get; set; }

  }

  public class MetadataType
  {
    [XmlElement("ftbId")]
    [JsonProperty("ftbId")]
    [JsonPropertyName("ftbId")]
    public string ftbId { get; set; }

    [XmlElement("hovedinnsendingsnummer")]
    [JsonProperty("hovedinnsendingsnummer")]
    [JsonPropertyName("hovedinnsendingsnummer")]
    public string hovedinnsendingsnummer { get; set; }

    [XmlElement("klartForSigneringFraSluttbrukersystem")]
    [JsonProperty("klartForSigneringFraSluttbrukersystem")]
    [JsonPropertyName("klartForSigneringFraSluttbrukersystem")]
    public bool? klartForSigneringFraSluttbrukersystem { get; set; }

    [XmlElement("fraSluttbrukersystem")]
    [JsonProperty("fraSluttbrukersystem")]
    [JsonPropertyName("fraSluttbrukersystem")]
    public string fraSluttbrukersystem { get; set; }

  }

  public class PlanType
  {
    [XmlElement("plannavn")]
    [JsonProperty("plannavn")]
    [JsonPropertyName("plannavn")]
    public string plannavn { get; set; }

    [XmlElement("arealplanId")]
    [JsonProperty("arealplanId")]
    [JsonPropertyName("arealplanId")]
    public string arealplanId { get; set; }

    [XmlElement("hjemmesidePlanforslag")]
    [JsonProperty("hjemmesidePlanforslag")]
    [JsonPropertyName("hjemmesidePlanforslag")]
    public string hjemmesidePlanforslag { get; set; }

    [XmlElement("kravKonsekvensUtredning")]
    [JsonProperty("kravKonsekvensUtredning")]
    [JsonPropertyName("kravKonsekvensUtredning")]
    public bool? kravKonsekvensUtredning { get; set; }

    [XmlElement("planHensikt")]
    [JsonProperty("planHensikt")]
    [JsonPropertyName("planHensikt")]
    public string planHensikt { get; set; }

    [XmlElement("fristForInnspill")]
    [JsonProperty("fristForInnspill")]
    [JsonPropertyName("fristForInnspill")]
    public DateTime? fristForInnspill { get; set; }

    [XmlElement("hjemmesidePlanprogram")]
    [JsonProperty("hjemmesidePlanprogram")]
    [JsonPropertyName("hjemmesidePlanprogram")]
    public string hjemmesidePlanprogram { get; set; }

    [XmlElement("plantype")]
    [JsonProperty("plantype")]
    [JsonPropertyName("plantype")]
    public KodeType plantype { get; set; }

    [XmlElement("begrunnelseKU")]
    [JsonProperty("begrunnelseKU")]
    [JsonPropertyName("begrunnelseKU")]
    public string begrunnelseKU { get; set; }

    [XmlElement("kommunensSaksnummer")]
    [JsonProperty("kommunensSaksnummer")]
    [JsonPropertyName("kommunensSaksnummer")]
    public SaksnummerType kommunensSaksnummer { get; set; }

    [XmlElement("saksgangOgMedvirkning")]
    [JsonProperty("saksgangOgMedvirkning")]
    [JsonPropertyName("saksgangOgMedvirkning")]
    public string saksgangOgMedvirkning { get; set; }

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
}
