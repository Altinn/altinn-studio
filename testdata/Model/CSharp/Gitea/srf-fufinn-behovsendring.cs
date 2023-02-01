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
  public class Fufinn
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
    [XmlElement("andreBehov", Order = 1)]
    [JsonProperty("andreBehov")]
    [JsonPropertyName("andreBehov")]
    public string andreBehov { get; set; }

    [XmlElement("bank", Order = 2)]
    [JsonProperty("bank")]
    [JsonPropertyName("bank")]
    public Bank bank { get; set; }

    [XmlElement("forsikringsselskap", Order = 3)]
    [JsonProperty("forsikringsselskap")]
    [JsonPropertyName("forsikringsselskap")]
    public Forsikringsselskap forsikringsselskap { get; set; }

    [XmlElement("helfo", Order = 4)]
    [JsonProperty("helfo")]
    [JsonPropertyName("helfo")]
    public Helfo helfo { get; set; }

    [XmlElement("husbanken", Order = 5)]
    [JsonProperty("husbanken")]
    [JsonPropertyName("husbanken")]
    public Husbanken husbanken { get; set; }

    [XmlElement("inkassoselskap", Order = 6)]
    [JsonProperty("inkassoselskap")]
    [JsonPropertyName("inkassoselskap")]
    public Inkassoselskap inkassoselskap { get; set; }

    [XmlElement("innkreving", Order = 7)]
    [JsonProperty("innkreving")]
    [JsonPropertyName("innkreving")]
    public Innkreving innkreving { get; set; }

    [XmlElement("kartverket", Order = 8)]
    [JsonProperty("kartverket")]
    [JsonPropertyName("kartverket")]
    public Kartverket kartverket { get; set; }

    [XmlElement("kommune", Order = 9)]
    [JsonProperty("kommune")]
    [JsonPropertyName("kommune")]
    public Kommune kommune { get; set; }

    [XmlElement("kredittvurderingsselskap", Order = 10)]
    [JsonProperty("kredittvurderingsselskap")]
    [JsonPropertyName("kredittvurderingsselskap")]
    public Kredittvurderingsselskap kredittvurderingsselskap { get; set; }

    [XmlElement("namsmannen", Order = 11)]
    [JsonProperty("namsmannen")]
    [JsonPropertyName("namsmannen")]
    public Namsmannen namsmannen { get; set; }

    [XmlElement("nav", Order = 12)]
    [JsonProperty("nav")]
    [JsonPropertyName("nav")]
    public Nav nav { get; set; }

    [XmlElement("pasientreiser", Order = 13)]
    [JsonProperty("pasientreiser")]
    [JsonPropertyName("pasientreiser")]
    public Pasientreiser pasientreiser { get; set; }

    [XmlElement("skatteetaten", Order = 14)]
    [JsonProperty("skatteetaten")]
    [JsonPropertyName("skatteetaten")]
    public Skatteetaten skatteetaten { get; set; }

    [XmlElement("tingretten", Order = 15)]
    [JsonProperty("tingretten")]
    [JsonPropertyName("tingretten")]
    public Tingretten tingretten { get; set; }

    [XmlElement("oevrige", Order = 16)]
    [JsonProperty("oevrige")]
    [JsonPropertyName("oevrige")]
    public OEvrige oevrige { get; set; }

    [XmlElement("statsforvalter", Order = 17)]
    [JsonProperty("statsforvalter")]
    [JsonPropertyName("statsforvalter")]
    public Statsforvalter statsforvalter { get; set; }

    [XmlElement("vergehaver", Order = 18)]
    [JsonProperty("vergehaver")]
    [JsonPropertyName("vergehaver")]
    public Vergehaver vergehaver { get; set; }

    [XmlElement("hjelpeapparat", Order = 19)]
    [JsonProperty("hjelpeapparat")]
    [JsonPropertyName("hjelpeapparat")]
    public Hjelpeapparat hjelpeapparat { get; set; }

    [XmlElement("endringEllerNy", Order = 20)]
    [JsonProperty("endringEllerNy")]
    [JsonPropertyName("endringEllerNy")]
    public string endringEllerNy { get; set; }

    [XmlElement("innsenderRelasjon", Order = 21)]
    [JsonProperty("innsenderRelasjon")]
    [JsonPropertyName("innsenderRelasjon")]
    public string innsenderRelasjon { get; set; }

  }

  public class Bank
  {
    [XmlElement("bankRepresentasjon", Order = 1)]
    [JsonProperty("bankRepresentasjon")]
    [JsonPropertyName("bankRepresentasjon")]
    public string bankRepresentasjon { get; set; }

    [XmlElement("bankLaan", Order = 2)]
    [JsonProperty("bankLaan")]
    [JsonPropertyName("bankLaan")]
    public string bankLaan { get; set; }

  }

  public class Forsikringsselskap
  {
    [XmlElement("forsikringForvalte", Order = 1)]
    [JsonProperty("forsikringForvalte")]
    [JsonPropertyName("forsikringForvalte")]
    public string forsikringForvalte { get; set; }

  }

  public class Helfo
  {
    [XmlElement("helfoRefusjon", Order = 1)]
    [JsonProperty("helfoRefusjon")]
    [JsonPropertyName("helfoRefusjon")]
    public string helfoRefusjon { get; set; }

    [XmlElement("helfoFastlege", Order = 2)]
    [JsonProperty("helfoFastlege")]
    [JsonPropertyName("helfoFastlege")]
    public string helfoFastlege { get; set; }

  }

  public class Husbanken
  {
    [XmlElement("husbankenBostoette", Order = 1)]
    [JsonProperty("husbankenBostoette")]
    [JsonPropertyName("husbankenBostoette")]
    public string husbankenBostoette { get; set; }

    [XmlElement("husbankenStartlaan", Order = 2)]
    [JsonProperty("husbankenStartlaan")]
    [JsonPropertyName("husbankenStartlaan")]
    public string husbankenStartlaan { get; set; }

  }

  public class Inkassoselskap
  {
    [XmlElement("inkasseForhandle", Order = 1)]
    [JsonProperty("inkasseForhandle")]
    [JsonPropertyName("inkasseForhandle")]
    public string inkasseForhandle { get; set; }

  }

  public class Innkreving
  {
    [XmlElement("innkrevingGjeldsordning", Order = 1)]
    [JsonProperty("innkrevingGjeldsordning")]
    [JsonPropertyName("innkrevingGjeldsordning")]
    public string innkrevingGjeldsordning { get; set; }

  }

  public class Kartverket
  {
    [XmlElement("kartSalgEiendom", Order = 1)]
    [JsonProperty("kartSalgEiendom")]
    [JsonPropertyName("kartSalgEiendom")]
    public string kartSalgEiendom { get; set; }

    [XmlElement("kartKjoepEiendom", Order = 2)]
    [JsonProperty("kartKjoepEiendom")]
    [JsonPropertyName("kartKjoepEiendom")]
    public string kartKjoepEiendom { get; set; }

    [XmlElement("kartArv", Order = 3)]
    [JsonProperty("kartArv")]
    [JsonPropertyName("kartArv")]
    public string kartArv { get; set; }

    [XmlElement("kartEndreEiendom", Order = 4)]
    [JsonProperty("kartEndreEiendom")]
    [JsonPropertyName("kartEndreEiendom")]
    public string kartEndreEiendom { get; set; }

    [XmlElement("kartAvtaler", Order = 5)]
    [JsonProperty("kartAvtaler")]
    [JsonPropertyName("kartAvtaler")]
    public string kartAvtaler { get; set; }

    [XmlElement("kartSletting", Order = 6)]
    [JsonProperty("kartSletting")]
    [JsonPropertyName("kartSletting")]
    public string kartSletting { get; set; }

    [XmlElement("kartLaaneopptak", Order = 7)]
    [JsonProperty("kartLaaneopptak")]
    [JsonPropertyName("kartLaaneopptak")]
    public string kartLaaneopptak { get; set; }

  }

  public class Kommune
  {
    [XmlElement("kommuneBygg", Order = 1)]
    [JsonProperty("kommuneBygg")]
    [JsonPropertyName("kommuneBygg")]
    public string kommuneBygg { get; set; }

    [XmlElement("kommuneHelse", Order = 2)]
    [JsonProperty("kommuneHelse")]
    [JsonPropertyName("kommuneHelse")]
    public string kommuneHelse { get; set; }

    [XmlElement("kommuneSosial", Order = 3)]
    [JsonProperty("kommuneSosial")]
    [JsonPropertyName("kommuneSosial")]
    public string kommuneSosial { get; set; }

    [XmlElement("kommuneSkole", Order = 4)]
    [JsonProperty("kommuneSkole")]
    [JsonPropertyName("kommuneSkole")]
    public string kommuneSkole { get; set; }

    [XmlElement("kommuneSkatt", Order = 5)]
    [JsonProperty("kommuneSkatt")]
    [JsonPropertyName("kommuneSkatt")]
    public string kommuneSkatt { get; set; }

  }

  public class Kredittvurderingsselskap
  {
    [XmlElement("kredittKredittsperre", Order = 1)]
    [JsonProperty("kredittKredittsperre")]
    [JsonPropertyName("kredittKredittsperre")]
    public string kredittKredittsperre { get; set; }

  }

  public class Namsmannen
  {
    [XmlElement("namsmannenGjeldsordning", Order = 1)]
    [JsonProperty("namsmannenGjeldsordning")]
    [JsonPropertyName("namsmannenGjeldsordning")]
    public string namsmannenGjeldsordning { get; set; }

    [XmlElement("namsmannenTvangsfullbyrdelse", Order = 2)]
    [JsonProperty("namsmannenTvangsfullbyrdelse")]
    [JsonPropertyName("namsmannenTvangsfullbyrdelse")]
    public string namsmannenTvangsfullbyrdelse { get; set; }

  }

  public class Nav
  {
    [XmlElement("navArbeid", Order = 1)]
    [JsonProperty("navArbeid")]
    [JsonPropertyName("navArbeid")]
    public string navArbeid { get; set; }

    [XmlElement("navFamilie", Order = 2)]
    [JsonProperty("navFamilie")]
    [JsonPropertyName("navFamilie")]
    public string navFamilie { get; set; }

    [XmlElement("navHjelpemidler", Order = 3)]
    [JsonProperty("navHjelpemidler")]
    [JsonPropertyName("navHjelpemidler")]
    public string navHjelpemidler { get; set; }

    [XmlElement("navPensjon", Order = 4)]
    [JsonProperty("navPensjon")]
    [JsonPropertyName("navPensjon")]
    public string navPensjon { get; set; }

    [XmlElement("navSosial", Order = 5)]
    [JsonProperty("navSosial")]
    [JsonPropertyName("navSosial")]
    public string navSosial { get; set; }

  }

  public class Pasientreiser
  {
    [XmlElement("pasientRefusjon", Order = 1)]
    [JsonProperty("pasientRefusjon")]
    [JsonPropertyName("pasientRefusjon")]
    public string pasientRefusjon { get; set; }

  }

  public class Skatteetaten
  {
    [XmlElement("skattInnkreving", Order = 1)]
    [JsonProperty("skattInnkreving")]
    [JsonPropertyName("skattInnkreving")]
    public string skattInnkreving { get; set; }

    [XmlElement("skattPostadresse", Order = 2)]
    [JsonProperty("skattPostadresse")]
    [JsonPropertyName("skattPostadresse")]
    public string skattPostadresse { get; set; }

    [XmlElement("skattFlytting", Order = 3)]
    [JsonProperty("skattFlytting")]
    [JsonPropertyName("skattFlytting")]
    public string skattFlytting { get; set; }

    [XmlElement("skattSkatt", Order = 4)]
    [JsonProperty("skattSkatt")]
    [JsonPropertyName("skattSkatt")]
    public string skattSkatt { get; set; }

  }

  public class Tingretten
  {
    [XmlElement("tingrettUskifte", Order = 1)]
    [JsonProperty("tingrettUskifte")]
    [JsonPropertyName("tingrettUskifte")]
    public string tingrettUskifte { get; set; }

    [XmlElement("tingrettPrivatDoedsbo", Order = 2)]
    [JsonProperty("tingrettPrivatDoedsbo")]
    [JsonPropertyName("tingrettPrivatDoedsbo")]
    public string tingrettPrivatDoedsbo { get; set; }

    [XmlElement("tingrettBegjaereDoedsbo", Order = 3)]
    [JsonProperty("tingrettBegjaereDoedsbo")]
    [JsonPropertyName("tingrettBegjaereDoedsbo")]
    public string tingrettBegjaereDoedsbo { get; set; }

  }

  public class OEvrige
  {
    [XmlElement("oevrigeKjoepVarer", Order = 1)]
    [JsonProperty("oevrigeKjoepVarer")]
    [JsonPropertyName("oevrigeKjoepVarer")]
    public string oevrigeKjoepVarer { get; set; }

    [XmlElement("oevrigeHusleiekontrakt", Order = 2)]
    [JsonProperty("oevrigeHusleiekontrakt")]
    [JsonPropertyName("oevrigeHusleiekontrakt")]
    public string oevrigeHusleiekontrakt { get; set; }

    [XmlElement("oevrigeLoesoere", Order = 3)]
    [JsonProperty("oevrigeLoesoere")]
    [JsonPropertyName("oevrigeLoesoere")]
    public string oevrigeLoesoere { get; set; }

    [XmlElement("oevrigeUtgifter", Order = 4)]
    [JsonProperty("oevrigeUtgifter")]
    [JsonPropertyName("oevrigeUtgifter")]
    public string oevrigeUtgifter { get; set; }

    [XmlElement("oevrigeAvslutteHusleie", Order = 5)]
    [JsonProperty("oevrigeAvslutteHusleie")]
    [JsonPropertyName("oevrigeAvslutteHusleie")]
    public string oevrigeAvslutteHusleie { get; set; }

  }

  public class Statsforvalter
  {
    [XmlElement("statsforvalterTvangsvedtak", Order = 1)]
    [JsonProperty("statsforvalterTvangsvedtak")]
    [JsonPropertyName("statsforvalterTvangsvedtak")]
    public string statsforvalterTvangsvedtak { get; set; }

    [XmlElement("statsforvalterSamtykke", Order = 2)]
    [JsonProperty("statsforvalterSamtykke")]
    [JsonPropertyName("statsforvalterSamtykke")]
    public string statsforvalterSamtykke { get; set; }

  }

  public class Vergehaver
  {
    [XmlElement("telefonsamtaleMulig", Order = 1)]
    [JsonProperty("telefonsamtaleMulig")]
    [JsonPropertyName("telefonsamtaleMulig")]
    public string telefonsamtaleMulig { get; set; }

    [XmlElement("telefonsamtaleHvorfor", Order = 2)]
    [JsonProperty("telefonsamtaleHvorfor")]
    [JsonPropertyName("telefonsamtaleHvorfor")]
    public string telefonsamtaleHvorfor { get; set; }

    [XmlElement("borPaaInstitusjon", Order = 3)]
    [JsonProperty("borPaaInstitusjon")]
    [JsonPropertyName("borPaaInstitusjon")]
    public string borPaaInstitusjon { get; set; }

    [XmlElement("hvilkenInstitusjon", Order = 4)]
    [JsonProperty("hvilkenInstitusjon")]
    [JsonPropertyName("hvilkenInstitusjon")]
    public string hvilkenInstitusjon { get; set; }

    [XmlElement("adresse", Order = 5)]
    [JsonProperty("adresse")]
    [JsonPropertyName("adresse")]
    public Adresse adresse { get; set; }

    [RegularExpression(@"^([+]?(\d{8,15}))$")]
    [XmlElement("telefonnummer", Order = 6)]
    [JsonProperty("telefonnummer")]
    [JsonPropertyName("telefonnummer")]
    public string telefonnummer { get; set; }

  }

  public class Hjelpeapparat
  {
    [RegularExpression(@"^([+]?(\d{8,15}))$")]
    [XmlElement("telefonnummer", Order = 1)]
    [JsonProperty("telefonnummer")]
    [JsonPropertyName("telefonnummer")]
    public string telefonnummer { get; set; }

    [XmlElement("navn", Order = 2)]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    public string navn { get; set; }

  }
}
