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
  public class ReelleRettighetshavere_M
  {
    [XmlAttribute("versjon")]
    [BindNever]
    public string versjon { get; set; } = "0.0.3";

    [XmlAttribute("endret")]
    [BindNever]
    public string endret { get; set; } = "2023-09-14";

    [XmlElement("skjemainnhold", Order = 1)]
    [JsonProperty("skjemainnhold")]
    [JsonPropertyName("skjemainnhold")]
    public Skjemainnhold skjemainnhold { get; set; }

  }

  public class Skjemainnhold
  {
    [XmlElement("metadata", Order = 1)]
    [JsonProperty("metadata")]
    [JsonPropertyName("metadata")]
    public Metadata metadata { get; set; }

    [XmlElement("integrasjon", Order = 2)]
    [JsonProperty("integrasjon")]
    [JsonPropertyName("integrasjon")]
    public Integrasjon integrasjon { get; set; }

    [XmlElement("skjemadata", Order = 3)]
    [JsonProperty("skjemadata")]
    [JsonPropertyName("skjemadata")]
    public Skjemadata skjemadata { get; set; }

  }

  public class Metadata
  {
    [XmlElement("tjeneste", Order = 1)]
    [JsonProperty("tjeneste")]
    [JsonPropertyName("tjeneste")]
    public string tjeneste { get; set; }

    [XmlElement("tjenestehandling", Order = 2)]
    [JsonProperty("tjenestehandling")]
    [JsonPropertyName("tjenestehandling")]
    public string tjenestehandling { get; set; }

  }

  public class Integrasjon
  {
    [XmlElement("hfHentPreutfyllingFeilet", Order = 1)]
    [JsonProperty("hfHentPreutfyllingFeilet")]
    [JsonPropertyName("hfHentPreutfyllingFeilet")]
    public bool? hfHentPreutfyllingFeilet { get; set; }

    public bool ShouldSerializehfHentPreutfyllingFeilet() => hfHentPreutfyllingFeilet.HasValue;

    [XmlElement("hfHentRollerFeilet", Order = 2)]
    [JsonProperty("hfHentRollerFeilet")]
    [JsonPropertyName("hfHentRollerFeilet")]
    public bool? hfHentRollerFeilet { get; set; }

    public bool ShouldSerializehfHentRollerFeilet() => hfHentRollerFeilet.HasValue;

  }

  public class Skjemadata
  {
    [XmlElement("rettighetsinformasjonsid", Order = 1)]
    [JsonProperty("rettighetsinformasjonsid")]
    [JsonPropertyName("rettighetsinformasjonsid")]
    public string rettighetsinformasjonsid { get; set; }

    [XmlElement("registreringsid", Order = 2)]
    [JsonProperty("registreringsid")]
    [JsonPropertyName("registreringsid")]
    public string registreringsid { get; set; }

    [XmlElement("endret", Order = 3)]
    [JsonProperty("endret")]
    [JsonPropertyName("endret")]
    public string endret { get; set; }

    [XmlElement("registreringspliktigVirksomhet", Order = 4)]
    [JsonProperty("registreringspliktigVirksomhet")]
    [JsonPropertyName("registreringspliktigVirksomhet")]
    public NorskVirksomhet registreringspliktigVirksomhet { get; set; }

    [XmlElement("reelleRettighetshavereidentifikasjon", Order = 5)]
    [JsonProperty("reelleRettighetshavereidentifikasjon")]
    [JsonPropertyName("reelleRettighetshavereidentifikasjon")]
    public string reelleRettighetshavereidentifikasjon { get; set; }

    [XmlElement("aarsakTilAtVirksomhetIkkeHarReelleRettighetshavere", Order = 6)]
    [JsonProperty("aarsakTilAtVirksomhetIkkeHarReelleRettighetshavere")]
    [JsonPropertyName("aarsakTilAtVirksomhetIkkeHarReelleRettighetshavere")]
    public AarsakTilAtVirksomhetIkkeHarReelleRettighetshavere aarsakTilAtVirksomhetIkkeHarReelleRettighetshavere { get; set; }

    [XmlElement("finnesDetReelleRettighetshavereITilleggTilRolleinnehavereForStiftelse", Order = 7)]
    [JsonProperty("finnesDetReelleRettighetshavereITilleggTilRolleinnehavereForStiftelse")]
    [JsonPropertyName("finnesDetReelleRettighetshavereITilleggTilRolleinnehavereForStiftelse")]
    public bool? finnesDetReelleRettighetshavereITilleggTilRolleinnehavereForStiftelse { get; set; }

    public bool ShouldSerializefinnesDetReelleRettighetshavereITilleggTilRolleinnehavereForStiftelse() => finnesDetReelleRettighetshavereITilleggTilRolleinnehavereForStiftelse.HasValue;

    [XmlElement("reellRettighetshaver", Order = 8)]
    [JsonProperty("reellRettighetshaver")]
    [JsonPropertyName("reellRettighetshaver")]
    public List<ReellRettighetshaver> reellRettighetshaver { get; set; }

    [XmlElement("kanIkkeIdentifisereFlereReelleRettighetshavere", Order = 9)]
    [JsonProperty("kanIkkeIdentifisereFlereReelleRettighetshavere")]
    [JsonPropertyName("kanIkkeIdentifisereFlereReelleRettighetshavere")]
    public bool? kanIkkeIdentifisereFlereReelleRettighetshavere { get; set; }

    public bool ShouldSerializekanIkkeIdentifisereFlereReelleRettighetshavere() => kanIkkeIdentifisereFlereReelleRettighetshavere.HasValue;

    [XmlElement("erVirksomhetRegistrertPaaRegulertMarked", Order = 10)]
    [JsonProperty("erVirksomhetRegistrertPaaRegulertMarked")]
    [JsonPropertyName("erVirksomhetRegistrertPaaRegulertMarked")]
    public bool? erVirksomhetRegistrertPaaRegulertMarked { get; set; }

    public bool ShouldSerializeerVirksomhetRegistrertPaaRegulertMarked() => erVirksomhetRegistrertPaaRegulertMarked.HasValue;

    [XmlElement("regulertMarked", Order = 11)]
    [JsonProperty("regulertMarked")]
    [JsonPropertyName("regulertMarked")]
    public Marked regulertMarked { get; set; }

    [XmlElement("erReelleRettighetshavereRegistrertIUtenlandskRegister", Order = 12)]
    [JsonProperty("erReelleRettighetshavereRegistrertIUtenlandskRegister")]
    [JsonPropertyName("erReelleRettighetshavereRegistrertIUtenlandskRegister")]
    public bool? erReelleRettighetshavereRegistrertIUtenlandskRegister { get; set; }

    public bool ShouldSerializeerReelleRettighetshavereRegistrertIUtenlandskRegister() => erReelleRettighetshavereRegistrertIUtenlandskRegister.HasValue;

    [XmlElement("utenlandskRegister", Order = 13)]
    [JsonProperty("utenlandskRegister")]
    [JsonPropertyName("utenlandskRegister")]
    public UtenlandskRegister utenlandskRegister { get; set; }

    [XmlElement("rolleinnehaver", Order = 14)]
    [JsonProperty("rolleinnehaver")]
    [JsonPropertyName("rolleinnehaver")]
    public List<Rolleinnehaver> rolleinnehaver { get; set; }

  }

  public class NorskVirksomhet
  {
    [XmlElement("organisasjonsnummer", Order = 1)]
    [JsonProperty("organisasjonsnummer")]
    [JsonPropertyName("organisasjonsnummer")]
    public string organisasjonsnummer { get; set; }

    [XmlElement("hfSoekOrganisasjonsnummerFeilkode", Order = 2)]
    [JsonProperty("hfSoekOrganisasjonsnummerFeilkode")]
    [JsonPropertyName("hfSoekOrganisasjonsnummerFeilkode")]
    public string hfSoekOrganisasjonsnummerFeilkode { get; set; }

    [XmlElement("hfNavn", Order = 3)]
    [JsonProperty("hfNavn")]
    [JsonPropertyName("hfNavn")]
    public string hfNavn { get; set; }

    [XmlElement("hfOrganisasjonsform", Order = 4)]
    [JsonProperty("hfOrganisasjonsform")]
    [JsonPropertyName("hfOrganisasjonsform")]
    public string hfOrganisasjonsform { get; set; }

    [XmlElement("hfForretningsadresse", Order = 5)]
    [JsonProperty("hfForretningsadresse")]
    [JsonPropertyName("hfForretningsadresse")]
    public string hfForretningsadresse { get; set; }

    [XmlElement("hfNavnPaaHovedvirksomhetRegistrertIEoes", Order = 6)]
    [JsonProperty("hfNavnPaaHovedvirksomhetRegistrertIEoes")]
    [JsonPropertyName("hfNavnPaaHovedvirksomhetRegistrertIEoes")]
    public string hfNavnPaaHovedvirksomhetRegistrertIEoes { get; set; }

    [XmlElement("hfLandnavnForHovedvirksomhetRegistrertIEoes", Order = 7)]
    [JsonProperty("hfLandnavnForHovedvirksomhetRegistrertIEoes")]
    [JsonPropertyName("hfLandnavnForHovedvirksomhetRegistrertIEoes")]
    public string hfLandnavnForHovedvirksomhetRegistrertIEoes { get; set; }

  }

  public class AarsakTilAtVirksomhetIkkeHarReelleRettighetshavere
  {
    [XmlElement("erEidEllerKontrollertAvOffentligVirksomhet", Order = 1)]
    [JsonProperty("erEidEllerKontrollertAvOffentligVirksomhet")]
    [JsonPropertyName("erEidEllerKontrollertAvOffentligVirksomhet")]
    [Required]
    public bool? erEidEllerKontrollertAvOffentligVirksomhet { get; set; }

    [XmlElement("erOffentligVirksomhetUtenlandsk", Order = 2)]
    [JsonProperty("erOffentligVirksomhetUtenlandsk")]
    [JsonPropertyName("erOffentligVirksomhetUtenlandsk")]
    public bool? erOffentligVirksomhetUtenlandsk { get; set; }

    public bool ShouldSerializeerOffentligVirksomhetUtenlandsk() => erOffentligVirksomhetUtenlandsk.HasValue;

  }

  public class ReellRettighetshaver
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("erRegistrertIFolkeregisteret", Order = 1)]
    [JsonProperty("erRegistrertIFolkeregisteret")]
    [JsonPropertyName("erRegistrertIFolkeregisteret")]
    [Required]
    public bool? erRegistrertIFolkeregisteret { get; set; }

    [XmlElement("hfErPreutfylt", Order = 2)]
    [JsonProperty("hfErPreutfylt")]
    [JsonPropertyName("hfErPreutfylt")]
    public bool? hfErPreutfylt { get; set; }

    public bool ShouldSerializehfErPreutfylt() => hfErPreutfylt.HasValue;

    [XmlElement("foedselsEllerDNummer", Order = 3)]
    [JsonProperty("foedselsEllerDNummer")]
    [JsonPropertyName("foedselsEllerDNummer")]
    public string foedselsEllerDNummer { get; set; }

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("foedselsdato", Order = 4)]
    [JsonProperty("foedselsdato")]
    [JsonPropertyName("foedselsdato")]
    public string foedselsdato { get; set; }

    [XmlElement("fulltNavn", Order = 5)]
    [JsonProperty("fulltNavn")]
    [JsonPropertyName("fulltNavn")]
    public string fulltNavn { get; set; }

    [XmlElement("hfEtternavnForFolkeregistrertPerson", Order = 6)]
    [JsonProperty("hfEtternavnForFolkeregistrertPerson")]
    [JsonPropertyName("hfEtternavnForFolkeregistrertPerson")]
    public string hfEtternavnForFolkeregistrertPerson { get; set; }

    [Range(Int64.MinValue,Int64.MaxValue)]
    [XmlElement("hfSoekFolkeregistrertPersonFeilkode", Order = 7)]
    [JsonProperty("hfSoekFolkeregistrertPersonFeilkode")]
    [JsonPropertyName("hfSoekFolkeregistrertPersonFeilkode")]
    public long? hfSoekFolkeregistrertPersonFeilkode { get; set; }

    public bool ShouldSerializehfSoekFolkeregistrertPersonFeilkode() => hfSoekFolkeregistrertPersonFeilkode.HasValue;

    [XmlElement("statsborgerskap", Order = 8)]
    [JsonProperty("statsborgerskap")]
    [JsonPropertyName("statsborgerskap")]
    public string statsborgerskap { get; set; }

    [XmlElement("bostedsland", Order = 9)]
    [JsonProperty("bostedsland")]
    [JsonPropertyName("bostedsland")]
    public string bostedsland { get; set; }

    [XmlElement("harPosisjonEierskap", Order = 10)]
    [JsonProperty("harPosisjonEierskap")]
    [JsonPropertyName("harPosisjonEierskap")]
    public bool? harPosisjonEierskap { get; set; }

    public bool ShouldSerializeharPosisjonEierskap() => harPosisjonEierskap.HasValue;

    [XmlElement("posisjonEierskap", Order = 11)]
    [JsonProperty("posisjonEierskap")]
    [JsonPropertyName("posisjonEierskap")]
    public Posisjon posisjonEierskap { get; set; }

    [XmlElement("harPosisjonKontrollOverStemmerettigheter", Order = 12)]
    [JsonProperty("harPosisjonKontrollOverStemmerettigheter")]
    [JsonPropertyName("harPosisjonKontrollOverStemmerettigheter")]
    public bool? harPosisjonKontrollOverStemmerettigheter { get; set; }

    public bool ShouldSerializeharPosisjonKontrollOverStemmerettigheter() => harPosisjonKontrollOverStemmerettigheter.HasValue;

    [XmlElement("posisjonKontrollOverStemmerettigheter", Order = 13)]
    [JsonProperty("posisjonKontrollOverStemmerettigheter")]
    [JsonPropertyName("posisjonKontrollOverStemmerettigheter")]
    public Posisjon posisjonKontrollOverStemmerettigheter { get; set; }

    [XmlElement("harPosisjonRettTilAaUtpekeEllerAvsetteMinstHalvpartenAvStyremedlemmene", Order = 14)]
    [JsonProperty("harPosisjonRettTilAaUtpekeEllerAvsetteMinstHalvpartenAvStyremedlemmene")]
    [JsonPropertyName("harPosisjonRettTilAaUtpekeEllerAvsetteMinstHalvpartenAvStyremedlemmene")]
    public bool? harPosisjonRettTilAaUtpekeEllerAvsetteMinstHalvpartenAvStyremedlemmene { get; set; }

    public bool ShouldSerializeharPosisjonRettTilAaUtpekeEllerAvsetteMinstHalvpartenAvStyremedlemmene() => harPosisjonRettTilAaUtpekeEllerAvsetteMinstHalvpartenAvStyremedlemmene.HasValue;

    [XmlElement("grunnlagForPosisjonenRettTilAaUtpekeEllerAvsetteMinstHalvpartenAvStyremedlemmene", Order = 15)]
    [JsonProperty("grunnlagForPosisjonenRettTilAaUtpekeEllerAvsetteMinstHalvpartenAvStyremedlemmene")]
    [JsonPropertyName("grunnlagForPosisjonenRettTilAaUtpekeEllerAvsetteMinstHalvpartenAvStyremedlemmene")]
    public string grunnlagForPosisjonenRettTilAaUtpekeEllerAvsetteMinstHalvpartenAvStyremedlemmene { get; set; }

    [XmlElement("harPosisjonKontrollPaaAnnenMaate", Order = 16)]
    [JsonProperty("harPosisjonKontrollPaaAnnenMaate")]
    [JsonPropertyName("harPosisjonKontrollPaaAnnenMaate")]
    public bool? harPosisjonKontrollPaaAnnenMaate { get; set; }

    public bool ShouldSerializeharPosisjonKontrollPaaAnnenMaate() => harPosisjonKontrollPaaAnnenMaate.HasValue;

    [XmlElement("beskrivelseAvPosisjonenKontrollPaaAnnenMaate", Order = 17)]
    [JsonProperty("beskrivelseAvPosisjonenKontrollPaaAnnenMaate")]
    [JsonPropertyName("beskrivelseAvPosisjonenKontrollPaaAnnenMaate")]
    public string beskrivelseAvPosisjonenKontrollPaaAnnenMaate { get; set; }

    [XmlElement("harPosisjonAvgittGrunnkapital", Order = 18)]
    [JsonProperty("harPosisjonAvgittGrunnkapital")]
    [JsonPropertyName("harPosisjonAvgittGrunnkapital")]
    public bool? harPosisjonAvgittGrunnkapital { get; set; }

    public bool ShouldSerializeharPosisjonAvgittGrunnkapital() => harPosisjonAvgittGrunnkapital.HasValue;

    [XmlElement("posisjonAvgittGrunnkapital", Order = 19)]
    [JsonProperty("posisjonAvgittGrunnkapital")]
    [JsonPropertyName("posisjonAvgittGrunnkapital")]
    public PosisjonForStiftelse posisjonAvgittGrunnkapital { get; set; }

    [XmlElement("harPosisjonRettTilAaUtpekeEtFlertallAvStyremedlemmene", Order = 20)]
    [JsonProperty("harPosisjonRettTilAaUtpekeEtFlertallAvStyremedlemmene")]
    [JsonPropertyName("harPosisjonRettTilAaUtpekeEtFlertallAvStyremedlemmene")]
    public bool? harPosisjonRettTilAaUtpekeEtFlertallAvStyremedlemmene { get; set; }

    public bool ShouldSerializeharPosisjonRettTilAaUtpekeEtFlertallAvStyremedlemmene() => harPosisjonRettTilAaUtpekeEtFlertallAvStyremedlemmene.HasValue;

    [XmlElement("posisjonRettTilAaUtpekeEtFlertallAvStyremedlemmene", Order = 21)]
    [JsonProperty("posisjonRettTilAaUtpekeEtFlertallAvStyremedlemmene")]
    [JsonPropertyName("posisjonRettTilAaUtpekeEtFlertallAvStyremedlemmene")]
    public PosisjonForStiftelse posisjonRettTilAaUtpekeEtFlertallAvStyremedlemmene { get; set; }

    [XmlElement("harPosisjonSaerligeRettigheter", Order = 22)]
    [JsonProperty("harPosisjonSaerligeRettigheter")]
    [JsonPropertyName("harPosisjonSaerligeRettigheter")]
    public bool? harPosisjonSaerligeRettigheter { get; set; }

    public bool ShouldSerializeharPosisjonSaerligeRettigheter() => harPosisjonSaerligeRettigheter.HasValue;

    [XmlElement("posisjonSaerligeRettigheter", Order = 23)]
    [JsonProperty("posisjonSaerligeRettigheter")]
    [JsonPropertyName("posisjonSaerligeRettigheter")]
    public PosisjonForStiftelse posisjonSaerligeRettigheter { get; set; }

    [XmlElement("harPosisjonDestinatar", Order = 24)]
    [JsonProperty("harPosisjonDestinatar")]
    [JsonPropertyName("harPosisjonDestinatar")]
    public bool? harPosisjonDestinatar { get; set; }

    public bool ShouldSerializeharPosisjonDestinatar() => harPosisjonDestinatar.HasValue;

    [XmlElement("posisjonDestinatar", Order = 25)]
    [JsonProperty("posisjonDestinatar")]
    [JsonPropertyName("posisjonDestinatar")]
    public PosisjonForStiftelse posisjonDestinatar { get; set; }

    [XmlElement("hfPosisjonsbeskrivelse", Order = 26)]
    [JsonProperty("hfPosisjonsbeskrivelse")]
    [JsonPropertyName("hfPosisjonsbeskrivelse")]
    public string hfPosisjonsbeskrivelse { get; set; }

  }

  public class Posisjon
  {
    [XmlElement("stoerrelsesintervall", Order = 1)]
    [JsonProperty("stoerrelsesintervall")]
    [JsonPropertyName("stoerrelsesintervall")]
    public string stoerrelsesintervall { get; set; }

    [XmlElement("grunnlag", Order = 2)]
    [JsonProperty("grunnlag")]
    [JsonPropertyName("grunnlag")]
    public string grunnlag { get; set; }

    [XmlElement("mellomliggendeVirksomhet", Order = 3)]
    [JsonProperty("mellomliggendeVirksomhet")]
    [JsonPropertyName("mellomliggendeVirksomhet")]
    public List<MellomliggendeVirksomhet> mellomliggendeVirksomhet { get; set; }

  }

  public class MellomliggendeVirksomhet
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("erUtenlandskVirksomhet", Order = 1)]
    [JsonProperty("erUtenlandskVirksomhet")]
    [JsonPropertyName("erUtenlandskVirksomhet")]
    [Required]
    public bool? erUtenlandskVirksomhet { get; set; }

    [XmlElement("norskVirksomhet", Order = 2)]
    [JsonProperty("norskVirksomhet")]
    [JsonPropertyName("norskVirksomhet")]
    public NorskVirksomhet norskVirksomhet { get; set; }

    [XmlElement("utenlandskVirksomhet", Order = 3)]
    [JsonProperty("utenlandskVirksomhet")]
    [JsonPropertyName("utenlandskVirksomhet")]
    public UtenlandskVirksomhet utenlandskVirksomhet { get; set; }

    [XmlElement("hfOrganisasjonsnummerEllerRegistreringsnummerIHjemlandet", Order = 4)]
    [JsonProperty("hfOrganisasjonsnummerEllerRegistreringsnummerIHjemlandet")]
    [JsonPropertyName("hfOrganisasjonsnummerEllerRegistreringsnummerIHjemlandet")]
    public string hfOrganisasjonsnummerEllerRegistreringsnummerIHjemlandet { get; set; }

    [XmlElement("hfNavn", Order = 5)]
    [JsonProperty("hfNavn")]
    [JsonPropertyName("hfNavn")]
    public string hfNavn { get; set; }

    [XmlElement("hfLandnavn", Order = 6)]
    [JsonProperty("hfLandnavn")]
    [JsonPropertyName("hfLandnavn")]
    public string hfLandnavn { get; set; }

  }

  public class UtenlandskVirksomhet
  {
    [XmlElement("registreringsnummerIHjemlandet", Order = 1)]
    [JsonProperty("registreringsnummerIHjemlandet")]
    [JsonPropertyName("registreringsnummerIHjemlandet")]
    public string registreringsnummerIHjemlandet { get; set; }

    [XmlElement("navn", Order = 2)]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    public string navn { get; set; }

    [XmlElement("adresse", Order = 3)]
    [JsonProperty("adresse")]
    [JsonPropertyName("adresse")]
    public InternasjonalAdresse adresse { get; set; }

  }

  public class InternasjonalAdresse
  {
    [XmlElement("friAdressetekst1", Order = 1)]
    [JsonProperty("friAdressetekst1")]
    [JsonPropertyName("friAdressetekst1")]
    public string friAdressetekst1 { get; set; }

    [XmlElement("friAdressetekst2", Order = 2)]
    [JsonProperty("friAdressetekst2")]
    [JsonPropertyName("friAdressetekst2")]
    public string friAdressetekst2 { get; set; }

    [XmlElement("friAdressetekst3", Order = 3)]
    [JsonProperty("friAdressetekst3")]
    [JsonPropertyName("friAdressetekst3")]
    public string friAdressetekst3 { get; set; }

    [XmlElement("landkode", Order = 4)]
    [JsonProperty("landkode")]
    [JsonPropertyName("landkode")]
    public string landkode { get; set; }

  }

  public class PosisjonForStiftelse
  {
    [XmlElement("grunnlag", Order = 1)]
    [JsonProperty("grunnlag")]
    [JsonPropertyName("grunnlag")]
    public string grunnlag { get; set; }

    [XmlElement("mellomliggendeVirksomhet", Order = 2)]
    [JsonProperty("mellomliggendeVirksomhet")]
    [JsonPropertyName("mellomliggendeVirksomhet")]
    public List<MellomliggendeVirksomhet> mellomliggendeVirksomhet { get; set; }

  }

  public class Marked
  {
    [XmlElement("markedstype", Order = 1)]
    [JsonProperty("markedstype")]
    [JsonPropertyName("markedstype")]
    public string markedstype { get; set; }

    [XmlElement("hfLandnavn", Order = 2)]
    [JsonProperty("hfLandnavn")]
    [JsonPropertyName("hfLandnavn")]
    public string hfLandnavn { get; set; }

    [XmlElement("hfInternettadresse", Order = 3)]
    [JsonProperty("hfInternettadresse")]
    [JsonPropertyName("hfInternettadresse")]
    public string hfInternettadresse { get; set; }

    [XmlElement("detaljerForMarkedstypeAnnen", Order = 4)]
    [JsonProperty("detaljerForMarkedstypeAnnen")]
    [JsonPropertyName("detaljerForMarkedstypeAnnen")]
    public MarkedstypeAnnen detaljerForMarkedstypeAnnen { get; set; }

  }

  public class MarkedstypeAnnen
  {
    [XmlElement("navn", Order = 1)]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    public string navn { get; set; }

    [XmlElement("landkode", Order = 2)]
    [JsonProperty("landkode")]
    [JsonPropertyName("landkode")]
    public string landkode { get; set; }

  }

  public class UtenlandskRegister
  {
    [XmlElement("registertype", Order = 1)]
    [JsonProperty("registertype")]
    [JsonPropertyName("registertype")]
    public string registertype { get; set; }

    [XmlElement("hfLandnavn", Order = 2)]
    [JsonProperty("hfLandnavn")]
    [JsonPropertyName("hfLandnavn")]
    public string hfLandnavn { get; set; }

    [XmlElement("hfNavn", Order = 3)]
    [JsonProperty("hfNavn")]
    [JsonPropertyName("hfNavn")]
    public string hfNavn { get; set; }

  }

  public class Rolleinnehaver
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("foedselsdato", Order = 1)]
    [JsonProperty("foedselsdato")]
    [JsonPropertyName("foedselsdato")]
    public string foedselsdato { get; set; }

    [XmlElement("fulltNavn", Order = 2)]
    [JsonProperty("fulltNavn")]
    [JsonPropertyName("fulltNavn")]
    public string fulltNavn { get; set; }

    [XmlElement("rolle", Order = 3)]
    [JsonProperty("rolle")]
    [JsonPropertyName("rolle")]
    public string rolle { get; set; }

  }
}
