using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Threading.Tasks;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;

namespace App.IntegrationTests.Mocks.Apps.Ttd.Externalprefil
{
#pragma warning disable SA1300 // Element should begin with upper-case letter
#pragma warning disable SA1649 // File name should match first type name

    [XmlRoot(ElementName = "melding")]
    public class ReelleRettighetshavere_M
    {
        [XmlAttribute("dataFormatProvider")]
        [BindNever]
        public string dataFormatProvider { get; set; } = "SERES";

        [XmlAttribute("dataFormatId")]
        [BindNever]
        public string dataFormatId { get; set; } = "6900";

        [XmlAttribute("dataFormatVersion")]
        [BindNever]
        public string dataFormatVersion { get; set; } = "46449";

        [XmlElement("Skjemainnhold")]
        [JsonProperty("Skjemainnhold")]
        [JsonPropertyName("Skjemainnhold")]
        public Skjemainnhold Skjemainnhold { get; set; }
    }

    public class Skjemainnhold
    {
        [XmlElement("metadata")]
        [JsonProperty("metadata")]
        [JsonPropertyName("metadata")]
        public Metadata metadata { get; set; }

        [XmlElement("reelleRettigheter")]
        [JsonProperty("reelleRettigheter")]
        [JsonPropertyName("reelleRettigheter")]
        public ReelleRettigheter reelleRettigheter { get; set; }
    }

    public class Metadata
    {
        [XmlElement("tjeneste")]
        [JsonProperty("tjeneste")]
        [JsonPropertyName("tjeneste")]
        public string tjeneste { get; set; }

        [XmlElement("tjenestehandling")]
        [JsonProperty("tjenestehandling")]
        [JsonPropertyName("tjenestehandling")]
        public string tjenestehandling { get; set; }
    }

    public class ReelleRettigheter
    {
        [XmlElement("rettighetId")]
        [JsonProperty("rettighetId")]
        [JsonPropertyName("rettighetId")]
        public string rettighetId { get; set; }

        [XmlElement("rettighetDataId")]
        [JsonProperty("rettighetDataId")]
        [JsonPropertyName("rettighetDataId")]
        public string rettighetDataId { get; set; }

        [XmlElement("endretDato")]
        [JsonProperty("endretDato")]
        [JsonPropertyName("endretDato")]
        public string endretDato { get; set; }

        [XmlElement("status")]
        [JsonProperty("status")]
        [JsonPropertyName("status")]
        public string status { get; set; }

        [XmlElement("registreringspliktig")]
        [JsonProperty("registreringspliktig")]
        [JsonPropertyName("registreringspliktig")]
        public Registreringspliktig registreringspliktig { get; set; }

        [XmlElement("harIkkeReelleRettighetshavere")]
        [JsonProperty("harIkkeReelleRettighetshavere")]
        [JsonPropertyName("harIkkeReelleRettighetshavere")]
        public bool? harIkkeReelleRettighetshavere { get; set; }

        [XmlElement("kanIkkeIdentifisereReelleRettighetshavere")]
        [JsonProperty("kanIkkeIdentifisereReelleRettighetshavere")]
        [JsonPropertyName("kanIkkeIdentifisereReelleRettighetshavere")]
        public bool? kanIkkeIdentifisereReelleRettighetshavere { get; set; }

        [XmlElement("kanIkkeIdentifisereFlereReelleRettighetshavere")]
        [JsonProperty("kanIkkeIdentifisereFlereReelleRettighetshavere")]
        [JsonPropertyName("kanIkkeIdentifisereFlereReelleRettighetshavere")]
        public bool? kanIkkeIdentifisereFlereReelleRettighetshavere { get; set; }

        [XmlElement("reellRettighetshaver")]
        [JsonProperty("reellRettighetshaver")]
        [JsonPropertyName("reellRettighetshaver")]
        public List<ReellRettighetshaver> reellRettighetshaver { get; set; }

        [XmlElement("rolleinnehavere")]
        [JsonProperty("rolleinnehavere")]
        [JsonPropertyName("rolleinnehavere")]

        public Rolleinnehavere rolleinnehavere { get; set; }
    }

    public class Registreringspliktig
    {
        [XmlElement("organisasjonsnummer")]
        [JsonProperty("organisasjonsnummer")]
        [JsonPropertyName("organisasjonsnummer")]
        public string organisasjonsnummer { get; set; }

        [XmlElement("navn")]
        [JsonProperty("navn")]
        [JsonPropertyName("navn")]
        public string navn { get; set; }

        [XmlElement("organisasjonsform")]
        [JsonProperty("organisasjonsform")]
        [JsonPropertyName("organisasjonsform")]
        public string organisasjonsform { get; set; }
    }

    public class ReellRettighetshaver
    {
        [XmlElement("rettighetshaver")]
        [JsonProperty("rettighetshaver")]
        [JsonPropertyName("rettighetshaver")]
        public Rettighetshaver rettighetshaver { get; set; }

        [XmlElement("posisjon")]
        [JsonProperty("posisjon")]
        [JsonPropertyName("posisjon")]
        public List<Posisjon> posisjon { get; set; }
    }

    public class Rettighetshaver
    {
        [XmlElement("person")]
        [JsonProperty("person")]
        [JsonPropertyName("person")]
        public Person person { get; set; }

        [XmlElement("utenlandskPerson")]
        [JsonProperty("utenlandskPerson")]
        [JsonPropertyName("utenlandskPerson")]
        public UtenlandskPerson utenlandskPerson { get; set; }
    }

    public class Person
    {
        [XmlElement("fodselsnummer")]
        [JsonProperty("fodselsnummer")]
        [JsonPropertyName("fodselsnummer")]
        public string fodselsnummer { get; set; }

        [XmlElement("navn")]
        [JsonProperty("navn")]
        [JsonPropertyName("navn")]
        public string navn { get; set; }

        [XmlElement("statsborgerskap")]
        [JsonProperty("statsborgerskap")]
        [JsonPropertyName("statsborgerskap")]
        public List<Landkode> statsborgerskap { get; set; }

        [XmlElement("bostedsland")]
        [JsonProperty("bostedsland")]
        [JsonPropertyName("bostedsland")]
        public string bostedsland { get; set; }
    }

    public class Landkode
    {
    }

    public class UtenlandskPerson
    {
        [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1,2][0-9]|3[0,1])$")]
        [XmlElement("fodselsdato")]
        [JsonProperty("fodselsdato")]
        [JsonPropertyName("fodselsdato")]
        public string fodselsdato { get; set; }

        [XmlElement("navn")]
        [JsonProperty("navn")]
        [JsonPropertyName("navn")]
        public string navn { get; set; }

        [XmlElement("statsborgerskap")]
        [JsonProperty("statsborgerskap")]
        [JsonPropertyName("statsborgerskap")]
        public List<Landkode> statsborgerskap { get; set; }

        [XmlElement("bostedsland")]
        [JsonProperty("bostedsland")]
        [JsonPropertyName("bostedsland")]
        public string bostedsland { get; set; }
    }

    public class Posisjon
    {
        [XmlElement("posisjonType")]
        [JsonProperty("posisjonType")]
        [JsonPropertyName("posisjonType")]
        public string posisjonType { get; set; }

        [XmlElement("storrelseIntervall")]
        [JsonProperty("storrelseIntervall")]
        [JsonPropertyName("storrelseIntervall")]
        public string storrelseIntervall { get; set; }

        [XmlElement("beskrivelseAnnenMate")]
        [JsonProperty("beskrivelseAnnenMate")]
        [JsonPropertyName("beskrivelseAnnenMate")]
        public string beskrivelseAnnenMate { get; set; }

        [XmlElement("grunnlag")]
        [JsonProperty("grunnlag")]
        [JsonPropertyName("grunnlag")]
        public List<Grunnlag> grunnlag { get; set; }
    }

    public class Grunnlag
    {
        [XmlElement("grunnlagType")]
        [JsonProperty("grunnlagType")]
        [JsonPropertyName("grunnlagType")]
        public string grunnlagType { get; set; }

        [XmlElement("beskrivelseAnnenMate")]
        [JsonProperty("beskrivelseAnnenMate")]
        [JsonPropertyName("beskrivelseAnnenMate")]
        public string beskrivelseAnnenMate { get; set; }
    }

    public class Rolleinnehavere
    {
        [XmlElement("rolleinnehaver")]
        [JsonProperty("rolleinnehaver")]
        [JsonPropertyName("rolleinnehaver")]
        public List<Rolleinnehaver> rolleinnehaver { get; set; }
    }

    public class Rolleinnehaver
    {
        [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1,2][0-9]|3[0,1])$")]
        [XmlElement("fodselsdato")]
        [JsonProperty("fodselsdato")]
        [JsonPropertyName("fodselsdato")]
        public string fodselsdato { get; set; }

        [XmlElement("navn")]
        [JsonProperty("navn")]
        [JsonPropertyName("navn")]
        public string navn { get; set; }

        [XmlElement("rolle")]
        [JsonProperty("rolle")]
        [JsonPropertyName("rolle")]
        public string rolle { get; set; }

        [XmlElement("statsborgerskap")]
        [JsonProperty("statsborgerskap")]
        [JsonPropertyName("statsborgerskap")]
        public List<Tekst> statsborgerskap { get; set; }
    }

    public class Tekst
    {
    }
#pragma warning restore SA1300 // Element should begin with upper-case letter
#pragma warning restore SA1649 // File name should match first type name
}
