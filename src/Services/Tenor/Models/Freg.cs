#nullable disable
namespace LocalTest.Services.Tenor.Models;

using System.Text.Json.Serialization;

public class Freg
{
    /// <summary>
    /// Internally assigned property that is Altinn's inernal ID
    /// </summary>
    [JsonIgnore]
    public int PartyId { get; set; }

    [JsonPropertyName("identifikasjonsnummer")]
    public List<Identifikasjonsnummer> Identifikasjonsnummer { get; set; }

    [JsonPropertyName("status")]
    public List<StatusType> Status { get; set; }

    [JsonPropertyName("kjoenn")]
    public List<KjoennType> Kjoenn { get; set; }

    [JsonPropertyName("foedsel")]
    public List<Foedsel> Foedsel { get; set; }

    [JsonPropertyName("foedselINorge")]
    public List<FoedselINorge> FoedselINorge { get; set; }

    [JsonPropertyName("familierelasjon")]
    public List<Familierelasjon> Familierelasjon { get; set; }

    [JsonPropertyName("sivilstand")]
    public List<SivilstandType> Sivilstand { get; set; }

    [JsonPropertyName("navn")]
    public List<Navn> Navn { get; set; }

    [JsonPropertyName("bostedsadresse")]
    public List<Bostedsadresse> Bostedsadresse { get; set; }

    [JsonPropertyName("statsborgerskap")]
    public List<StatsborgerskapType> Statsborgerskap { get; set; }
}

public class Adressenummer
{
    [JsonPropertyName("husnummer")]
    public string Husnummer { get; set; }
}

public class Bostedsadresse
{
    [JsonPropertyName("ajourholdstidspunkt")]
    public DateTime? Ajourholdstidspunkt { get; set; }

    [JsonPropertyName("erGjeldende")]
    public bool? ErGjeldende { get; set; }

    [JsonPropertyName("kilde")]
    public string Kilde { get; set; }

    [JsonPropertyName("aarsak")]
    public string Aarsak { get; set; }

    [JsonPropertyName("gyldighetstidspunkt")]
    public DateTime? Gyldighetstidspunkt { get; set; }

    [JsonPropertyName("vegadresse")]
    public Vegadresse Vegadresse { get; set; }

    [JsonPropertyName("adresseIdentifikatorFraMatrikkelen")]
    public string AdresseIdentifikatorFraMatrikkelen { get; set; }

    [JsonPropertyName("adressegradering")]
    public string Adressegradering { get; set; }

    [JsonPropertyName("flyttedato")]
    public string Flyttedato { get; set; }

    [JsonPropertyName("grunnkrets")]
    public int? Grunnkrets { get; set; }

    [JsonPropertyName("stemmekrets")]
    public int? Stemmekrets { get; set; }

    [JsonPropertyName("skolekrets")]
    public int? Skolekrets { get; set; }

    [JsonPropertyName("kirkekrets")]
    public int? Kirkekrets { get; set; }
}

public class Familierelasjon
{
    [JsonPropertyName("ajourholdstidspunkt")]
    public DateTime? Ajourholdstidspunkt { get; set; }

    [JsonPropertyName("erGjeldende")]
    public bool? ErGjeldende { get; set; }

    [JsonPropertyName("kilde")]
    public string Kilde { get; set; }

    [JsonPropertyName("aarsak")]
    public string Aarsak { get; set; }

    [JsonPropertyName("gyldighetstidspunkt")]
    public DateTime? Gyldighetstidspunkt { get; set; }

    [JsonPropertyName("relatertPerson")]
    public string RelatertPerson { get; set; }

    [JsonPropertyName("relatertPersonsRolle")]
    public string RelatertPersonsRolle { get; set; }

    [JsonPropertyName("minRolleForPerson")]
    public string MinRolleForPerson { get; set; }
}

public class Foedsel
{
    [JsonPropertyName("ajourholdstidspunkt")]
    public DateTime? Ajourholdstidspunkt { get; set; }

    [JsonPropertyName("erGjeldende")]
    public bool? ErGjeldende { get; set; }

    [JsonPropertyName("kilde")]
    public string Kilde { get; set; }

    [JsonPropertyName("gyldighetstidspunkt")]
    public DateTime? Gyldighetstidspunkt { get; set; }

    [JsonPropertyName("foedselsdato")]
    public string Foedselsdato { get; set; }

    [JsonPropertyName("foedselsaar")]
    public string Foedselsaar { get; set; }

    [JsonPropertyName("foedekommuneINorge")]
    public string FoedekommuneINorge { get; set; }

    [JsonPropertyName("foedeland")]
    public string Foedeland { get; set; }
}

public class FoedselINorge
{
    [JsonPropertyName("ajourholdstidspunkt")]
    public DateTime? Ajourholdstidspunkt { get; set; }

    [JsonPropertyName("erGjeldende")]
    public bool? ErGjeldende { get; set; }

    [JsonPropertyName("kilde")]
    public string Kilde { get; set; }

    [JsonPropertyName("aarsak")]
    public string Aarsak { get; set; }

    [JsonPropertyName("gyldighetstidspunkt")]
    public DateTime? Gyldighetstidspunkt { get; set; }

    [JsonPropertyName("foedselsinstitusjonsnavn")]
    public string Foedselsinstitusjonsnavn { get; set; }

    [JsonPropertyName("rekkefoelgenummer")]
    public int? Rekkefoelgenummer { get; set; }
}

public class Identifikasjonsnummer
{
    [JsonPropertyName("ajourholdstidspunkt")]
    public DateTime? Ajourholdstidspunkt { get; set; }

    [JsonPropertyName("erGjeldende")]
    public bool? ErGjeldende { get; set; }

    [JsonPropertyName("kilde")]
    public string Kilde { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; }

    [JsonPropertyName("foedselsEllerDNummer")]
    public string FoedselsEllerDNummer { get; set; }

    [JsonPropertyName("identifikatortype")]
    public string Identifikatortype { get; set; }
}

public class KjoennType
{
    [JsonPropertyName("erGjeldende")]
    public bool? ErGjeldende { get; set; }

    [JsonPropertyName("kilde")]
    public string Kilde { get; set; }

    [JsonPropertyName("kjoenn")]
    public string Kjoenn { get; set; }
}

public class Navn
{
    [JsonPropertyName("ajourholdstidspunkt")]
    public DateTime? Ajourholdstidspunkt { get; set; }

    [JsonPropertyName("erGjeldende")]
    public bool? ErGjeldende { get; set; }

    [JsonPropertyName("kilde")]
    public string Kilde { get; set; }

    [JsonPropertyName("aarsak")]
    public string Aarsak { get; set; }

    [JsonPropertyName("gyldighetstidspunkt")]
    public DateTime? Gyldighetstidspunkt { get; set; }

    [JsonPropertyName("fornavn")]
    public string Fornavn { get; set; }

    [JsonPropertyName("mellomnavn")]
    public string Mellomnavn { get; set; }

    [JsonPropertyName("etternavn")]
    public string Etternavn { get; set; }
}

public class Poststed
{
    [JsonPropertyName("poststedsnavn")]
    public string Poststedsnavn { get; set; }

    [JsonPropertyName("postnummer")]
    public string Postnummer { get; set; }
}


public class SivilstandType
{
    [JsonPropertyName("ajourholdstidspunkt")]
    public DateTime? Ajourholdstidspunkt { get; set; }

    [JsonPropertyName("erGjeldende")]
    public bool? ErGjeldende { get; set; }

    [JsonPropertyName("kilde")]
    public string Kilde { get; set; }

    [JsonPropertyName("aarsak")]
    public string Aarsak { get; set; }

    [JsonPropertyName("gyldighetstidspunkt")]
    public DateTime? Gyldighetstidspunkt { get; set; }

    [JsonPropertyName("sivilstand")]
    public string Sivilstand { get; set; }

    [JsonPropertyName("sivilstandsdato")]
    public string Sivilstandsdato { get; set; }

    [JsonPropertyName("myndighet")]
    public string Myndighet { get; set; }

    [JsonPropertyName("kommune")]
    public string Kommune { get; set; }

    [JsonPropertyName("sted")]
    public string Sted { get; set; }

    [JsonPropertyName("relatertVedSivilstand")]
    public string RelatertVedSivilstand { get; set; }
}

public class StatsborgerskapType
{
    [JsonPropertyName("ajourholdstidspunkt")]
    public DateTime? Ajourholdstidspunkt { get; set; }

    [JsonPropertyName("erGjeldende")]
    public bool? ErGjeldende { get; set; }

    [JsonPropertyName("kilde")]
    public string Kilde { get; set; }

    [JsonPropertyName("aarsak")]
    public string Aarsak { get; set; }

    [JsonPropertyName("gyldighetstidspunkt")]
    public DateTime? Gyldighetstidspunkt { get; set; }

    [JsonPropertyName("statsborgerskap")]
    public string Statsborgerskap { get; set; }

    [JsonPropertyName("ervervsdato")]
    public string Ervervsdato { get; set; }
}

public class StatusType
{
    [JsonPropertyName("ajourholdstidspunkt")]
    public DateTime? Ajourholdstidspunkt { get; set; }

    [JsonPropertyName("erGjeldende")]
    public bool? ErGjeldende { get; set; }

    [JsonPropertyName("kilde")]
    public string Kilde { get; set; }

    [JsonPropertyName("gyldighetstidspunkt")]
    public DateTime? Gyldighetstidspunkt { get; set; }

    [JsonPropertyName("status")]
    public string Status { get; set; }
}

public class Vegadresse
{
    [JsonPropertyName("kommunenummer")]
    public string Kommunenummer { get; set; }

    [JsonPropertyName("bruksenhetsnummer")]
    public string Bruksenhetsnummer { get; set; }

    [JsonPropertyName("bruksenhetstype")]
    public string Bruksenhetstype { get; set; }

    [JsonPropertyName("adressenavn")]
    public string Adressenavn { get; set; }

    [JsonPropertyName("adressenummer")]
    public Adressenummer Adressenummer { get; set; }

    [JsonPropertyName("adressekode")]
    public string Adressekode { get; set; }

    [JsonPropertyName("poststed")]
    public Poststed Poststed { get; set; }
}

