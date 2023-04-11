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
  [XmlRoot(ElementName="melding")]
  public class KRT1226Gjenopprettingsplaner_M
  {
    [XmlAttribute("dataFormatProvider")]
    [BindNever]
    public string dataFormatProvider {get; set; } = "SERES";

    [XmlAttribute("dataFormatId")]
    [BindNever]
    public string dataFormatId {get; set; } = "6946";

    [XmlAttribute("dataFormatVersion")]
    [BindNever]
    public string dataFormatVersion {get; set; } = "46317";

    [XmlElement("rapport", Order = 1)]
    [JsonProperty("rapport")]
    [JsonPropertyName("rapport")]
    public rapport rapport { get; set; }

  }

  public class rapport
  {
    [XmlElement("innsender", Order = 1)]
    [JsonProperty("innsender")]
    [JsonPropertyName("innsender")]
    public Innsender innsender { get; set; }

    [XmlElement("rapportering", Order = 2)]
    [JsonProperty("rapportering")]
    [JsonPropertyName("rapportering")]
    public Rapportering rapportering { get; set; }

  }

  public class Innsender
  {
    [XmlElement("adresse", Order = 1)]
    [JsonProperty("adresse")]
    [JsonPropertyName("adresse")]
    public Adresse adresse { get; set; }

    [XmlElement("foretak", Order = 2)]
    [JsonProperty("foretak")]
    [JsonPropertyName("foretak")]
    public Foretak foretak { get; set; }

    [XmlElement("maalform", Order = 3)]
    [JsonProperty("maalform")]
    [JsonPropertyName("maalform")]
    public Maalform maalform { get; set; }

  }

  public class Adresse
  {
    [XmlElement("postnummer", Order = 1)]
    [JsonProperty("postnummer")]
    [JsonPropertyName("postnummer")]
    public Postnummer postnummer { get; set; }

    [XmlElement("adresselinje1", Order = 2)]
    [JsonProperty("adresselinje1")]
    [JsonPropertyName("adresselinje1")]
    public Adresselinje1 adresselinje1 { get; set; }

    [XmlElement("poststed", Order = 3)]
    [JsonProperty("poststed")]
    [JsonPropertyName("poststed")]
    public Poststed poststed { get; set; }

  }

  public class Postnummer
  {
    [MaxLength(4)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Postnummer/660288";

  }

  public class Adresselinje1
  {
    [MaxLength(175)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Adresselinje1/660286";

  }

  public class Poststed
  {
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Poststed/660287";

  }

  public class Foretak
  {
    [XmlElement("organisasjonsnummer", Order = 1)]
    [JsonProperty("organisasjonsnummer")]
    [JsonPropertyName("organisasjonsnummer")]
    public Organisasjonsnummer organisasjonsnummer { get; set; }

    [XmlElement("navn", Order = 2)]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    public Foretaksnavn navn { get; set; }

  }

  public class Organisasjonsnummer
  {
    [MinLength(9)]
    [MaxLength(9)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Organisasjonsnummer/472763";

  }

  public class Foretaksnavn
  {
    [MaxLength(255)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Foretaksnavn/639250";

  }

  public class Maalform
  {
    [Range(Double.MinValue,Double.MaxValue)]
    [XmlText()]
    [Required]
    public decimal value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Målform/660674";

  }

  public class Rapportering
  {
    [XmlElement("arkiv", Order = 1)]
    [JsonProperty("arkiv")]
    [JsonPropertyName("arkiv")]
    public Arkiv arkiv { get; set; }

    [XmlElement("kontaktperson1", Order = 2)]
    [JsonProperty("kontaktperson1")]
    [JsonPropertyName("kontaktperson1")]
    public Kontaktperson1 kontaktperson1 { get; set; }

    [XmlElement("kontaktperson2", Order = 3)]
    [JsonProperty("kontaktperson2")]
    [JsonPropertyName("kontaktperson2")]
    public Kontaktperson2 kontaktperson2 { get; set; }

    [XmlElement("periode", Order = 4)]
    [JsonProperty("periode")]
    [JsonPropertyName("periode")]
    public Periode periode { get; set; }

    [XmlElement("rapporteringsregisteret", Order = 5)]
    [JsonProperty("rapporteringsregisteret")]
    [JsonPropertyName("rapporteringsregisteret")]
    public Rapporteringsregisteret rapporteringsregisteret { get; set; }

    [XmlElement("sporvalgrappreg", Order = 6)]
    [JsonProperty("sporvalgrappreg")]
    [JsonPropertyName("sporvalgrappreg")]
    public Tekst_60_S1 sporvalgrappreg { get; set; }

    [XmlElement("hjelpefelt", Order = 7)]
    [JsonProperty("hjelpefelt")]
    [JsonPropertyName("hjelpefelt")]
    public Tekst_120_S01 hjelpefelt { get; set; }

    [XmlElement("avdeling", Order = 8)]
    [JsonProperty("avdeling")]
    [JsonPropertyName("avdeling")]
    public Avdeling avdeling { get; set; }

    [XmlElement("beskrivelse", Order = 9)]
    [JsonProperty("beskrivelse")]
    [JsonPropertyName("beskrivelse")]
    public Tekst_255_S10 beskrivelse { get; set; }

    [XmlElement("periodeaarstall", Order = 10)]
    [JsonProperty("periodeaarstall")]
    [JsonPropertyName("periodeaarstall")]
    public AAr_S01 periodeaarstall { get; set; }

  }

  public class Arkiv
  {
    [XmlElement("arkivkode", Order = 1)]
    [JsonProperty("arkivkode")]
    [JsonPropertyName("arkivkode")]
    public Arkivkode arkivkode { get; set; }

  }

  public class Arkivkode
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Arkivkode/660676";

  }

  public class Kontaktperson1
  {
    [XmlElement("epost", Order = 1)]
    [JsonProperty("epost")]
    [JsonPropertyName("epost")]
    public Epost_S01 epost { get; set; }

    [XmlElement("navn", Order = 2)]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    public Navn_S01 navn { get; set; }

    [XmlElement("telefonnummer", Order = 3)]
    [JsonProperty("telefonnummer")]
    [JsonPropertyName("telefonnummer")]
    public TelefonNummer_S01 telefonnummer { get; set; }

    [XmlElement("telefonprefiks", Order = 4)]
    [JsonProperty("telefonprefiks")]
    [JsonPropertyName("telefonprefiks")]
    public TelefonPrefiks_S01 telefonprefiks { get; set; }

  }

  public class Epost_S01
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Epost_S01/637664";

  }

  public class Navn_S01
  {
    [MaxLength(255)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Navn_S01/637662";

  }

  public class TelefonNummer_S01
  {
    [MaxLength(20)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/TelefonNummer_S01/637660";

  }

  public class TelefonPrefiks_S01
  {
    [MaxLength(4)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/TelefonPrefiks_S01/637658";

  }

  public class Kontaktperson2
  {
    [XmlElement("epost", Order = 1)]
    [JsonProperty("epost")]
    [JsonPropertyName("epost")]
    public Epost_S02 epost { get; set; }

    [XmlElement("navn", Order = 2)]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    public Navn_S02 navn { get; set; }

    [XmlElement("telefonnummer", Order = 3)]
    [JsonProperty("telefonnummer")]
    [JsonPropertyName("telefonnummer")]
    public TelefonNummer_S02 telefonnummer { get; set; }

    [XmlElement("telefonprefiks", Order = 4)]
    [JsonProperty("telefonprefiks")]
    [JsonPropertyName("telefonprefiks")]
    public TelefonPrefiks_S02 telefonprefiks { get; set; }

  }

  public class Epost_S02
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Epost_S02/637663";

  }

  public class Navn_S02
  {
    [MaxLength(255)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Navn_S02/637661";

  }

  public class TelefonNummer_S02
  {
    [MaxLength(20)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/TelefonNummer_S02/637659";

  }

  public class TelefonPrefiks_S02
  {
    [MaxLength(4)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/TelefonPrefiks_S02/637657";

  }

  public class Periode
  {
    [XmlElement("aar", Order = 1)]
    [JsonProperty("aar")]
    [JsonPropertyName("aar")]
    public AAr aar { get; set; }

    [XmlElement("periodetype", Order = 2)]
    [JsonProperty("periodetype")]
    [JsonPropertyName("periodetype")]
    public Periodetype periodetype { get; set; }

  }

  public class AAr
  {
    [RegularExpression(@"^[0-9]{4}$")]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/År/660276";

  }

  public class Periodetype
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Periodetype/660275";

  }

  public class Rapporteringsregisteret
  {
    [XmlElement("rapporteringsid", Order = 1)]
    [JsonProperty("rapporteringsid")]
    [JsonPropertyName("rapporteringsid")]
    public Rapporteringsid rapporteringsid { get; set; }

  }

  public class Rapporteringsid
  {
    [MaxLength(50)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/RapporteringsId/636854";

  }

  public class Tekst_60_S1
  {
    [MinLength(1)]
    [MaxLength(60)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Tekst_60_S1/488638";

  }

  public class Tekst_120_S01
  {
    [MaxLength(120)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Tekst_120_S01/619866";

  }

  public class Avdeling
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Avdeling/664243";

  }

  public class Tekst_255_S10
  {
    [MinLength(1)]
    [MaxLength(255)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Tekst_255_S10/600714";

  }

  public class AAr_S01
  {
    [RegularExpression(@"^[0-9]{4}$")]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid {get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/År_S01/602291";

  }
}
