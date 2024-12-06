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
  [XmlRoot(ElementName="ePOB_M")]
  public class ePOB_M
  {
    [XmlElement("ArbeidsErfaring", Order = 1)]
    [JsonProperty("ArbeidsErfaring")]
    [JsonPropertyName("ArbeidsErfaring")]
    public List<Arbeidserfaringer> ArbeidsErfaring { get; set; }

    [XmlElement("PersonInformasjon", Order = 2)]
    [JsonProperty("PersonInformasjon")]
    [JsonPropertyName("PersonInformasjon")]
    public Personalia PersonInformasjon { get; set; }

    [XmlElement("PersonRelasjoner", Order = 3)]
    [JsonProperty("PersonRelasjoner")]
    [JsonPropertyName("PersonRelasjoner")]
    public Relasjoner PersonRelasjoner { get; set; }

    [XmlElement("Samboerellerektefelle", Order = 4)]
    [JsonProperty("Samboerellerektefelle")]
    [JsonPropertyName("Samboerellerektefelle")]
    public Samboerektefelle Samboerellerektefelle { get; set; }

    [XmlElement("PersonligOkonomi", Order = 5)]
    [JsonProperty("PersonligOkonomi")]
    [JsonPropertyName("PersonligOkonomi")]
    public OEkonomi PersonligOkonomi { get; set; }

    [XmlElement("Straff", Order = 6)]
    [JsonProperty("Straff")]
    [JsonPropertyName("Straff")]
    public Strafferettslig Straff { get; set; }

    [XmlElement("PersonRusmidler", Order = 7)]
    [JsonProperty("PersonRusmidler")]
    [JsonPropertyName("PersonRusmidler")]
    public Rusmidler PersonRusmidler { get; set; }

    [XmlElement("SikkerhetsOpplysninger", Order = 8)]
    [JsonProperty("SikkerhetsOpplysninger")]
    [JsonPropertyName("SikkerhetsOpplysninger")]
    public Sikkerhetsopplysninger SikkerhetsOpplysninger { get; set; }

    [XmlElement("StatsTilknytning", Order = 9)]
    [JsonProperty("StatsTilknytning")]
    [JsonPropertyName("StatsTilknytning")]
    public Statstilknytning StatsTilknytning { get; set; }

    [XmlElement("HelsePerson", Order = 10)]
    [JsonProperty("HelsePerson")]
    [JsonPropertyName("HelsePerson")]
    public Helse HelsePerson { get; set; }

    [XmlElement("HistorikkBostederUtland", Order = 11)]
    [JsonProperty("HistorikkBostederUtland")]
    [JsonPropertyName("HistorikkBostederUtland")]
    public List<Bostedhistorikkutland> HistorikkBostederUtland { get; set; }

    [XmlElement("HistorikkBostederEU", Order = 12)]
    [JsonProperty("HistorikkBostederEU")]
    [JsonPropertyName("HistorikkBostederEU")]
    public List<Bostedhistorikkeu> HistorikkBostederEU { get; set; }

    [XmlElement("TidligereNavn", Order = 13)]
    [JsonProperty("TidligereNavn")]
    [JsonPropertyName("TidligereNavn")]
    public List<Person> TidligereNavn { get; set; }

    [XmlElement("FlereGjeldendeStatsborgerskap", Order = 14)]
    [JsonProperty("FlereGjeldendeStatsborgerskap")]
    [JsonPropertyName("FlereGjeldendeStatsborgerskap")]
    public List<Statsborgerskap> FlereGjeldendeStatsborgerskap { get; set; }

    [XmlElement("TidligereStatsborgerskap", Order = 15)]
    [JsonProperty("TidligereStatsborgerskap")]
    [JsonPropertyName("TidligereStatsborgerskap")]
    public List<Statsborgerskap> TidligereStatsborgerskap { get; set; }

    [XmlElement("DeusRequest", Order = 16)]
    [JsonProperty("DeusRequest")]
    [JsonPropertyName("DeusRequest")]
    public Deusrequest DeusRequest { get; set; }

  }

  public class Arbeidserfaringer
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("fraaar", Order = 1)]
    [JsonProperty("fraaar")]
    [JsonPropertyName("fraaar")]
    public string fraaar { get; set; }

    [XmlElement("tilaar", Order = 2)]
    [JsonProperty("tilaar")]
    [JsonPropertyName("tilaar")]
    public string tilaar { get; set; }

    [XmlElement("stilling", Order = 3)]
    [JsonProperty("stilling")]
    [JsonPropertyName("stilling")]
    public string stilling { get; set; }

    [XmlElement("type", Order = 4)]
    [JsonProperty("type")]
    [JsonPropertyName("type")]
    public string type { get; set; }

    [XmlElement("tildagsdato", Order = 5)]
    [JsonProperty("tildagsdato")]
    [JsonPropertyName("tildagsdato")]
    public string tildagsdato { get; set; }

    [XmlElement("arbeidssted", Order = 6)]
    [JsonProperty("arbeidssted")]
    [JsonPropertyName("arbeidssted")]
    public string arbeidssted { get; set; }

    [XmlElement("arbeidstedsland", Order = 7)]
    [JsonProperty("arbeidstedsland")]
    [JsonPropertyName("arbeidstedsland")]
    public string arbeidstedsland { get; set; }

    [XmlElement("selskap", Order = 8)]
    [JsonProperty("selskap")]
    [JsonPropertyName("selskap")]
    public string selskap { get; set; }

    [XmlElement("selskapsland", Order = 9)]
    [JsonProperty("selskapsland")]
    [JsonPropertyName("selskapsland")]
    public string selskapsland { get; set; }

    [XmlElement("skole", Order = 10)]
    [JsonProperty("skole")]
    [JsonPropertyName("skole")]
    public string skole { get; set; }

    [XmlElement("skolensland", Order = 11)]
    [JsonProperty("skolensland")]
    [JsonPropertyName("skolensland")]
    public string skolensland { get; set; }

    [XmlElement("arbeidsledigland", Order = 12)]
    [JsonProperty("arbeidsledigland")]
    [JsonPropertyName("arbeidsledigland")]
    public string arbeidsledigland { get; set; }

    [XmlElement("framaaned", Order = 13)]
    [JsonProperty("framaaned")]
    [JsonPropertyName("framaaned")]
    public string framaaned { get; set; }

    [XmlElement("tilmaaned", Order = 14)]
    [JsonProperty("tilmaaned")]
    [JsonPropertyName("tilmaaned")]
    public string tilmaaned { get; set; }

  }

  public class Personalia
  {
    [XmlElement("bostedsadresse", Order = 1)]
    [JsonProperty("bostedsadresse")]
    [JsonPropertyName("bostedsadresse")]
    public Adresse bostedsadresse { get; set; }

    [XmlElement("postadresse", Order = 2)]
    [JsonProperty("postadresse")]
    [JsonPropertyName("postadresse")]
    public Adresse postadresse { get; set; }

    [XmlElement("sivilstatus", Order = 3)]
    [JsonProperty("sivilstatus")]
    [JsonPropertyName("sivilstatus")]
    public string sivilstatus { get; set; }

    [XmlElement("prefiksnr", Order = 4)]
    [JsonProperty("prefiksnr")]
    [JsonPropertyName("prefiksnr")]
    public string prefiksnr { get; set; }

    [XmlElement("mobilnummer", Order = 5)]
    [JsonProperty("mobilnummer")]
    [JsonPropertyName("mobilnummer")]
    public string mobilnummer { get; set; }

    [XmlElement("epost", Order = 6)]
    [JsonProperty("epost")]
    [JsonPropertyName("epost")]
    public string epost { get; set; }

    [XmlElement("ishatttidligerenavn", Order = 7)]
    [JsonProperty("ishatttidligerenavn")]
    [JsonPropertyName("ishatttidligerenavn")]
    public bool? ishatttidligerenavn { get; set; }

    public bool ShouldSerializeishatttidligerenavn() => ishatttidligerenavn.HasValue;

    [XmlElement("hatttidligerenavn", Order = 8)]
    [JsonProperty("hatttidligerenavn")]
    [JsonPropertyName("hatttidligerenavn")]
    public string hatttidligerenavn { get; set; }

    [XmlElement("hattandrepersonnummer", Order = 9)]
    [JsonProperty("hattandrepersonnummer")]
    [JsonPropertyName("hattandrepersonnummer")]
    public string hattandrepersonnummer { get; set; }

    [XmlElement("tidligerepersonnummer", Order = 10)]
    [JsonProperty("tidligerepersonnummer")]
    [JsonPropertyName("tidligerepersonnummer")]
    public List<string> tidligerepersonnummer { get; set; }

    [XmlElement("andreiddokumenter", Order = 11)]
    [JsonProperty("andreiddokumenter")]
    [JsonPropertyName("andreiddokumenter")]
    public List<Iddokumenter> andreiddokumenter { get; set; }

    [XmlElement("harandreiddokumenter", Order = 12)]
    [JsonProperty("harandreiddokumenter")]
    [JsonPropertyName("harandreiddokumenter")]
    public string harandreiddokumenter { get; set; }

    [XmlElement("harpostadrsammesombosted", Order = 13)]
    [JsonProperty("harpostadrsammesombosted")]
    [JsonPropertyName("harpostadrsammesombosted")]
    public string harpostadrsammesombosted { get; set; }

    [XmlElement("person", Order = 14)]
    [JsonProperty("person")]
    [JsonPropertyName("person")]
    public Person person { get; set; }

    [XmlElement("harandrestatsborgerskap", Order = 15)]
    [JsonProperty("harandrestatsborgerskap")]
    [JsonPropertyName("harandrestatsborgerskap")]
    public string harandrestatsborgerskap { get; set; }

    [XmlElement("hatttidligerestatsborgerskap", Order = 16)]
    [JsonProperty("hatttidligerestatsborgerskap")]
    [JsonPropertyName("hatttidligerestatsborgerskap")]
    public string hatttidligerestatsborgerskap { get; set; }

    [XmlElement("hattoppholdutland", Order = 17)]
    [JsonProperty("hattoppholdutland")]
    [JsonPropertyName("hattoppholdutland")]
    public string hattoppholdutland { get; set; }

    [XmlElement("hattoppholdeu", Order = 18)]
    [JsonProperty("hattoppholdeu")]
    [JsonPropertyName("hattoppholdeu")]
    public string hattoppholdeu { get; set; }

    [XmlElement("samtykkepersonkontroll", Order = 19)]
    [JsonProperty("samtykkepersonkontroll")]
    [JsonPropertyName("samtykkepersonkontroll")]
    public string samtykkepersonkontroll { get; set; }

  }

  public class Adresse
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("adressebeskrivelse", Order = 1)]
    [JsonProperty("adressebeskrivelse")]
    [JsonPropertyName("adressebeskrivelse")]
    public string adressebeskrivelse { get; set; }

    [XmlElement("postnummer", Order = 2)]
    [JsonProperty("postnummer")]
    [JsonPropertyName("postnummer")]
    public string postnummer { get; set; }

    [XmlElement("poststed", Order = 3)]
    [JsonProperty("poststed")]
    [JsonPropertyName("poststed")]
    public string poststed { get; set; }

    [XmlElement("land", Order = 4)]
    [JsonProperty("land")]
    [JsonPropertyName("land")]
    public string land { get; set; }

  }

  public class Iddokumenter
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("typedokument", Order = 1)]
    [JsonProperty("typedokument")]
    [JsonPropertyName("typedokument")]
    public string typedokument { get; set; }

    [XmlElement("dokumentnr", Order = 2)]
    [JsonProperty("dokumentnr")]
    [JsonPropertyName("dokumentnr")]
    public string dokumentnr { get; set; }

    [XmlElement("land", Order = 3)]
    [JsonProperty("land")]
    [JsonPropertyName("land")]
    public string land { get; set; }

  }

  public class Person
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("foedselsnummer", Order = 1)]
    [JsonProperty("foedselsnummer")]
    [JsonPropertyName("foedselsnummer")]
    public string foedselsnummer { get; set; }

    [XmlElement("utenlandskfoedselsnummer", Order = 2)]
    [JsonProperty("utenlandskfoedselsnummer")]
    [JsonPropertyName("utenlandskfoedselsnummer")]
    public string utenlandskfoedselsnummer { get; set; }

    [XmlElement("foedselsdato", Order = 3)]
    [JsonProperty("foedselsdato")]
    [JsonPropertyName("foedselsdato")]
    public string foedselsdato { get; set; }

    [XmlElement("kjoenn", Order = 4)]
    [JsonProperty("kjoenn")]
    [JsonPropertyName("kjoenn")]
    public string kjoenn { get; set; }

    [XmlElement("personnavn", Order = 5)]
    [JsonProperty("personnavn")]
    [JsonPropertyName("personnavn")]
    public Personnavn personnavn { get; set; }

    [XmlElement("naavaandestatsborgerskap", Order = 6)]
    [JsonProperty("naavaandestatsborgerskap")]
    [JsonPropertyName("naavaandestatsborgerskap")]
    public Statsborgerskap naavaandestatsborgerskap { get; set; }

    [XmlElement("utenlandsadresse", Order = 7)]
    [JsonProperty("utenlandsadresse")]
    [JsonPropertyName("utenlandsadresse")]
    public List<Adresse> utenlandsadresse { get; set; }

  }

  public class Personnavn
  {
    [XmlElement("fornavn", Order = 1)]
    [JsonProperty("fornavn")]
    [JsonPropertyName("fornavn")]
    public string fornavn { get; set; }

    [XmlElement("mellomnavn", Order = 2)]
    [JsonProperty("mellomnavn")]
    [JsonPropertyName("mellomnavn")]
    public string mellomnavn { get; set; }

    [XmlElement("etternavn", Order = 3)]
    [JsonProperty("etternavn")]
    [JsonPropertyName("etternavn")]
    public string etternavn { get; set; }

    [XmlElement("fulltnavn", Order = 4)]
    [JsonProperty("fulltnavn")]
    [JsonPropertyName("fulltnavn")]
    public string fulltnavn { get; set; }

  }

  public class Statsborgerskap
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("fraDato", Order = 1)]
    [JsonProperty("fraDato")]
    [JsonPropertyName("fraDato")]
    public string fraDato { get; set; }

    [XmlElement("tilDato", Order = 2)]
    [JsonProperty("tilDato")]
    [JsonPropertyName("tilDato")]
    public string tilDato { get; set; }

    [XmlElement("passnr", Order = 3)]
    [JsonProperty("passnr")]
    [JsonPropertyName("passnr")]
    public string passnr { get; set; }

    [XmlElement("fodested", Order = 4)]
    [JsonProperty("fodested")]
    [JsonPropertyName("fodested")]
    public string fodested { get; set; }

    [XmlElement("fodeland", Order = 5)]
    [JsonProperty("fodeland")]
    [JsonPropertyName("fodeland")]
    public string fodeland { get; set; }

    [XmlElement("statsborgerfrafodsel", Order = 6)]
    [JsonProperty("statsborgerfrafodsel")]
    [JsonPropertyName("statsborgerfrafodsel")]
    public string statsborgerfrafodsel { get; set; }

    [XmlElement("land", Order = 7)]
    [JsonProperty("land")]
    [JsonPropertyName("land")]
    public string land { get; set; }

  }

  public class Relasjoner
  {
    [XmlElement("barn", Order = 1)]
    [JsonProperty("barn")]
    [JsonPropertyName("barn")]
    public List<Person> barn { get; set; }

    [XmlElement("far", Order = 2)]
    [JsonProperty("far")]
    [JsonPropertyName("far")]
    public Person far { get; set; }

    [XmlElement("mor", Order = 3)]
    [JsonProperty("mor")]
    [JsonPropertyName("mor")]
    public Person mor { get; set; }

    [XmlElement("sosken", Order = 4)]
    [JsonProperty("sosken")]
    [JsonPropertyName("sosken")]
    public List<Person> sosken { get; set; }

    [XmlElement("fodtannetlandmor", Order = 5)]
    [JsonProperty("fodtannetlandmor")]
    [JsonPropertyName("fodtannetlandmor")]
    public string fodtannetlandmor { get; set; }

    [XmlElement("fodtannetlandfar", Order = 6)]
    [JsonProperty("fodtannetlandfar")]
    [JsonPropertyName("fodtannetlandfar")]
    public string fodtannetlandfar { get; set; }

    [XmlElement("hattnaerutland", Order = 7)]
    [JsonProperty("hattnaerutland")]
    [JsonPropertyName("hattnaerutland")]
    public string hattnaerutland { get; set; }

    [XmlElement("hattnaerinvestering", Order = 8)]
    [JsonProperty("hattnaerinvestering")]
    [JsonPropertyName("hattnaerinvestering")]
    public string hattnaerinvestering { get; set; }

    [XmlElement("hattnaerstraffet", Order = 9)]
    [JsonProperty("hattnaerstraffet")]
    [JsonPropertyName("hattnaerstraffet")]
    public string hattnaerstraffet { get; set; }

    [XmlElement("hattnaerorgkrim", Order = 10)]
    [JsonProperty("hattnaerorgkrim")]
    [JsonPropertyName("hattnaerorgkrim")]
    public string hattnaerorgkrim { get; set; }

    [XmlElement("hattnaerpengerutland", Order = 11)]
    [JsonProperty("hattnaerpengerutland")]
    [JsonPropertyName("hattnaerpengerutland")]
    public string hattnaerpengerutland { get; set; }

    [XmlElement("hattnaermyndigheter", Order = 12)]
    [JsonProperty("hattnaermyndigheter")]
    [JsonPropertyName("hattnaermyndigheter")]
    public string hattnaermyndigheter { get; set; }

    [XmlElement("hattnaeretteretning", Order = 13)]
    [JsonProperty("hattnaeretteretning")]
    [JsonPropertyName("hattnaeretteretning")]
    public string hattnaeretteretning { get; set; }

    [XmlElement("naerutland", Order = 14)]
    [JsonProperty("naerutland")]
    [JsonPropertyName("naerutland")]
    public List<Naerstaaende> naerutland { get; set; }

    [XmlElement("naerinvestering", Order = 15)]
    [JsonProperty("naerinvestering")]
    [JsonPropertyName("naerinvestering")]
    public List<Naerstaaende> naerinvestering { get; set; }

    [XmlElement("naerstraffet", Order = 16)]
    [JsonProperty("naerstraffet")]
    [JsonPropertyName("naerstraffet")]
    public List<Naerstaaende> naerstraffet { get; set; }

    [XmlElement("naerorgkrim", Order = 17)]
    [JsonProperty("naerorgkrim")]
    [JsonPropertyName("naerorgkrim")]
    public List<Naerstaaende> naerorgkrim { get; set; }

    [XmlElement("naerpengerutland", Order = 18)]
    [JsonProperty("naerpengerutland")]
    [JsonPropertyName("naerpengerutland")]
    public List<Naerstaaende> naerpengerutland { get; set; }

    [XmlElement("naermyndigheter", Order = 19)]
    [JsonProperty("naermyndigheter")]
    [JsonPropertyName("naermyndigheter")]
    public List<Naerstaaende> naermyndigheter { get; set; }

    [XmlElement("naeretteretning", Order = 20)]
    [JsonProperty("naeretteretning")]
    [JsonPropertyName("naeretteretning")]
    public List<Naerstaaende> naeretteretning { get; set; }

  }

  public class Naerstaaende
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("personinfo", Order = 1)]
    [JsonProperty("personinfo")]
    [JsonPropertyName("personinfo")]
    public Person personinfo { get; set; }

    [XmlElement("harinvesteringerutland", Order = 2)]
    [JsonProperty("harinvesteringerutland")]
    [JsonPropertyName("harinvesteringerutland")]
    public string harinvesteringerutland { get; set; }

    [XmlElement("bosattutland", Order = 3)]
    [JsonProperty("bosattutland")]
    [JsonPropertyName("bosattutland")]
    public string bosattutland { get; set; }

    [XmlElement("harblittstrattet", Order = 4)]
    [JsonProperty("harblittstrattet")]
    [JsonPropertyName("harblittstrattet")]
    public string harblittstrattet { get; set; }

    [XmlElement("harkontaktmedorgkrim", Order = 5)]
    [JsonProperty("harkontaktmedorgkrim")]
    [JsonPropertyName("harkontaktmedorgkrim")]
    public string harkontaktmedorgkrim { get; set; }

    [XmlElement("hartransaksjonutland", Order = 6)]
    [JsonProperty("hartransaksjonutland")]
    [JsonPropertyName("hartransaksjonutland")]
    public string hartransaksjonutland { get; set; }

    [XmlElement("hatttjenesterutland", Order = 7)]
    [JsonProperty("hatttjenesterutland")]
    [JsonPropertyName("hatttjenesterutland")]
    public string hatttjenesterutland { get; set; }

    [XmlElement("hattkontaktetterettning", Order = 8)]
    [JsonProperty("hattkontaktetterettning")]
    [JsonPropertyName("hattkontaktetterettning")]
    public string hattkontaktetterettning { get; set; }

    [XmlElement("relasjonmedperson", Order = 9)]
    [JsonProperty("relasjonmedperson")]
    [JsonPropertyName("relasjonmedperson")]
    public string relasjonmedperson { get; set; }

  }

  public class Samboerektefelle
  {
    [XmlElement("hattsamboerstatsborgerandreland", Order = 1)]
    [JsonProperty("hattsamboerstatsborgerandreland")]
    [JsonPropertyName("hattsamboerstatsborgerandreland")]
    public string hattsamboerstatsborgerandreland { get; set; }

    [XmlElement("hattoppholdutland", Order = 2)]
    [JsonProperty("hattoppholdutland")]
    [JsonPropertyName("hattoppholdutland")]
    public string hattoppholdutland { get; set; }

    [XmlElement("hattoppholdeos", Order = 3)]
    [JsonProperty("hattoppholdeos")]
    [JsonPropertyName("hattoppholdeos")]
    public string hattoppholdeos { get; set; }

    [XmlElement("samboerperson", Order = 4)]
    [JsonProperty("samboerperson")]
    [JsonPropertyName("samboerperson")]
    public Person samboerperson { get; set; }

    [XmlElement("naavaerendestatsborgerskap", Order = 5)]
    [JsonProperty("naavaerendestatsborgerskap")]
    [JsonPropertyName("naavaerendestatsborgerskap")]
    public Statsborgerskap naavaerendestatsborgerskap { get; set; }

    [XmlElement("FlereStatsborgerskap", Order = 6)]
    [JsonProperty("FlereStatsborgerskap")]
    [JsonPropertyName("FlereStatsborgerskap")]
    public List<Statsborgerskap> FlereStatsborgerskap { get; set; }

    [XmlElement("TidligereStatsborgerskap", Order = 7)]
    [JsonProperty("TidligereStatsborgerskap")]
    [JsonPropertyName("TidligereStatsborgerskap")]
    public List<Statsborgerskap> TidligereStatsborgerskap { get; set; }

    [XmlElement("SamboerEktefelleBostederUtland", Order = 8)]
    [JsonProperty("SamboerEktefelleBostederUtland")]
    [JsonPropertyName("SamboerEktefelleBostederUtland")]
    public List<Bostedhistorikkutland> SamboerEktefelleBostederUtland { get; set; }

    [XmlElement("SamboerEktefelleBostederEU", Order = 9)]
    [JsonProperty("SamboerEktefelleBostederEU")]
    [JsonPropertyName("SamboerEktefelleBostederEU")]
    public List<Bostedhistorikkeu> SamboerEktefelleBostederEU { get; set; }

    [XmlElement("BostederUtland", Order = 10)]
    [JsonProperty("BostederUtland")]
    [JsonPropertyName("BostederUtland")]
    public List<Bostedhistorikkutland> BostederUtland { get; set; }

    [XmlElement("BostederEU", Order = 11)]
    [JsonProperty("BostederEU")]
    [JsonPropertyName("BostederEU")]
    public List<Bostedhistorikkeu> BostederEU { get; set; }

  }

  public class Bostedhistorikkutland
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("land", Order = 1)]
    [JsonProperty("land")]
    [JsonPropertyName("land")]
    public string land { get; set; }

    [XmlElement("startoppholdmnd", Order = 2)]
    [JsonProperty("startoppholdmnd")]
    [JsonPropertyName("startoppholdmnd")]
    public string startoppholdmnd { get; set; }

    [XmlElement("startoppholdaar", Order = 3)]
    [JsonProperty("startoppholdaar")]
    [JsonPropertyName("startoppholdaar")]
    public string startoppholdaar { get; set; }

    [XmlElement("sluttoppholdmnd", Order = 4)]
    [JsonProperty("sluttoppholdmnd")]
    [JsonPropertyName("sluttoppholdmnd")]
    public string sluttoppholdmnd { get; set; }

    [XmlElement("sluttoppholdaar", Order = 5)]
    [JsonProperty("sluttoppholdaar")]
    [JsonPropertyName("sluttoppholdaar")]
    public string sluttoppholdaar { get; set; }

    [XmlElement("adresse", Order = 6)]
    [JsonProperty("adresse")]
    [JsonPropertyName("adresse")]
    public string adresse { get; set; }

    [XmlElement("postnr", Order = 7)]
    [JsonProperty("postnr")]
    [JsonPropertyName("postnr")]
    public string postnr { get; set; }

    [XmlElement("poststed", Order = 8)]
    [JsonProperty("poststed")]
    [JsonPropertyName("poststed")]
    public string poststed { get; set; }

    [XmlElement("bakgrunn", Order = 9)]
    [JsonProperty("bakgrunn")]
    [JsonPropertyName("bakgrunn")]
    public string bakgrunn { get; set; }

    [XmlElement("spesifikasjon", Order = 10)]
    [JsonProperty("spesifikasjon")]
    [JsonPropertyName("spesifikasjon")]
    public string spesifikasjon { get; set; }

  }

  public class Bostedhistorikkeu
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("land", Order = 1)]
    [JsonProperty("land")]
    [JsonPropertyName("land")]
    public string land { get; set; }

    [XmlElement("spesifikasjon", Order = 2)]
    [JsonProperty("spesifikasjon")]
    [JsonPropertyName("spesifikasjon")]
    public string spesifikasjon { get; set; }

    [XmlElement("bakgrunn", Order = 3)]
    [JsonProperty("bakgrunn")]
    [JsonPropertyName("bakgrunn")]
    public string bakgrunn { get; set; }

    [XmlElement("antallganger", Order = 4)]
    [JsonProperty("antallganger")]
    [JsonPropertyName("antallganger")]
    public string antallganger { get; set; }

  }

  public class OEkonomi
  {
    [XmlElement("hattprivatelaan", Order = 1)]
    [JsonProperty("hattprivatelaan")]
    [JsonPropertyName("hattprivatelaan")]
    public string hattprivatelaan { get; set; }

    [XmlElement("redegjorelseprivatelaan", Order = 2)]
    [JsonProperty("redegjorelseprivatelaan")]
    [JsonPropertyName("redegjorelseprivatelaan")]
    public string redegjorelseprivatelaan { get; set; }

    [XmlElement("hattmislighold", Order = 3)]
    [JsonProperty("hattmislighold")]
    [JsonPropertyName("hattmislighold")]
    public string hattmislighold { get; set; }

    [XmlElement("redegjorelsemislighold", Order = 4)]
    [JsonProperty("redegjorelsemislighold")]
    [JsonPropertyName("redegjorelsemislighold")]
    public string redegjorelsemislighold { get; set; }

    [XmlElement("hattpengespill", Order = 5)]
    [JsonProperty("hattpengespill")]
    [JsonPropertyName("hattpengespill")]
    public string hattpengespill { get; set; }

    [XmlElement("redegjorelsepengespill", Order = 6)]
    [JsonProperty("redegjorelsepengespill")]
    [JsonPropertyName("redegjorelsepengespill")]
    public string redegjorelsepengespill { get; set; }

    [XmlElement("investeringer", Order = 7)]
    [JsonProperty("investeringer")]
    [JsonPropertyName("investeringer")]
    public List<Investering> investeringer { get; set; }

    [XmlElement("harinvesteringer", Order = 8)]
    [JsonProperty("harinvesteringer")]
    [JsonPropertyName("harinvesteringer")]
    public string harinvesteringer { get; set; }

    [XmlElement("harmottattpenger", Order = 9)]
    [JsonProperty("harmottattpenger")]
    [JsonPropertyName("harmottattpenger")]
    public string harmottattpenger { get; set; }

    [XmlElement("mottattpengerutland", Order = 10)]
    [JsonProperty("mottattpengerutland")]
    [JsonPropertyName("mottattpengerutland")]
    public List<Transaksjonutland> mottattpengerutland { get; set; }

    [XmlElement("harsentpenger", Order = 11)]
    [JsonProperty("harsentpenger")]
    [JsonPropertyName("harsentpenger")]
    public string harsentpenger { get; set; }

    [XmlElement("sentpengerutland", Order = 12)]
    [JsonProperty("sentpengerutland")]
    [JsonPropertyName("sentpengerutland")]
    public List<Transaksjonutland> sentpengerutland { get; set; }

    [XmlElement("okonomiskesituasjon", Order = 13)]
    [JsonProperty("okonomiskesituasjon")]
    [JsonPropertyName("okonomiskesituasjon")]
    public string okonomiskesituasjon { get; set; }

    [XmlElement("okonomiskesituasjonbeskrivelse", Order = 14)]
    [JsonProperty("okonomiskesituasjonbeskrivelse")]
    [JsonPropertyName("okonomiskesituasjonbeskrivelse")]
    public string okonomiskesituasjonbeskrivelse { get; set; }

  }

  public class Investering
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("type", Order = 1)]
    [JsonProperty("type")]
    [JsonPropertyName("type")]
    public string type { get; set; }

    [XmlElement("harinvestering", Order = 2)]
    [JsonProperty("harinvestering")]
    [JsonPropertyName("harinvestering")]
    public string harinvestering { get; set; }

    [XmlElement("land", Order = 3)]
    [JsonProperty("land")]
    [JsonPropertyName("land")]
    public string land { get; set; }

  }

  public class Transaksjonutland
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("antallganger", Order = 1)]
    [JsonProperty("antallganger")]
    [JsonPropertyName("antallganger")]
    public string antallganger { get; set; }

    [XmlElement("opprinnelsepenger", Order = 2)]
    [JsonProperty("opprinnelsepenger")]
    [JsonPropertyName("opprinnelsepenger")]
    public string opprinnelsepenger { get; set; }

    [XmlElement("anledning", Order = 3)]
    [JsonProperty("anledning")]
    [JsonPropertyName("anledning")]
    public string anledning { get; set; }

    [XmlElement("belop", Order = 4)]
    [JsonProperty("belop")]
    [JsonPropertyName("belop")]
    public string belop { get; set; }

  }

  public class Strafferettslig
  {
    [XmlElement("hattlovbruddnorge", Order = 1)]
    [JsonProperty("hattlovbruddnorge")]
    [JsonPropertyName("hattlovbruddnorge")]
    public string hattlovbruddnorge { get; set; }

    [XmlElement("beskrivelserefselse", Order = 2)]
    [JsonProperty("beskrivelserefselse")]
    [JsonPropertyName("beskrivelserefselse")]
    public string beskrivelserefselse { get; set; }

    [XmlElement("hattrefselse", Order = 3)]
    [JsonProperty("hattrefselse")]
    [JsonPropertyName("hattrefselse")]
    public string hattrefselse { get; set; }

    [XmlElement("hattlovbruddutland", Order = 4)]
    [JsonProperty("hattlovbruddutland")]
    [JsonPropertyName("hattlovbruddutland")]
    public string hattlovbruddutland { get; set; }

    [XmlElement("straffforholdnorge", Order = 5)]
    [JsonProperty("straffforholdnorge")]
    [JsonPropertyName("straffforholdnorge")]
    public Straffforhold straffforholdnorge { get; set; }

    [XmlElement("hattstraffutlandet", Order = 6)]
    [JsonProperty("hattstraffutlandet")]
    [JsonPropertyName("hattstraffutlandet")]
    public List<Straffforhold> hattstraffutlandet { get; set; }

  }

  public class Straffforhold
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("aar", Order = 1)]
    [JsonProperty("aar")]
    [JsonPropertyName("aar")]
    public string aar { get; set; }

    [XmlElement("land", Order = 2)]
    [JsonProperty("land")]
    [JsonPropertyName("land")]
    public string land { get; set; }

    [XmlElement("utfall", Order = 3)]
    [JsonProperty("utfall")]
    [JsonPropertyName("utfall")]
    public string utfall { get; set; }

    [XmlElement("type", Order = 4)]
    [JsonProperty("type")]
    [JsonPropertyName("type")]
    public string type { get; set; }

  }

  public class Rusmidler
  {
    [XmlElement("hattalkoholhendelser", Order = 1)]
    [JsonProperty("hattalkoholhendelser")]
    [JsonPropertyName("hattalkoholhendelser")]
    public string hattalkoholhendelser { get; set; }

    [XmlElement("beskrivelsereaksjonalkohol", Order = 2)]
    [JsonProperty("beskrivelsereaksjonalkohol")]
    [JsonPropertyName("beskrivelsereaksjonalkohol")]
    public string beskrivelsereaksjonalkohol { get; set; }

    [XmlElement("hattdoping", Order = 3)]
    [JsonProperty("hattdoping")]
    [JsonPropertyName("hattdoping")]
    public string hattdoping { get; set; }

    [XmlElement("hattalkoholreaksjoner", Order = 4)]
    [JsonProperty("hattalkoholreaksjoner")]
    [JsonPropertyName("hattalkoholreaksjoner")]
    public string hattalkoholreaksjoner { get; set; }

    [XmlElement("beskrivelsehendelseralkohol", Order = 5)]
    [JsonProperty("beskrivelsehendelseralkohol")]
    [JsonPropertyName("beskrivelsehendelseralkohol")]
    public string beskrivelsehendelseralkohol { get; set; }

    [XmlElement("beskrivelsenarkotika", Order = 6)]
    [JsonProperty("beskrivelsenarkotika")]
    [JsonPropertyName("beskrivelsenarkotika")]
    public string beskrivelsenarkotika { get; set; }

    [XmlElement("beskrivelsedoping", Order = 7)]
    [JsonProperty("beskrivelsedoping")]
    [JsonPropertyName("beskrivelsedoping")]
    public string beskrivelsedoping { get; set; }

    [XmlElement("hattbruktnarkotika", Order = 8)]
    [JsonProperty("hattbruktnarkotika")]
    [JsonPropertyName("hattbruktnarkotika")]
    public string hattbruktnarkotika { get; set; }

    [XmlElement("hattbehandlingrus", Order = 9)]
    [JsonProperty("hattbehandlingrus")]
    [JsonPropertyName("hattbehandlingrus")]
    public string hattbehandlingrus { get; set; }

    [XmlElement("hattakan", Order = 10)]
    [JsonProperty("hattakan")]
    [JsonPropertyName("hattakan")]
    public string hattakan { get; set; }

  }

  public class Sikkerhetsopplysninger
  {
    [XmlElement("hattKontaktterror", Order = 1)]
    [JsonProperty("hattKontaktterror")]
    [JsonPropertyName("hattKontaktterror")]
    public string hattKontaktterror { get; set; }

    [XmlElement("hattkontaktkriminalitet", Order = 2)]
    [JsonProperty("hattkontaktkriminalitet")]
    [JsonPropertyName("hattkontaktkriminalitet")]
    public string hattkontaktkriminalitet { get; set; }

    [XmlElement("beskrivelsekrim", Order = 3)]
    [JsonProperty("beskrivelsekrim")]
    [JsonPropertyName("beskrivelsekrim")]
    public string beskrivelsekrim { get; set; }

    [XmlElement("hattkontaktkrim", Order = 4)]
    [JsonProperty("hattkontaktkrim")]
    [JsonPropertyName("hattkontaktkrim")]
    public string hattkontaktkrim { get; set; }

    [XmlElement("beskrivelsekontaktterror", Order = 5)]
    [JsonProperty("beskrivelsekontaktterror")]
    [JsonPropertyName("beskrivelsekontaktterror")]
    public string beskrivelsekontaktterror { get; set; }

    [XmlElement("harandreforhold", Order = 6)]
    [JsonProperty("harandreforhold")]
    [JsonPropertyName("harandreforhold")]
    public string harandreforhold { get; set; }

    [XmlElement("beskrivelseandreforhold", Order = 7)]
    [JsonProperty("beskrivelseandreforhold")]
    [JsonPropertyName("beskrivelseandreforhold")]
    public string beskrivelseandreforhold { get; set; }

  }

  public class Statstilknytning
  {
    [XmlElement("hatttjenensterutland", Order = 1)]
    [JsonProperty("hatttjenensterutland")]
    [JsonPropertyName("hatttjenensterutland")]
    public string hatttjenensterutland { get; set; }

    [XmlElement("hatttjenestemilitaere", Order = 2)]
    [JsonProperty("hatttjenestemilitaere")]
    [JsonPropertyName("hatttjenestemilitaere")]
    public string hatttjenestemilitaere { get; set; }

    [XmlElement("militaertjenesteland", Order = 3)]
    [JsonProperty("militaertjenesteland")]
    [JsonPropertyName("militaertjenesteland")]
    public string militaertjenesteland { get; set; }

    [XmlElement("militaerfradato", Order = 4)]
    [JsonProperty("militaerfradato")]
    [JsonPropertyName("militaerfradato")]
    public string militaerfradato { get; set; }

    [XmlElement("militaertildato", Order = 5)]
    [JsonProperty("militaertildato")]
    [JsonPropertyName("militaertildato")]
    public string militaertildato { get; set; }

    [XmlElement("militaerbeskrivelse", Order = 6)]
    [JsonProperty("militaerbeskrivelse")]
    [JsonPropertyName("militaerbeskrivelse")]
    public string militaerbeskrivelse { get; set; }

    [XmlElement("harstudertutland", Order = 7)]
    [JsonProperty("harstudertutland")]
    [JsonPropertyName("harstudertutland")]
    public string harstudertutland { get; set; }

    [XmlElement("hattkontaktetteretning", Order = 8)]
    [JsonProperty("hattkontaktetteretning")]
    [JsonPropertyName("hattkontaktetteretning")]
    public string hattkontaktetteretning { get; set; }

    [XmlElement("beskrivelseetterretning", Order = 9)]
    [JsonProperty("beskrivelseetterretning")]
    [JsonPropertyName("beskrivelseetterretning")]
    public string beskrivelseetterretning { get; set; }

    [XmlElement("tilknyttningstilfeller", Order = 10)]
    [JsonProperty("tilknyttningstilfeller")]
    [JsonPropertyName("tilknyttningstilfeller")]
    public List<Tilknytningtilfelle> tilknyttningstilfeller { get; set; }

    [XmlElement("utdanningssteder", Order = 11)]
    [JsonProperty("utdanningssteder")]
    [JsonPropertyName("utdanningssteder")]
    public List<Utdanningssted> utdanningssteder { get; set; }

  }

  public class Tilknytningtilfelle
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("beskrivelse", Order = 1)]
    [JsonProperty("beskrivelse")]
    [JsonPropertyName("beskrivelse")]
    public string beskrivelse { get; set; }

    [XmlElement("land", Order = 2)]
    [JsonProperty("land")]
    [JsonPropertyName("land")]
    public string land { get; set; }

    [XmlElement("fra", Order = 3)]
    [JsonProperty("fra")]
    [JsonPropertyName("fra")]
    public string fra { get; set; }

    [XmlElement("til", Order = 4)]
    [JsonProperty("til")]
    [JsonPropertyName("til")]
    public string til { get; set; }

  }

  public class Utdanningssted
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("utdanningsted", Order = 1)]
    [JsonProperty("utdanningsted")]
    [JsonPropertyName("utdanningsted")]
    public string utdanningsted { get; set; }

    [XmlElement("land", Order = 2)]
    [JsonProperty("land")]
    [JsonPropertyName("land")]
    public string land { get; set; }

    [XmlElement("fra", Order = 3)]
    [JsonProperty("fra")]
    [JsonPropertyName("fra")]
    public string fra { get; set; }

    [XmlElement("til", Order = 4)]
    [JsonProperty("til")]
    [JsonPropertyName("til")]
    public string til { get; set; }

  }

  public class Helse
  {
    [XmlElement("hattsykdom", Order = 1)]
    [JsonProperty("hattsykdom")]
    [JsonPropertyName("hattsykdom")]
    public string hattsykdom { get; set; }

    [XmlElement("HelseUtredning", Order = 2)]
    [JsonProperty("HelseUtredning")]
    [JsonPropertyName("HelseUtredning")]
    public Helseutredning HelseUtredning { get; set; }

    [XmlElement("hattvurderingsevne", Order = 3)]
    [JsonProperty("hattvurderingsevne")]
    [JsonPropertyName("hattvurderingsevne")]
    public string hattvurderingsevne { get; set; }

    [XmlElement("utdypelsevurderingsevne", Order = 4)]
    [JsonProperty("utdypelsevurderingsevne")]
    [JsonPropertyName("utdypelsevurderingsevne")]
    public string utdypelsevurderingsevne { get; set; }

    [XmlElement("hattlegemidler", Order = 5)]
    [JsonProperty("hattlegemidler")]
    [JsonPropertyName("hattlegemidler")]
    public string hattlegemidler { get; set; }

    [XmlElement("utdypelselegemidler", Order = 6)]
    [JsonProperty("utdypelselegemidler")]
    [JsonPropertyName("utdypelselegemidler")]
    public string utdypelselegemidler { get; set; }

  }

  public class Helseutredning
  {
    [XmlElement("typebehandling", Order = 1)]
    [JsonProperty("typebehandling")]
    [JsonPropertyName("typebehandling")]
    public string typebehandling { get; set; }

    [XmlElement("tidspunktbehandling", Order = 2)]
    [JsonProperty("tidspunktbehandling")]
    [JsonPropertyName("tidspunktbehandling")]
    public string tidspunktbehandling { get; set; }

    [XmlElement("utdypelse", Order = 3)]
    [JsonProperty("utdypelse")]
    [JsonPropertyName("utdypelse")]
    public string utdypelse { get; set; }

  }

  public class Deusrequest
  {
    [XmlElement("clearauthority", Order = 1)]
    [JsonProperty("clearauthority")]
    [JsonPropertyName("clearauthority")]
    public string clearauthority { get; set; }

    [XmlElement("nationallevel", Order = 2)]
    [JsonProperty("nationallevel")]
    [JsonPropertyName("nationallevel")]
    public string nationallevel { get; set; }

    [XmlElement("natolevel", Order = 3)]
    [JsonProperty("natolevel")]
    [JsonPropertyName("natolevel")]
    public string natolevel { get; set; }

    [XmlElement("personid", Order = 4)]
    [JsonProperty("personid")]
    [JsonPropertyName("personid")]
    public string personid { get; set; }

    [XmlElement("requestbusiness", Order = 5)]
    [JsonProperty("requestbusiness")]
    [JsonPropertyName("requestbusiness")]
    public string requestbusiness { get; set; }

    [XmlElement("requestid", Order = 6)]
    [JsonProperty("requestid")]
    [JsonPropertyName("requestid")]
    public string requestid { get; set; }

  }
}
