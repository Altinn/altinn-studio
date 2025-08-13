using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;

#pragma warning disable SA1300 // Element should begin with upper-case letter
#pragma warning disable SA1649 // File name should match first type name
namespace App.IntegrationTests.Mocks.Apps.nsm.klareringsportalen.models
{
    public class ePOB_M
    {
#pragma warning restore SA1649 // File name should match first type name
    [XmlElement("PersonInformasjon")]
    [JsonProperty("PersonInformasjon")]
    [JsonPropertyName("PersonInformasjon")]
    public Personalia PersonInformasjon { get; set; }

    [XmlElement("PersonRelasjoner")]
    [JsonProperty("PersonRelasjoner")]
    [JsonPropertyName("PersonRelasjoner")]
    public Relasjoner PersonRelasjoner { get; set; }

    [XmlElement("Samboerellerektefelle")]
    [JsonProperty("Samboerellerektefelle")]
    [JsonPropertyName("Samboerellerektefelle")]
    public Samboerektefelle Samboerellerektefelle { get; set; }

    [XmlElement("PersonligOkonomi")]
    [JsonProperty("PersonligOkonomi")]
    [JsonPropertyName("PersonligOkonomi")]
    public OEkonomi PersonligOkonomi { get; set; }

    [XmlElement("Straff")]
    [JsonProperty("Straff")]
    [JsonPropertyName("Straff")]
    public Strafferettslig Straff { get; set; }

    [XmlElement("PersonRusmidler")]
    [JsonProperty("PersonRusmidler")]
    [JsonPropertyName("PersonRusmidler")]
    public Rusmidler PersonRusmidler { get; set; }

    [XmlElement("SikkerhetsOpplysninger")]
    [JsonProperty("SikkerhetsOpplysninger")]
    [JsonPropertyName("SikkerhetsOpplysninger")]
    public Sikkerhetsopplysninger SikkerhetsOpplysninger { get; set; }

    [XmlElement("StatsTilknytning")]
    [JsonProperty("StatsTilknytning")]
    [JsonPropertyName("StatsTilknytning")]
    public Statstilknytning StatsTilknytning { get; set; }

    [XmlElement("HelsePerson")]
    [JsonProperty("HelsePerson")]
    [JsonPropertyName("HelsePerson")]
    public Helse HelsePerson { get; set; }

    [XmlElement("HistorikkBostederUtland")]
    [JsonProperty("HistorikkBostederUtland")]
    [JsonPropertyName("HistorikkBostederUtland")]
    public List<Bostedhistorikkutland> HistorikkBostederUtland { get; set; }

    [XmlElement("HistorikkBostederEU")]
    [JsonProperty("HistorikkBostederEU")]
    [JsonPropertyName("HistorikkBostederEU")]
    public List<Bostedhistorikkeu> HistorikkBostederEU { get; set; }

    [XmlElement("ArbeidsErfaring")]
    [JsonProperty("ArbeidsErfaring")]
    [JsonPropertyName("ArbeidsErfaring")]
    public List<Arbeidserfaringer> ArbeidsErfaring { get; set; }

    [XmlElement("TidligereNavn")]
    [JsonProperty("TidligereNavn")]
    [JsonPropertyName("TidligereNavn")]
    public List<Person> TidligereNavn { get; set; }

    [XmlElement("FlereGjeldendeStatsborgerskap")]
    [JsonProperty("FlereGjeldendeStatsborgerskap")]
    [JsonPropertyName("FlereGjeldendeStatsborgerskap")]
    public List<Statsborgerskap> FlereGjeldendeStatsborgerskap { get; set; }

    [XmlElement("TidligereStatsborgerskap")]
    [JsonProperty("TidligereStatsborgerskap")]
    [JsonPropertyName("TidligereStatsborgerskap")]
    public List<Statsborgerskap> TidligereStatsborgerskap { get; set; }

    [XmlElement("DeusRequest")]
    [JsonProperty("DeusRequest")]
    [JsonPropertyName("DeusRequest")]
    public Deusrequest DeusRequest { get; set; }
    }

    public class Personalia
    {
    [XmlElement("bostedsadresse")]
    [JsonProperty("bostedsadresse")]
    [JsonPropertyName("bostedsadresse")]
    public Adresse bostedsadresse { get; set; }

    [XmlElement("postadresse")]
    [JsonProperty("postadresse")]
    [JsonPropertyName("postadresse")]
    public Adresse postadresse { get; set; }

    [XmlElement("sivilstatus")]
    [JsonProperty("sivilstatus")]
    [JsonPropertyName("sivilstatus")]
    public string sivilstatus { get; set; }

    [XmlElement("prefiksnr")]
    [JsonProperty("prefiksnr")]
    [JsonPropertyName("prefiksnr")]
    public string prefiksnr { get; set; }

    [XmlElement("mobilnummer")]
    [JsonProperty("mobilnummer")]
    [JsonPropertyName("mobilnummer")]
    public string mobilnummer { get; set; }

    [XmlElement("epost")]
    [JsonProperty("epost")]
    [JsonPropertyName("epost")]
    public string epost { get; set; }

    [XmlElement("ishatttidligerenavn")]
    [JsonProperty("ishatttidligerenavn")]
    [JsonPropertyName("ishatttidligerenavn")]
    public bool? ishatttidligerenavn { get; set; }

    [XmlElement("hatttidligerenavn")]
    [JsonProperty("hatttidligerenavn")]
    [JsonPropertyName("hatttidligerenavn")]
    public string hatttidligerenavn { get; set; }

    [XmlElement("hattandrepersonnummer")]
    [JsonProperty("hattandrepersonnummer")]
    [JsonPropertyName("hattandrepersonnummer")]
    public string hattandrepersonnummer { get; set; }

    [XmlElement("tidligerepersonnummer")]
    [JsonProperty("tidligerepersonnummer")]
    [JsonPropertyName("tidligerepersonnummer")]
    public string tidligerepersonnummer { get; set; }

    [XmlElement("andreiddokumenter")]
    [JsonProperty("andreiddokumenter")]
    [JsonPropertyName("andreiddokumenter")]
    public List<Iddokumenter> andreiddokumenter { get; set; }

    [XmlElement("harandreiddokumenter")]
    [JsonProperty("harandreiddokumenter")]
    [JsonPropertyName("harandreiddokumenter")]
    public string harandreiddokumenter { get; set; }

    [XmlElement("harpostadrsammesombosted")]
    [JsonProperty("harpostadrsammesombosted")]
    [JsonPropertyName("harpostadrsammesombosted")]
    public string harpostadrsammesombosted { get; set; }

    [XmlElement("person")]
    [JsonProperty("person")]
    [JsonPropertyName("person")]
    public Person person { get; set; }

    [XmlElement("harandrestatsborgerskap")]
    [JsonProperty("harandrestatsborgerskap")]
    [JsonPropertyName("harandrestatsborgerskap")]
    public string harandrestatsborgerskap { get; set; }

    [XmlElement("hatttidligerestatsborgerskap")]
    [JsonProperty("hatttidligerestatsborgerskap")]
    [JsonPropertyName("hatttidligerestatsborgerskap")]
    public string hatttidligerestatsborgerskap { get; set; }

    [XmlElement("hattoppholdutland")]
    [JsonProperty("hattoppholdutland")]
    [JsonPropertyName("hattoppholdutland")]
    public string hattoppholdutland { get; set; }

    [XmlElement("hattoppholdeu")]
    [JsonProperty("hattoppholdeu")]
    [JsonPropertyName("hattoppholdeu")]
    public string hattoppholdeu { get; set; }

    [XmlElement("samtykkepersonkontroll")]
    [JsonProperty("samtykkepersonkontroll")]
    [JsonPropertyName("samtykkepersonkontroll")]
    public string samtykkepersonkontroll { get; set; }
  }

    public class Adresse
    {
    [XmlElement("adressebeskrivelse")]
    [JsonProperty("adressebeskrivelse")]
    [JsonPropertyName("adressebeskrivelse")]
    public string adressebeskrivelse { get; set; }

    [XmlElement("postnummer")]
    [JsonProperty("postnummer")]
    [JsonPropertyName("postnummer")]
    public string postnummer { get; set; }

    [XmlElement("poststed")]
    [JsonProperty("poststed")]
    [JsonPropertyName("poststed")]
    public string poststed { get; set; }

    [XmlElement("land")]
    [JsonProperty("land")]
    [JsonPropertyName("land")]
    public string land { get; set; }
  }

    public class Iddokumenter
    {
    [XmlElement("typedokument")]
    [JsonProperty("typedokument")]
    [JsonPropertyName("typedokument")]
    public string typedokument { get; set; }

    [XmlElement("dokumentnr")]
    [JsonProperty("dokumentnr")]
    [JsonPropertyName("dokumentnr")]
    public string dokumentnr { get; set; }

    [XmlElement("land")]
    [JsonProperty("land")]
    [JsonPropertyName("land")]
    public string land { get; set; }
  }

    public class Person
    {
    [XmlElement("foedselsnummer")]
    [JsonProperty("foedselsnummer")]
    [JsonPropertyName("foedselsnummer")]
    public string foedselsnummer { get; set; }

    [XmlElement("utenlandskfoedselsnummer")]
    [JsonProperty("utenlandskfoedselsnummer")]
    [JsonPropertyName("utenlandskfoedselsnummer")]
    public string utenlandskfoedselsnummer { get; set; }

    [XmlElement("foedselsdato")]
    [JsonProperty("foedselsdato")]
    [JsonPropertyName("foedselsdato")]
    public string foedselsdato { get; set; }

    [XmlElement("kjoenn")]
    [JsonProperty("kjoenn")]
    [JsonPropertyName("kjoenn")]
    public string kjoenn { get; set; }

    [XmlElement("personnavn")]
    [JsonProperty("personnavn")]
    [JsonPropertyName("personnavn")]
    public Personnavn personnavn { get; set; }

    [XmlElement("naavaandestatsborgerskap")]
    [JsonProperty("naavaandestatsborgerskap")]
    [JsonPropertyName("naavaandestatsborgerskap")]
    public Statsborgerskap naavaandestatsborgerskap { get; set; }

    [XmlElement("utenlandsadresse")]
    [JsonProperty("utenlandsadresse")]
    [JsonPropertyName("utenlandsadresse")]
    public List<Adresse> utenlandsadresse { get; set; }
    }

    public class Personnavn
    {
    [XmlElement("fornavn")]
    [JsonProperty("fornavn")]
    [JsonPropertyName("fornavn")]
    public string fornavn { get; set; }

    [XmlElement("mellomnavn")]
    [JsonProperty("mellomnavn")]
    [JsonPropertyName("mellomnavn")]
    public string mellomnavn { get; set; }

    [XmlElement("etternavn")]
    [JsonProperty("etternavn")]
    [JsonPropertyName("etternavn")]
    public string etternavn { get; set; }

    [XmlElement("fulltnavn")]
    [JsonProperty("fulltnavn")]
    [JsonPropertyName("fulltnavn")]
    public string fulltnavn { get; set; }
  }

    public class Statsborgerskap
    {
    [XmlElement("fraDato")]
    [JsonProperty("fraDato")]
    [JsonPropertyName("fraDato")]
    public string fraDato { get; set; }

    [XmlElement("tilDato")]
    [JsonProperty("tilDato")]
    [JsonPropertyName("tilDato")]
    public string tilDato { get; set; }

    [XmlElement("passnr")]
    [JsonProperty("passnr")]
    [JsonPropertyName("passnr")]
    public string passnr { get; set; }

    [XmlElement("fodested")]
    [JsonProperty("fodested")]
    [JsonPropertyName("fodested")]
    public string fodested { get; set; }

    [XmlElement("fodeland")]
    [JsonProperty("fodeland")]
    [JsonPropertyName("fodeland")]
    public string fodeland { get; set; }

    [XmlElement("statsborgerfrafodsel")]
    [JsonProperty("statsborgerfrafodsel")]
    [JsonPropertyName("statsborgerfrafodsel")]
    public string statsborgerfrafodsel { get; set; }

    [XmlElement("land")]
    [JsonProperty("land")]
    [JsonPropertyName("land")]
    public string land { get; set; }
  }

    public class Relasjoner
    {
    [XmlElement("barn")]
    [JsonProperty("barn")]
    [JsonPropertyName("barn")]
    public List<Person> barn { get; set; }

    [XmlElement("far")]
    [JsonProperty("far")]
    [JsonPropertyName("far")]
    public Person far { get; set; }

    [XmlElement("mor")]
    [JsonProperty("mor")]
    [JsonPropertyName("mor")]
    public Person mor { get; set; }

    [XmlElement("sosken")]
    [JsonProperty("sosken")]
    [JsonPropertyName("sosken")]
    public List<Person> sosken { get; set; }

    [XmlElement("fodtannetlandmor")]
    [JsonProperty("fodtannetlandmor")]
    [JsonPropertyName("fodtannetlandmor")]
    public string fodtannetlandmor { get; set; }

    [XmlElement("fodtannetlandfar")]
    [JsonProperty("fodtannetlandfar")]
    [JsonPropertyName("fodtannetlandfar")]
    public string fodtannetlandfar { get; set; }

    [XmlElement("persontilknytning")]
    [JsonProperty("persontilknytning")]
    [JsonPropertyName("persontilknytning")]
    public List<Naerstaaende> persontilknytning { get; set; }
    }

    public class Naerstaaende
    {
    [XmlElement("personinfo")]
    [JsonProperty("personinfo")]
    [JsonPropertyName("personinfo")]
    public Person personinfo { get; set; }

    [XmlElement("harinvesteringerutland")]
    [JsonProperty("harinvesteringerutland")]
    [JsonPropertyName("harinvesteringerutland")]
    public string harinvesteringerutland { get; set; }

    [XmlElement("bosattutland")]
    [JsonProperty("bosattutland")]
    [JsonPropertyName("bosattutland")]
    public string bosattutland { get; set; }

    [XmlElement("harblittstrattet")]
    [JsonProperty("harblittstrattet")]
    [JsonPropertyName("harblittstrattet")]
    public string harblittstrattet { get; set; }

    [XmlElement("harkontaktmedorgkrim")]
    [JsonProperty("harkontaktmedorgkrim")]
    [JsonPropertyName("harkontaktmedorgkrim")]
    public string harkontaktmedorgkrim { get; set; }

    [XmlElement("hartransaksjonutland")]
    [JsonProperty("hartransaksjonutland")]
    [JsonPropertyName("hartransaksjonutland")]
    public string hartransaksjonutland { get; set; }

    [XmlElement("hatttjenesterutland")]
    [JsonProperty("hatttjenesterutland")]
    [JsonPropertyName("hatttjenesterutland")]
    public string hatttjenesterutland { get; set; }

    [XmlElement("hattkontaktetterettning")]
    [JsonProperty("hattkontaktetterettning")]
    [JsonPropertyName("hattkontaktetterettning")]
    public string hattkontaktetterettning { get; set; }

    [XmlElement("relasjonmedperson")]
    [JsonProperty("relasjonmedperson")]
    [JsonPropertyName("relasjonmedperson")]
    public string relasjonmedperson { get; set; }
    }

    public class Samboerektefelle
    {
    [XmlElement("hattsamboerstatsborgerandreland")]
    [JsonProperty("hattsamboerstatsborgerandreland")]
    [JsonPropertyName("hattsamboerstatsborgerandreland")]
    public string hattsamboerstatsborgerandreland { get; set; }

    [XmlElement("hattoppholdutland")]
    [JsonProperty("hattoppholdutland")]
    [JsonPropertyName("hattoppholdutland")]
    public string hattoppholdutland { get; set; }

    [XmlElement("hattoppholdeos")]
    [JsonProperty("hattoppholdeos")]
    [JsonPropertyName("hattoppholdeos")]
    public string hattoppholdeos { get; set; }

    [XmlElement("samboerperson")]
    [JsonProperty("samboerperson")]
    [JsonPropertyName("samboerperson")]
    public Person samboerperson { get; set; }

    [XmlElement("naavaerendestatsborgerskap")]
    [JsonProperty("naavaerendestatsborgerskap")]
    [JsonPropertyName("naavaerendestatsborgerskap")]
    public Statsborgerskap naavaerendestatsborgerskap { get; set; }

    [XmlElement("FlereStatsborgerskap")]
    [JsonProperty("FlereStatsborgerskap")]
    [JsonPropertyName("FlereStatsborgerskap")]
    public List<Statsborgerskap> FlereStatsborgerskap { get; set; }

    [XmlElement("TidligereStatsborgerskap")]
    [JsonProperty("TidligereStatsborgerskap")]
    [JsonPropertyName("TidligereStatsborgerskap")]
    public List<Statsborgerskap> TidligereStatsborgerskap { get; set; }

    [XmlElement("SamboerEktefelleBostederUtland")]
    [JsonProperty("SamboerEktefelleBostederUtland")]
    [JsonPropertyName("SamboerEktefelleBostederUtland")]
    public List<Bostedhistorikkutland> SamboerEktefelleBostederUtland { get; set; }

    [XmlElement("SamboerEktefelleBostederEU")]
    [JsonProperty("SamboerEktefelleBostederEU")]
    [JsonPropertyName("SamboerEktefelleBostederEU")]
    public List<Bostedhistorikkeu> SamboerEktefelleBostederEU { get; set; }

    [XmlElement("BostederUtland")]
    [JsonProperty("BostederUtland")]
    [JsonPropertyName("BostederUtland")]
    public List<Bostedhistorikkutland> BostederUtland { get; set; }

    [XmlElement("BostederEU")]
    [JsonProperty("BostederEU")]
    [JsonPropertyName("BostederEU")]
    public List<Bostedhistorikkeu> BostederEU { get; set; }
  }

    public class Bostedhistorikkutland
    {
    [XmlElement("land")]
    [JsonProperty("land")]
    [JsonPropertyName("land")]
    public string land { get; set; }

    [XmlElement("startoppholdmnd")]
    [JsonProperty("startoppholdmnd")]
    [JsonPropertyName("startoppholdmnd")]
    public string startoppholdmnd { get; set; }

    [XmlElement("startoppholdaar")]
    [JsonProperty("startoppholdaar")]
    [JsonPropertyName("startoppholdaar")]
    public string startoppholdaar { get; set; }

    [XmlElement("sluttoppholdmnd")]
    [JsonProperty("sluttoppholdmnd")]
    [JsonPropertyName("sluttoppholdmnd")]
    public string sluttoppholdmnd { get; set; }

    [XmlElement("sluttoppholdaar")]
    [JsonProperty("sluttoppholdaar")]
    [JsonPropertyName("sluttoppholdaar")]
    public string sluttoppholdaar { get; set; }

    [XmlElement("adresse")]
    [JsonProperty("adresse")]
    [JsonPropertyName("adresse")]
    public string adresse { get; set; }

    [XmlElement("postnr")]
    [JsonProperty("postnr")]
    [JsonPropertyName("postnr")]
    public string postnr { get; set; }

    [XmlElement("poststed")]
    [JsonProperty("poststed")]
    [JsonPropertyName("poststed")]
    public string poststed { get; set; }

    [XmlElement("bakgrunn")]
    [JsonProperty("bakgrunn")]
    [JsonPropertyName("bakgrunn")]
    public string bakgrunn { get; set; }

    [XmlElement("spesifikasjon")]
    [JsonProperty("spesifikasjon")]
    [JsonPropertyName("spesifikasjon")]
    public string spesifikasjon { get; set; }
    }

    public class Bostedhistorikkeu
    {
    [XmlElement("land")]
    [JsonProperty("land")]
    [JsonPropertyName("land")]
    public string land { get; set; }

    [XmlElement("spesifikasjon")]
    [JsonProperty("spesifikasjon")]
    [JsonPropertyName("spesifikasjon")]
    public string spesifikasjon { get; set; }

    [XmlElement("bakgrunn")]
    [JsonProperty("bakgrunn")]
    [JsonPropertyName("bakgrunn")]
    public string bakgrunn { get; set; }

    [XmlElement("antallganger")]
    [JsonProperty("antallganger")]
    [JsonPropertyName("antallganger")]
    public string antallganger { get; set; }
    }

    public class OEkonomi
    {
    [XmlElement("hattprivatelaan")]
    [JsonProperty("hattprivatelaan")]
    [JsonPropertyName("hattprivatelaan")]
    public string hattprivatelaan { get; set; }

    [XmlElement("redegjorelseprivatelaan")]
    [JsonProperty("redegjorelseprivatelaan")]
    [JsonPropertyName("redegjorelseprivatelaan")]
    public string redegjorelseprivatelaan { get; set; }

    [XmlElement("hattmislighold")]
    [JsonProperty("hattmislighold")]
    [JsonPropertyName("hattmislighold")]
    public string hattmislighold { get; set; }

    [XmlElement("redegjorelsemislighold")]
    [JsonProperty("redegjorelsemislighold")]
    [JsonPropertyName("redegjorelsemislighold")]
    public string redegjorelsemislighold { get; set; }

    [XmlElement("hattpengespill")]
    [JsonProperty("hattpengespill")]
    [JsonPropertyName("hattpengespill")]
    public string hattpengespill { get; set; }

    [XmlElement("redegjorelsepengespill")]
    [JsonProperty("redegjorelsepengespill")]
    [JsonPropertyName("redegjorelsepengespill")]
    public string redegjorelsepengespill { get; set; }

    [XmlElement("investeringer")]
    [JsonProperty("investeringer")]
    [JsonPropertyName("investeringer")]
    public List<Investering> investeringer { get; set; }

    [XmlElement("harinvesteringer")]
    [JsonProperty("harinvesteringer")]
    [JsonPropertyName("harinvesteringer")]
    public string harinvesteringer { get; set; }

    [XmlElement("harmottattpenger")]
    [JsonProperty("harmottattpenger")]
    [JsonPropertyName("harmottattpenger")]
    public string harmottattpenger { get; set; }

    [XmlElement("mottattpengerutland")]
    [JsonProperty("mottattpengerutland")]
    [JsonPropertyName("mottattpengerutland")]
    public List<Transaksjonutland> mottattpengerutland { get; set; }

    [XmlElement("harsentpenger")]
    [JsonProperty("harsentpenger")]
    [JsonPropertyName("harsentpenger")]
    public string harsentpenger { get; set; }

    [XmlElement("sentpengerutland")]
    [JsonProperty("sentpengerutland")]
    [JsonPropertyName("sentpengerutland")]
    public List<Transaksjonutland> sentpengerutland { get; set; }

    [XmlElement("okonomiskesituasjon")]
    [JsonProperty("okonomiskesituasjon")]
    [JsonPropertyName("okonomiskesituasjon")]
    public string okonomiskesituasjon { get; set; }

    [XmlElement("okonomiskesituasjonbeskrivelse")]
    [JsonProperty("okonomiskesituasjonbeskrivelse")]
    [JsonPropertyName("okonomiskesituasjonbeskrivelse")]
    public string okonomiskesituasjonbeskrivelse { get; set; }
    }

    public class Investering
    {
    [XmlElement("type")]
    [JsonProperty("type")]
    [JsonPropertyName("type")]
    public string type { get; set; }

    [XmlElement("harinvestering")]
    [JsonProperty("harinvestering")]
    [JsonPropertyName("harinvestering")]
    public string harinvestering { get; set; }

    [XmlElement("land")]
    [JsonProperty("land")]
    [JsonPropertyName("land")]
    public string land { get; set; }
    }

    public class Transaksjonutland
    {
    [XmlElement("antallganger")]
    [JsonProperty("antallganger")]
    [JsonPropertyName("antallganger")]
    public string antallganger { get; set; }

    [XmlElement("opprinnelsepenger")]
    [JsonProperty("opprinnelsepenger")]
    [JsonPropertyName("opprinnelsepenger")]
    public string opprinnelsepenger { get; set; }

    [XmlElement("anledning")]
    [JsonProperty("anledning")]
    [JsonPropertyName("anledning")]
    public string anledning { get; set; }

    [XmlElement("belop")]
    [JsonProperty("belop")]
    [JsonPropertyName("belop")]
    public string belop { get; set; }
    }

    public class Strafferettslig
    {
    [XmlElement("hattlovbruddnorge")]
    [JsonProperty("hattlovbruddnorge")]
    [JsonPropertyName("hattlovbruddnorge")]
    public string hattlovbruddnorge { get; set; }

    [XmlElement("beskrivelserefselse")]
    [JsonProperty("beskrivelserefselse")]
    [JsonPropertyName("beskrivelserefselse")]
    public string beskrivelserefselse { get; set; }

    [XmlElement("hattrefselse")]
    [JsonProperty("hattrefselse")]
    [JsonPropertyName("hattrefselse")]
    public string hattrefselse { get; set; }

    [XmlElement("hattlovbruddutland")]
    [JsonProperty("hattlovbruddutland")]
    [JsonPropertyName("hattlovbruddutland")]
    public string hattlovbruddutland { get; set; }

    [XmlElement("straffforholdnorge")]
    [JsonProperty("straffforholdnorge")]
    [JsonPropertyName("straffforholdnorge")]
    public Straffforhold straffforholdnorge { get; set; }

    [XmlElement("hattstraffutlandet")]
    [JsonProperty("hattstraffutlandet")]
    [JsonPropertyName("hattstraffutlandet")]
    public List<Straffforhold> hattstraffutlandet { get; set; }
    }

    public class Straffforhold
    {
    [XmlElement("aar")]
    [JsonProperty("aar")]
    [JsonPropertyName("aar")]
    public string aar { get; set; }

    [XmlElement("land")]
    [JsonProperty("land")]
    [JsonPropertyName("land")]
    public string land { get; set; }

    [XmlElement("utfall")]
    [JsonProperty("utfall")]
    [JsonPropertyName("utfall")]
    public string utfall { get; set; }

    [XmlElement("type")]
    [JsonProperty("type")]
    [JsonPropertyName("type")]
    public string type { get; set; }
    }

    public class Rusmidler
    {
    [XmlElement("hattalkoholhendelser")]
    [JsonProperty("hattalkoholhendelser")]
    [JsonPropertyName("hattalkoholhendelser")]
    public string hattalkoholhendelser { get; set; }

    [XmlElement("beskrivelsereaksjonalkohol")]
    [JsonProperty("beskrivelsereaksjonalkohol")]
    [JsonPropertyName("beskrivelsereaksjonalkohol")]
    public string beskrivelsereaksjonalkohol { get; set; }

    [XmlElement("hattdoping")]
    [JsonProperty("hattdoping")]
    [JsonPropertyName("hattdoping")]
    public string hattdoping { get; set; }

    [XmlElement("hattalkoholreaksjoner")]
    [JsonProperty("hattalkoholreaksjoner")]
    [JsonPropertyName("hattalkoholreaksjoner")]
    public string hattalkoholreaksjoner { get; set; }

    [XmlElement("beskrivelsehendelseralkohol")]
    [JsonProperty("beskrivelsehendelseralkohol")]
    [JsonPropertyName("beskrivelsehendelseralkohol")]
    public string beskrivelsehendelseralkohol { get; set; }

    [XmlElement("beskrivelsenarkotika")]
    [JsonProperty("beskrivelsenarkotika")]
    [JsonPropertyName("beskrivelsenarkotika")]
    public string beskrivelsenarkotika { get; set; }

    [XmlElement("beskrivelsedoping")]
    [JsonProperty("beskrivelsedoping")]
    [JsonPropertyName("beskrivelsedoping")]
    public string beskrivelsedoping { get; set; }

    [XmlElement("hattbruktnarkotika")]
    [JsonProperty("hattbruktnarkotika")]
    [JsonPropertyName("hattbruktnarkotika")]
    public string hattbruktnarkotika { get; set; }

    [XmlElement("hattbehandlingrus")]
    [JsonProperty("hattbehandlingrus")]
    [JsonPropertyName("hattbehandlingrus")]
    public string hattbehandlingrus { get; set; }

    [XmlElement("hattakan")]
    [JsonProperty("hattakan")]
    [JsonPropertyName("hattakan")]
    public string hattakan { get; set; }
    }

    public class Sikkerhetsopplysninger
    {
    [XmlElement("hattKontaktterror")]
    [JsonProperty("hattKontaktterror")]
    [JsonPropertyName("hattKontaktterror")]
    public string hattKontaktterror { get; set; }

    [XmlElement("hattkontaktkriminalitet")]
    [JsonProperty("hattkontaktkriminalitet")]
    [JsonPropertyName("hattkontaktkriminalitet")]
    public string hattkontaktkriminalitet { get; set; }

    [XmlElement("beskrivelsekrim")]
    [JsonProperty("beskrivelsekrim")]
    [JsonPropertyName("beskrivelsekrim")]
    public string beskrivelsekrim { get; set; }

    [XmlElement("hattkontaktkrim")]
    [JsonProperty("hattkontaktkrim")]
    [JsonPropertyName("hattkontaktkrim")]
    public string hattkontaktkrim { get; set; }

    [XmlElement("beskrivelsekontaktterror")]
    [JsonProperty("beskrivelsekontaktterror")]
    [JsonPropertyName("beskrivelsekontaktterror")]
    public string beskrivelsekontaktterror { get; set; }

    [XmlElement("harandreforhold")]
    [JsonProperty("harandreforhold")]
    [JsonPropertyName("harandreforhold")]
    public string harandreforhold { get; set; }

    [XmlElement("beskrivelseandreforhold")]
    [JsonProperty("beskrivelseandreforhold")]
    [JsonPropertyName("beskrivelseandreforhold")]
    public string beskrivelseandreforhold { get; set; }
    }

    public class Statstilknytning
    {
    [XmlElement("hatttjenensterutland")]
    [JsonProperty("hatttjenensterutland")]
    [JsonPropertyName("hatttjenensterutland")]
    public string hatttjenensterutland { get; set; }

    [XmlElement("hatttjenestemilitaere")]
    [JsonProperty("hatttjenestemilitaere")]
    [JsonPropertyName("hatttjenestemilitaere")]
    public string hatttjenestemilitaere { get; set; }

    [XmlElement("militaertjenesteland")]
    [JsonProperty("militaertjenesteland")]
    [JsonPropertyName("militaertjenesteland")]
    public string militaertjenesteland { get; set; }

    [XmlElement("militaerfradato")]
    [JsonProperty("militaerfradato")]
    [JsonPropertyName("militaerfradato")]
    public string militaerfradato { get; set; }

    [XmlElement("militaertildato")]
    [JsonProperty("militaertildato")]
    [JsonPropertyName("militaertildato")]
    public string militaertildato { get; set; }

    [XmlElement("militaerbeskrivelse")]
    [JsonProperty("militaerbeskrivelse")]
    [JsonPropertyName("militaerbeskrivelse")]
    public string militaerbeskrivelse { get; set; }

    [XmlElement("harstudertutland")]
    [JsonProperty("harstudertutland")]
    [JsonPropertyName("harstudertutland")]
    public string harstudertutland { get; set; }

    [XmlElement("hattkontaktetteretning")]
    [JsonProperty("hattkontaktetteretning")]
    [JsonPropertyName("hattkontaktetteretning")]
    public string hattkontaktetteretning { get; set; }

    [XmlElement("beskrivelseetterretning")]
    [JsonProperty("beskrivelseetterretning")]
    [JsonPropertyName("beskrivelseetterretning")]
    public string beskrivelseetterretning { get; set; }

    [XmlElement("tilknyttningstilfeller")]
    [JsonProperty("tilknyttningstilfeller")]
    [JsonPropertyName("tilknyttningstilfeller")]
    public List<Tilknytningtilfelle> tilknyttningstilfeller { get; set; }

    [XmlElement("utdanningssteder")]
    [JsonProperty("utdanningssteder")]
    [JsonPropertyName("utdanningssteder")]
    public List<Utdanningssted> utdanningssteder { get; set; }
    }

    public class Tilknytningtilfelle
    {
    [XmlElement("beskrivelse")]
    [JsonProperty("beskrivelse")]
    [JsonPropertyName("beskrivelse")]
    public string beskrivelse { get; set; }

    [XmlElement("land")]
    [JsonProperty("land")]
    [JsonPropertyName("land")]
    public string land { get; set; }

    [XmlElement("fra")]
    [JsonProperty("fra")]
    [JsonPropertyName("fra")]
    public string fra { get; set; }

    [XmlElement("til")]
    [JsonProperty("til")]
    [JsonPropertyName("til")]
    public string til { get; set; }
  }

    public class Utdanningssted
    {
    [XmlElement("utdanningsted")]
    [JsonProperty("utdanningsted")]
    [JsonPropertyName("utdanningsted")]
    public string utdanningsted { get; set; }

    [XmlElement("land")]
    [JsonProperty("land")]
    [JsonPropertyName("land")]
    public string land { get; set; }

    [XmlElement("fra")]
    [JsonProperty("fra")]
    [JsonPropertyName("fra")]
    public string fra { get; set; }

    [XmlElement("til")]
    [JsonProperty("til")]
    [JsonPropertyName("til")]
    public string til { get; set; }
  }

    public class Helse
    {
    [XmlElement("hattsykdom")]
    [JsonProperty("hattsykdom")]
    [JsonPropertyName("hattsykdom")]
    public string hattsykdom { get; set; }

    [XmlElement("HelseUtredning")]
    [JsonProperty("HelseUtredning")]
    [JsonPropertyName("HelseUtredning")]
    public Helseutredning HelseUtredning { get; set; }

    [XmlElement("hattvurderingsevne")]
    [JsonProperty("hattvurderingsevne")]
    [JsonPropertyName("hattvurderingsevne")]
    public string hattvurderingsevne { get; set; }

    [XmlElement("utdypelsevurderingsevne")]
    [JsonProperty("utdypelsevurderingsevne")]
    [JsonPropertyName("utdypelsevurderingsevne")]
    public string utdypelsevurderingsevne { get; set; }

    [XmlElement("hattlegemidler")]
    [JsonProperty("hattlegemidler")]
    [JsonPropertyName("hattlegemidler")]
    public string hattlegemidler { get; set; }

    [XmlElement("utdypelselegemidler")]
    [JsonProperty("utdypelselegemidler")]
    [JsonPropertyName("utdypelselegemidler")]
    public string utdypelselegemidler { get; set; }
  }

    public class Helseutredning
    {
    [XmlElement("typebehandling")]
    [JsonProperty("typebehandling")]
    [JsonPropertyName("typebehandling")]
    public string typebehandling { get; set; }

    [XmlElement("tidspunktbehandling")]
    [JsonProperty("tidspunktbehandling")]
    [JsonPropertyName("tidspunktbehandling")]
    public string tidspunktbehandling { get; set; }

    [XmlElement("utdypelse")]
    [JsonProperty("utdypelse")]
    [JsonPropertyName("utdypelse")]
    public string utdypelse { get; set; }
  }

    public class Arbeidserfaringer
    {
    [XmlElement("fraaar")]
    [JsonProperty("fraaar")]
    [JsonPropertyName("fraaar")]
    public string fraaar { get; set; }

    [XmlElement("tilaar")]
    [JsonProperty("tilaar")]
    [JsonPropertyName("tilaar")]
    public string tilaar { get; set; }

    [XmlElement("stilling")]
    [JsonProperty("stilling")]
    [JsonPropertyName("stilling")]
    public string stilling { get; set; }

    [XmlElement("type")]
    [JsonProperty("type")]
    [JsonPropertyName("type")]
    public string type { get; set; }

    [XmlElement("tildagsdato")]
    [JsonProperty("tildagsdato")]
    [JsonPropertyName("tildagsdato")]
    public string tildagsdato { get; set; }

    [XmlElement("arbeidssted")]
    [JsonProperty("arbeidssted")]
    [JsonPropertyName("arbeidssted")]
    public string arbeidssted { get; set; }

    [XmlElement("arbeidstedsland")]
    [JsonProperty("arbeidstedsland")]
    [JsonPropertyName("arbeidstedsland")]
    public string arbeidstedsland { get; set; }

    [XmlElement("selskap")]
    [JsonProperty("selskap")]
    [JsonPropertyName("selskap")]
    public string selskap { get; set; }

    [XmlElement("selskapsland")]
    [JsonProperty("selskapsland")]
    [JsonPropertyName("selskapsland")]
    public string selskapsland { get; set; }

    [XmlElement("skole")]
    [JsonProperty("skole")]
    [JsonPropertyName("skole")]
    public string skole { get; set; }

    [XmlElement("skolensland")]
    [JsonProperty("skolensland")]
    [JsonPropertyName("skolensland")]
    public string skolensland { get; set; }

    [XmlElement("arbeidsledigland")]
    [JsonProperty("arbeidsledigland")]
    [JsonPropertyName("arbeidsledigland")]
    public string arbeidsledigland { get; set; }

    [XmlElement("framaaned")]
    [JsonProperty("framaaned")]
    [JsonPropertyName("framaaned")]
    public string framaaned { get; set; }

    [XmlElement("tilmaaned")]
    [JsonProperty("tilmaaned")]
    [JsonPropertyName("tilmaaned")]
    public string tilmaaned { get; set; }
  }

    public class Deusrequest
    {
    [XmlElement("clearauthority")]
    [JsonProperty("clearauthority")]
    [JsonPropertyName("clearauthority")]
    public string clearauthority { get; set; }

    [XmlElement("nationallevel")]
    [JsonProperty("nationallevel")]
    [JsonPropertyName("nationallevel")]
    public string nationallevel { get; set; }

    [XmlElement("natolevel")]
    [JsonProperty("natolevel")]
    [JsonPropertyName("natolevel")]
    public string natolevel { get; set; }

    [XmlElement("personid")]
    [JsonProperty("personid")]
    [JsonPropertyName("personid")]
    public string personid { get; set; }

    [XmlElement("requestbusiness")]
    [JsonProperty("requestbusiness")]
    [JsonPropertyName("requestbusiness")]
    public string requestbusiness { get; set; }

    [XmlElement("requestid")]
    [JsonProperty("requestid")]
    [JsonPropertyName("requestid")]
    public string requestid { get; set; }
  }
#pragma warning restore SA1300 // Element should begin with upper-case letter
}
