using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
#pragma warning disable SA1300 // Element should begin with upper-case letter

namespace App.IntegrationTestsRef.Data.apps.dibk.nabovarsel
{
    public class SvarPaaNabovarselType
    {
        [XmlAttribute("dataFormatProvider")]
        [BindNever]
        public string dataFormatProvider { get; set; } = "SERES";

        [XmlAttribute("dataFormatId")]
        [BindNever]
        public string dataFormatId { get; set; } = "5703";

        [XmlAttribute("dataFormatVersion")]
        [BindNever]
        public string dataFormatVersion { get; set; } = "42543";

        [XmlElement("fraSluttbrukersystem")]
        public string fraSluttbrukersystem { get; set; }

        [XmlElement("eiendomByggested")]
        public EiendomListe eiendomByggested { get; set; }

        [XmlElement("samtykkeTilTiltaket")]
        public bool? samtykkeTilTiltaket { get; set; }

        [XmlElement("tiltakshaver")]
        public PartType tiltakshaver { get; set; }

        [XmlElement("nabo")]
        public NaboGjenboerType nabo { get; set; }

        [XmlElement("ansvarligSoeker")]
        public PartType ansvarligSoeker { get; set; }

        [XmlElement("signatur")]
        public SignaturType signatur { get; set; }

        [XmlElement("hovedinnsendingsnummer")]
        public string hovedinnsendingsnummer { get; set; }

        [XmlElement("prosjektnavn")]
        public string prosjektnavn { get; set; }
    }

    public class EiendomListe
    {
        [XmlElement("eiendom")]
        public List<EiendomType> eiendom { get; set; }
    }

    public class EiendomType
    {
        [XmlElement("eiendomsidentifikasjon")]
        public MatrikkelnummerType eiendomsidentifikasjon { get; set; }

        [XmlElement("adresse")]
        public EiendommensAdresseType adresse { get; set; }

        [XmlElement("bygningsnummer")]
        public string bygningsnummer { get; set; }

        [XmlElement("bolignummer")]
        public string bolignummer { get; set; }

        [XmlElement("kommunenavn")]
        public string kommunenavn { get; set; }
    }

    public class MatrikkelnummerType
    {
        [XmlElement("kommunenummer")]
        public string kommunenummer { get; set; }

        [Range(int.MinValue, int.MaxValue)]
        [XmlElement("gaardsnummer")]
        public decimal gaardsnummer { get; set; }

        [Range(int.MinValue, int.MaxValue)]
        [XmlElement("bruksnummer")]
        public decimal bruksnummer { get; set; }

        [XmlElement("festenummer")]
        public decimal? festenummer { get; set; }

        [Range(int.MinValue, int.MaxValue)]
        [XmlElement("seksjonsnummer")]
        public decimal? seksjonsnummer { get; set; }
    }

    public class EiendommensAdresseType
    {
        [XmlElement("adresselinje1")]
        public string adresselinje1 { get; set; }

        [XmlElement("adresselinje2")]
        public string adresselinje2 { get; set; }

        [XmlElement("adresselinje3")]
        public string adresselinje3 { get; set; }

        [XmlElement("postnr")]
        public string postnr { get; set; }

        [XmlElement("poststed")]
        public string poststed { get; set; }

        [XmlElement("landkode")]
        public string landkode { get; set; }

        [XmlElement("gatenavn")]
        public string gatenavn { get; set; }

        [XmlElement("husnr")]
        public string husnr { get; set; }

        [XmlElement("bokstav")]
        public string bokstav { get; set; }
    }

    public class PartType
    {
        [XmlElement("partstype")]
        public KodeType partstype { get; set; }

        [XmlElement("foedselsnummer")]
        public string foedselsnummer { get; set; }

        [XmlElement("organisasjonsnummer")]
        public string organisasjonsnummer { get; set; }

        [XmlElement("navn")]
        public string navn { get; set; }

        [XmlElement("adresse")]
        public EnkelAdresseType adresse { get; set; }

        [XmlElement("telefonnummer")]
        public string telefonnummer { get; set; }

        [XmlElement("mobilnummer")]
        public string mobilnummer { get; set; }

        [XmlElement("epost")]
        public string epost { get; set; }
    }

    public class KodeType
    {
        [XmlElement("kodeverdi")]
        public string kodeverdi { get; set; }

        [XmlElement("kodebeskrivelse")]
        public string kodebeskrivelse { get; set; }
    }

    public class EnkelAdresseType
    {
        [XmlElement("adresselinje1")]
        public string adresselinje1 { get; set; }

        [XmlElement("adresselinje2")]
        public string adresselinje2 { get; set; }

        [XmlElement("adresselinje3")]
        public string adresselinje3 { get; set; }

        [XmlElement("postnr")]
        public string postnr { get; set; }

        [XmlElement("poststed")]
        public string poststed { get; set; }

        [XmlElement("landkode")]
        public string landkode { get; set; }
    }

    public class NaboGjenboerType
    {
        [XmlElement("partstype")]
        public KodeType partstype { get; set; }

        [XmlElement("foedselsnummer")]
        public string foedselsnummer { get; set; }

        [XmlElement("organisasjonsnummer")]
        public string organisasjonsnummer { get; set; }

        [XmlElement("navn")]
        public string navn { get; set; }

        [XmlElement("adresse")]
        public EnkelAdresseType adresse { get; set; }

        [XmlElement("telefonnummer")]
        public string telefonnummer { get; set; }

        [XmlElement("mobilnummer")]
        public string mobilnummer { get; set; }

        [XmlElement("epost")]
        public string epost { get; set; }

        [XmlElement("gjelderNaboeiendom")]
        public EiendomType gjelderNaboeiendom { get; set; }

        [XmlElement("epostSendt")]
        public DateTime? epostSendt { get; set; }

        [XmlElement("harPersonligMottattVarsel")]
        public bool harPersonligMottattVarsel { get; set; }

        [XmlElement("PersonligMottattVarsel")]
        public DateTime? PersonligMottattVarsel { get; set; }

        [XmlElement("harPersonligSamtykkeTilTiltaket")]
        public bool harPersonligSamtykkeTilTiltaket { get; set; }

        [XmlElement("PersonligSamtykkeTilTiltaket")]
        public DateTime? PersonligSamtykkeTilTiltaket { get; set; }

        [XmlElement("kommentarTilTiltaket")]
        public string kommentarTilTiltaket { get; set; }

        [XmlElement("sluttbrukersystemVaarReferanse")]
        public string sluttbrukersystemVaarReferanse { get; set; }
    }

    public class SignaturType
    {
        [XmlElement("signaturdato")]
        public DateTime signaturdato { get; set; }

        [XmlElement("signertAv")]
        public string signertAv { get; set; }

        [XmlElement("signertPaaVegneAv")]
        public string signertPaaVegneAv { get; set; }

        [XmlElement("signeringssteg")]
        public string signeringssteg { get; set; }
    }
}
#pragma warning restore SA1300 // Element should begin with upper-case letter
