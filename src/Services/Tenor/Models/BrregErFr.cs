#nullable disable
namespace LocalTest.Services.Tenor.Models;


using System.Text.Json.Serialization;

public class BrregErFr
{
    /// <summary>
    /// Internally assigned property that is Altinn's inernal ID
    /// </summary>
    [JsonIgnore]
    public int PartyId { get; set; }

    [JsonPropertyName("organisasjonsnummer")]
    public string Organisasjonsnummer { get; set; }

    [JsonPropertyName("navn")]
    public string Navn { get; set; }

    [JsonPropertyName("oppdeltNavn")]
    public List<string> OppdeltNavn { get; set; }

    [JsonPropertyName("organisasjonsform")]
    public Organisasjonsform Organisasjonsform { get; set; }

    [JsonPropertyName("forretningsadresse")]
    public Forretningsadresse Forretningsadresse { get; set; }

    [JsonPropertyName("postadresse")]
    public Postadresse Postadresse { get; set; }

    [JsonPropertyName("naeringskoder")]
    public List<Naeringskoder> Naeringskoder { get; set; }

    [JsonPropertyName("institusjonellSektorkode")]
    public InstitusjonellSektorkode InstitusjonellSektorkode { get; set; }

    [JsonPropertyName("registreringsdatoEnhetsregisteret")]
    public string RegistreringsdatoEnhetsregisteret { get; set; }

    [JsonPropertyName("slettetIEnhetsregisteret")]
    public string SlettetIEnhetsregisteret { get; set; }

    [JsonPropertyName("registrertIForetaksregisteret")]
    public string RegistrertIForetaksregisteret { get; set; }

    [JsonPropertyName("registreringsdatoForetaksregisteret")]
    public string RegistreringsdatoForetaksregisteret { get; set; }

    [JsonPropertyName("slettetIForetaksregisteret")]
    public string SlettetIForetaksregisteret { get; set; }

    [JsonPropertyName("registreringspliktigForetaksregisteret")]
    public string RegistreringspliktigForetaksregisteret { get; set; }

    [JsonPropertyName("registrertIFrivillighetsregisteret")]
    public string RegistrertIFrivillighetsregisteret { get; set; }

    [JsonPropertyName("registrertIStiftelsesregisteret")]
    public string RegistrertIStiftelsesregisteret { get; set; }

    [JsonPropertyName("registrertIMvaregisteret")]
    public string RegistrertIMvaregisteret { get; set; }

    [JsonPropertyName("stiftelsesdato")]
    public string Stiftelsesdato { get; set; }

    [JsonPropertyName("aktivitetBransje")]
    public List<string> AktivitetBransje { get; set; }

    [JsonPropertyName("vedtektsdato")]
    public string Vedtektsdato { get; set; }

    [JsonPropertyName("vedtektsfestetFormaal")]
    public List<string> VedtektsfestetFormaal { get; set; }

    [JsonPropertyName("sisteInnsendteAarsregnskap")]
    public string SisteInnsendteAarsregnskap { get; set; }

    [JsonPropertyName("konkurs")]
    public string Konkurs { get; set; }

    [JsonPropertyName("underAvvikling")]
    public string UnderAvvikling { get; set; }

    [JsonPropertyName("underTvangsavviklingEllerTvangsopplosning")]
    public string UnderTvangsavviklingEllerTvangsopplosning { get; set; }

    [JsonPropertyName("maalform")]
    public string Maalform { get; set; }

    [JsonPropertyName("ansvarsbegrensning")]
    public string Ansvarsbegrensning { get; set; }

    [JsonPropertyName("harAnsatte")]
    public string HarAnsatte { get; set; }

    [JsonPropertyName("antallAnsatte")]
    public int? AntallAnsatte { get; set; }

    [JsonPropertyName("underenhet")]
    public Underenhet Underenhet { get; set; }

    [JsonPropertyName("bedriftsforsamling")]
    public string Bedriftsforsamling { get; set; }

    [JsonPropertyName("representantskap")]
    public string Representantskap { get; set; }

    [JsonPropertyName("enhetstatuser")]
    public List<object> Enhetstatuser { get; set; }

    [JsonPropertyName("fullmakter")]
    public List<object> Fullmakter { get; set; }

    [JsonPropertyName("frivilligMvaRegistrert")]
    public List<object> FrivilligMvaRegistrert { get; set; }

    [JsonPropertyName("finansielleInstrumenter")]
    public List<object> FinansielleInstrumenter { get; set; }

    [JsonPropertyName("kapital")]
    public Kapital Kapital { get; set; }

    [JsonPropertyName("kjonnsrepresentasjon")]
    public string Kjonnsrepresentasjon { get; set; }

    [JsonPropertyName("matrikkelnummer")]
    public List<object> Matrikkelnummer { get; set; }

    [JsonPropertyName("paategninger")]
    public List<object> Paategninger { get; set; }

    [JsonPropertyName("fravalgAvRevisjon")]
    public FravalgAvRevisjon FravalgAvRevisjon { get; set; }

    [JsonPropertyName("norskregistrertUtenlandskForetak")]
    public NorskregistrertUtenlandskForetak NorskregistrertUtenlandskForetak { get; set; }

    [JsonPropertyName("lovgivningOgForetaksformIHjemlandet")]
    public LovgivningOgForetaksformIHjemlandet LovgivningOgForetaksformIHjemlandet { get; set; }

    [JsonPropertyName("registerIHjemlandet")]
    public RegisterIHjemlandet RegisterIHjemlandet { get; set; }

    [JsonPropertyName("fusjoner")]
    public List<object> Fusjoner { get; set; }

    [JsonPropertyName("fisjoner")]
    public List<object> Fisjoner { get; set; }

    [JsonPropertyName("rollegrupper")]
    public List<Rollegrupper> Rollegrupper { get; set; }
}

public class Forretningsadresse
{
    [JsonPropertyName("land")]
    public string Land { get; set; }

    [JsonPropertyName("landkode")]
    public string Landkode { get; set; }

    [JsonPropertyName("postnummer")]
    public string Postnummer { get; set; }

    [JsonPropertyName("poststed")]
    public string Poststed { get; set; }

    [JsonPropertyName("adresse")]
    public List<string> Adresse { get; set; }

    [JsonPropertyName("kommune")]
    public string Kommune { get; set; }

    [JsonPropertyName("kommunenummer")]
    public string Kommunenummer { get; set; }
}

public class FravalgAvRevisjon
{
    [JsonPropertyName("fravalg")]
    public string Fravalg { get; set; }
}

public class Fritekst
{
    [JsonPropertyName("plassering")]
    public string Plassering { get; set; }
}

public class InstitusjonellSektorkode
{
    [JsonPropertyName("kode")]
    public string Kode { get; set; }

    [JsonPropertyName("beskrivelse")]
    public string Beskrivelse { get; set; }
}

public class Kapital
{
    [JsonPropertyName("type")]
    public string Type { get; set; }

    [JsonPropertyName("belop")]
    public string Belop { get; set; }

    [JsonPropertyName("antallAksjer")]
    public string AntallAksjer { get; set; }

    [JsonPropertyName("innbetaltBelop")]
    public string InnbetaltBelop { get; set; }

    [JsonPropertyName("fritekst")]
    public List<object> Fritekst { get; set; }

    [JsonPropertyName("fulltInnbetaltBelop")]
    public string FulltInnbetaltBelop { get; set; }

    [JsonPropertyName("sakkyndigRedegjorelse")]
    public string SakkyndigRedegjorelse { get; set; }
}

public class LovgivningOgForetaksformIHjemlandet
{
    [JsonPropertyName("foretaksform")]
    public string Foretaksform { get; set; }
}

public class Naeringskoder
{
    [JsonPropertyName("kode")]
    public string Kode { get; set; }

    [JsonPropertyName("beskrivelse")]
    public string Beskrivelse { get; set; }

    [JsonPropertyName("hjelpeenhetskode")]
    public bool? Hjelpeenhetskode { get; set; }

    [JsonPropertyName("rekkefolge")]
    public int? Rekkefolge { get; set; }

    [JsonPropertyName("nivaa")]
    public int? Nivaa { get; set; }
}

public class NorskregistrertUtenlandskForetak
{
    [JsonPropertyName("helNorskEierskap")]
    public string HelNorskEierskap { get; set; }

    [JsonPropertyName("aktivitetINorge")]
    public string AktivitetINorge { get; set; }
}

public class Organisasjonsform
{
    [JsonPropertyName("kode")]
    public string Kode { get; set; }

    [JsonPropertyName("beskrivelse")]
    public string Beskrivelse { get; set; }
}

public class Person
{
    [JsonPropertyName("foedselsnummer")]
    public string Foedselsnummer { get; set; }
}

public class Postadresse
{
    [JsonPropertyName("land")]
    public string Land { get; set; }

    [JsonPropertyName("landkode")]
    public string Landkode { get; set; }

    [JsonPropertyName("postnummer")]
    public string Postnummer { get; set; }

    [JsonPropertyName("poststed")]
    public string Poststed { get; set; }

    [JsonPropertyName("adresse")]
    public List<string> Adresse { get; set; }

    [JsonPropertyName("kommune")]
    public string Kommune { get; set; }

    [JsonPropertyName("kommunenummer")]
    public string Kommunenummer { get; set; }
}

public class RegisterIHjemlandet
{
    [JsonPropertyName("navnRegister")]
    public List<object> NavnRegister { get; set; }

    [JsonPropertyName("adresse")]
    public List<object> Adresse { get; set; }
}

public class Rollegrupper
{
    [JsonPropertyName("type")]
    public Type Type { get; set; }

    [JsonPropertyName("fritekst")]
    public List<Fritekst> Fritekst { get; set; }

    [JsonPropertyName("roller")]
    public List<Roller> Roller { get; set; }
}

public class Roller
{
    [JsonPropertyName("type")]
    public Type Type { get; set; }

    [JsonPropertyName("person")]
    public Person Person { get; set; }

    [JsonPropertyName("virksomhet")]
    public Virksomhet Virksomhet { get; set; }

    [JsonPropertyName("valgtAv")]
    public ValgtAv ValgtAv { get; set; }

    [JsonPropertyName("fratraadt")]
    public string Fratraadt { get; set; }

    [JsonPropertyName("fritekst")]
    public List<object> Fritekst { get; set; }

    [JsonPropertyName("rekkefolge")]
    public int? Rekkefolge { get; set; }
}



public class Type
{
    [JsonPropertyName("kode")]
    public string Kode { get; set; }

    [JsonPropertyName("beskrivelse")]
    public string Beskrivelse { get; set; }
}

public class Underenhet
{
}

public class ValgtAv
{
}

public class Virksomhet
{
}

