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
  public class SoknadUnntakKaranteneHotellVelferd
  {
    [XmlElement("soker", Order = 1)]
    [JsonProperty("soker")]
    [JsonPropertyName("soker")]
    public Soker soker { get; set; }

    [XmlElement("personopplysninger", Order = 2)]
    [JsonProperty("personopplysninger")]
    [JsonPropertyName("personopplysninger")]
    public Personopplysninger personopplysninger { get; set; }

    [XmlElement("fullmaktsperson", Order = 3)]
    [JsonProperty("fullmaktsperson")]
    [JsonPropertyName("fullmaktsperson")]
    public Fullmaktsperson fullmaktsperson { get; set; }

    [XmlElement("omReisen", Order = 4)]
    [JsonProperty("omReisen")]
    [JsonPropertyName("omReisen")]
    public OmReisenTilNorge omReisen { get; set; }

    [XmlElement("velferdsgrunner", Order = 5)]
    [JsonProperty("velferdsgrunner")]
    [JsonPropertyName("velferdsgrunner")]
    public Velferdsgrunner velferdsgrunner { get; set; }

    [XmlElement("applogic", Order = 6)]
    [JsonProperty("applogic")]
    [JsonPropertyName("applogic")]
    public Applogic applogic { get; set; }

  }

  public class Soker
  {
    [XmlElement("hvemSokesDetFor", Order = 1)]
    [JsonProperty("hvemSokesDetFor")]
    [JsonPropertyName("hvemSokesDetFor")]
    public string hvemSokesDetFor { get; set; }

  }

  public class Personopplysninger
  {
    [MinLength(1)]
    [MaxLength(175)]
    [XmlElement("fornavn", Order = 1)]
    [JsonProperty("fornavn")]
    [JsonPropertyName("fornavn")]
    public string fornavn { get; set; }

    [MinLength(1)]
    [MaxLength(175)]
    [XmlElement("mellomnavn", Order = 2)]
    [JsonProperty("mellomnavn")]
    [JsonPropertyName("mellomnavn")]
    public string mellomnavn { get; set; }

    [MinLength(1)]
    [MaxLength(175)]
    [XmlElement("etternavn", Order = 3)]
    [JsonProperty("etternavn")]
    [JsonPropertyName("etternavn")]
    public string etternavn { get; set; }

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("fodselsdato", Order = 4)]
    [JsonProperty("fodselsdato")]
    [JsonPropertyName("fodselsdato")]
    public string fodselsdato { get; set; }

    [RegularExpression(@"[0-9]{11}")]
    [XmlElement("personnummer", Order = 5)]
    [JsonProperty("personnummer")]
    [JsonPropertyName("personnummer")]
    public string personnummer { get; set; }

    [MinLength(1)]
    [MaxLength(15)]
    [XmlElement("nummerPaaReisedokument", Order = 6)]
    [JsonProperty("nummerPaaReisedokument")]
    [JsonPropertyName("nummerPaaReisedokument")]
    public string nummerPaaReisedokument { get; set; }

    [XmlElement("Adresse", Order = 7)]
    [JsonProperty("Adresse")]
    [JsonPropertyName("Adresse")]
    public string Adresse { get; set; }

    [XmlElement("Postnummer", Order = 8)]
    [JsonProperty("Postnummer")]
    [JsonPropertyName("Postnummer")]
    public string Postnummer { get; set; }

    [XmlElement("Poststed", Order = 9)]
    [JsonProperty("Poststed")]
    [JsonPropertyName("Poststed")]
    public string Poststed { get; set; }

    [XmlElement("Land", Order = 10)]
    [JsonProperty("Land")]
    [JsonPropertyName("Land")]
    public string Land { get; set; }

    [MinLength(1)]
    [MaxLength(25)]
    [RegularExpression(@"^(\+|00)\d{4,}$")]
    [XmlElement("telefonnummer", Order = 11)]
    [JsonProperty("telefonnummer")]
    [JsonPropertyName("telefonnummer")]
    public string telefonnummer { get; set; }

    [MinLength(1)]
    [MaxLength(175)]
    [RegularExpression(@"[^@]+@[^\.]+\..+")]
    [XmlElement("epost", Order = 12)]
    [JsonProperty("epost")]
    [JsonPropertyName("epost")]
    public string epost { get; set; }

  }

  public class Fullmaktsperson
  {
    [MinLength(1)]
    [MaxLength(175)]
    [XmlElement("fornavn", Order = 1)]
    [JsonProperty("fornavn")]
    [JsonPropertyName("fornavn")]
    public string fornavn { get; set; }

    [MinLength(1)]
    [MaxLength(175)]
    [XmlElement("mellomnavn", Order = 2)]
    [JsonProperty("mellomnavn")]
    [JsonPropertyName("mellomnavn")]
    public string mellomnavn { get; set; }

    [MinLength(1)]
    [MaxLength(175)]
    [XmlElement("etternavn", Order = 3)]
    [JsonProperty("etternavn")]
    [JsonPropertyName("etternavn")]
    public string etternavn { get; set; }

    [RegularExpression(@"[0-9]{11}")]
    [XmlElement("personnummer", Order = 4)]
    [JsonProperty("personnummer")]
    [JsonPropertyName("personnummer")]
    public string personnummer { get; set; }

    [XmlElement("Adresse", Order = 5)]
    [JsonProperty("Adresse")]
    [JsonPropertyName("Adresse")]
    public string Adresse { get; set; }

    [XmlElement("Postnummer", Order = 6)]
    [JsonProperty("Postnummer")]
    [JsonPropertyName("Postnummer")]
    public string Postnummer { get; set; }

    [XmlElement("Poststed", Order = 7)]
    [JsonProperty("Poststed")]
    [JsonPropertyName("Poststed")]
    public string Poststed { get; set; }

    [XmlElement("Land", Order = 8)]
    [JsonProperty("Land")]
    [JsonPropertyName("Land")]
    public string Land { get; set; }

    [MinLength(1)]
    [MaxLength(25)]
    [RegularExpression(@"^(\+|00)\d{4,}$")]
    [XmlElement("telefonnummer", Order = 9)]
    [JsonProperty("telefonnummer")]
    [JsonPropertyName("telefonnummer")]
    public string telefonnummer { get; set; }

    [MinLength(1)]
    [MaxLength(175)]
    [RegularExpression(@"[^@]+@[^\.]+\..+")]
    [XmlElement("epost", Order = 10)]
    [JsonProperty("epost")]
    [JsonPropertyName("epost")]
    public string epost { get; set; }

  }

  public class OmReisenTilNorge
  {
    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("ankomstdato", Order = 1)]
    [JsonProperty("ankomstdato")]
    [JsonPropertyName("ankomstdato")]
    public string ankomstdato { get; set; }

    [XmlElement("landOppholdtI", Order = 2)]
    [JsonProperty("landOppholdtI")]
    [JsonPropertyName("landOppholdtI")]
    public string landOppholdtI { get; set; }

    [XmlElement("antallIReisefolget", Order = 3)]
    [JsonProperty("antallIReisefolget")]
    [JsonPropertyName("antallIReisefolget")]
    public string antallIReisefolget { get; set; }

  }

  public class Velferdsgrunner
  {
    [XmlElement("sammenstilling", Order = 1)]
    [JsonProperty("sammenstilling")]
    [JsonPropertyName("sammenstilling")]
    public string sammenstilling { get; set; }

    [XmlElement("helseproblemer", Order = 2)]
    [JsonProperty("helseproblemer")]
    [JsonPropertyName("helseproblemer")]
    [Required]
    public bool? helseproblemer { get; set; }

    [XmlElement("barnefodsel", Order = 3)]
    [JsonProperty("barnefodsel")]
    [JsonPropertyName("barnefodsel")]
    [Required]
    public bool? barnefodsel { get; set; }

    [XmlElement("begravelse", Order = 4)]
    [JsonProperty("begravelse")]
    [JsonPropertyName("begravelse")]
    [Required]
    public bool? begravelse { get; set; }

    [XmlElement("naerstaaende", Order = 5)]
    [JsonProperty("naerstaaende")]
    [JsonPropertyName("naerstaaende")]
    [Required]
    public bool? naerstaaende { get; set; }

    [XmlElement("adopsjon", Order = 6)]
    [JsonProperty("adopsjon")]
    [JsonPropertyName("adopsjon")]
    [Required]
    public bool? adopsjon { get; set; }

    [XmlElement("sarligeOmsorg", Order = 7)]
    [JsonProperty("sarligeOmsorg")]
    [JsonPropertyName("sarligeOmsorg")]
    [Required]
    public bool? sarligeOmsorg { get; set; }

    [XmlElement("barnAlene", Order = 8)]
    [JsonProperty("barnAlene")]
    [JsonPropertyName("barnAlene")]
    [Required]
    public bool? barnAlene { get; set; }

    [XmlElement("hjemmeeksamen", Order = 9)]
    [JsonProperty("hjemmeeksamen")]
    [JsonPropertyName("hjemmeeksamen")]
    [Required]
    public bool? hjemmeeksamen { get; set; }

    [XmlElement("arbeidunntak", Order = 10)]
    [JsonProperty("arbeidunntak")]
    [JsonPropertyName("arbeidunntak")]
    [Required]
    public bool? arbeidunntak { get; set; }

    [XmlElement("andreVelferdshensyn", Order = 11)]
    [JsonProperty("andreVelferdshensyn")]
    [JsonPropertyName("andreVelferdshensyn")]
    [Required]
    public bool? andreVelferdshensyn { get; set; }

    [XmlElement("andreVelferdshensynBeskrivelse", Order = 12)]
    [JsonProperty("andreVelferdshensynBeskrivelse")]
    [JsonPropertyName("andreVelferdshensynBeskrivelse")]
    public string andreVelferdshensynBeskrivelse { get; set; }

  }

  public class Applogic
  {
    [XmlElement("ikkeForsteAvkrysning", Order = 1)]
    [JsonProperty("ikkeForsteAvkrysning")]
    [JsonPropertyName("ikkeForsteAvkrysning")]
    [Required]
    public bool? ikkeForsteAvkrysning { get; set; }

    [XmlElement("avsender", Order = 2)]
    [JsonProperty("avsender")]
    [JsonPropertyName("avsender")]
    public string avsender { get; set; }

    [XmlElement("altinnRef", Order = 3)]
    [JsonProperty("altinnRef")]
    [JsonPropertyName("altinnRef")]
    public string altinnRef { get; set; }

  }
}
