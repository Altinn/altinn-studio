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
  public class KRT1226Gjenopprettingsplaner_M
  {
    [XmlAttribute("dataFormatProvider")]
    [BindNever]
    public string dataFormatProvider { get; set; } = "SERES";

    [XmlAttribute("dataFormatId")]
    [BindNever]
    public string dataFormatId { get; set; } = "6946";

    [XmlAttribute("dataFormatVersion")]
    [BindNever]
    public string dataFormatVersion { get; set; } = "46317";

    [XmlElement("rapport", Order = 1)]
    [JsonProperty("rapport")]
    [JsonPropertyName("rapport")]
    public rapport rapport { get; set; }

  }

  public class rapport
  {
    [XmlElement("innsender", Order = 1, IsNullable = true)]
    [JsonProperty("innsender")]
    [JsonPropertyName("innsender")]
    public Innsender innsender { get; set; }

    [XmlElement("rapportering", Order = 2, IsNullable = true)]
    [JsonProperty("rapportering")]
    [JsonPropertyName("rapportering")]
    public Rapportering rapportering { get; set; }

  }

  public class Innsender
  {
    [XmlElement("adresse", Order = 1, IsNullable = true)]
    [JsonProperty("adresse")]
    [JsonPropertyName("adresse")]
    public Adresse adresse { get; set; }

    [XmlElement("foretak", Order = 2, IsNullable = true)]
    [JsonProperty("foretak")]
    [JsonPropertyName("foretak")]
    public Foretak foretak { get; set; }

    [XmlElement("maalform", Order = 3, IsNullable = true)]
    [JsonProperty("maalform")]
    [JsonPropertyName("maalform")]
    public Maalform maalform { get; set; }

    public bool ShouldSerializemaalform() => maalform?.valueNullable is not null;

  }

  public class Adresse
  {
    [XmlElement("postnummer", Order = 1, IsNullable = true)]
    [JsonProperty("postnummer")]
    [JsonPropertyName("postnummer")]
    public Postnummer postnummer { get; set; }

    public bool ShouldSerializepostnummer() => postnummer?.value is not null;

    [XmlElement("adresselinje1", Order = 2, IsNullable = true)]
    [JsonProperty("adresselinje1")]
    [JsonPropertyName("adresselinje1")]
    public Adresselinje1 adresselinje1 { get; set; }

    public bool ShouldSerializeadresselinje1() => adresselinje1?.value is not null;

    [XmlElement("poststed", Order = 3, IsNullable = true)]
    [JsonProperty("poststed")]
    [JsonPropertyName("poststed")]
    public Poststed poststed { get; set; }

    public bool ShouldSerializepoststed() => poststed?.value is not null;

  }

  public class Postnummer
  {
    [MaxLength(4)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Postnummer/660288";

  }

  public class Adresselinje1
  {
    [MaxLength(175)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Adresselinje1/660286";

  }

  public class Poststed
  {
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Poststed/660287";

  }

  public class Foretak
  {
    [XmlElement("organisasjonsnummer", Order = 1, IsNullable = true)]
    [JsonProperty("organisasjonsnummer")]
    [JsonPropertyName("organisasjonsnummer")]
    public Organisasjonsnummer organisasjonsnummer { get; set; }

    public bool ShouldSerializeorganisasjonsnummer() => organisasjonsnummer?.value is not null;

    [XmlElement("navn", Order = 2, IsNullable = true)]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    public Foretaksnavn navn { get; set; }

    public bool ShouldSerializenavn() => navn?.value is not null;

  }

  public class Organisasjonsnummer
  {
    [MinLength(9)]
    [MaxLength(9)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Organisasjonsnummer/472763";

  }

  public class Foretaksnavn
  {
    [MaxLength(255)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Foretaksnavn/639250";

  }

  public class Maalform
  {
    [Range(Double.MinValue,Double.MaxValue)]
    [Required]
    [XmlIgnore]
    [JsonPropertyName("value")]
    [JsonProperty(PropertyName = "value")]
    public decimal? valueNullable { get; set; }

    [XmlText]
    [System.Text.Json.Serialization.JsonIgnore]
    [Newtonsoft.Json.JsonIgnore]
    public decimal value
    {
      get => valueNullable ?? default;
      set
      {
        this.valueNullable = value;
      }
    }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Målform/660674";

  }

  public class Rapportering
  {
    [XmlElement("arkiv", Order = 1, IsNullable = true)]
    [JsonProperty("arkiv")]
    [JsonPropertyName("arkiv")]
    public Arkiv arkiv { get; set; }

    [XmlElement("kontaktperson1", Order = 2, IsNullable = true)]
    [JsonProperty("kontaktperson1")]
    [JsonPropertyName("kontaktperson1")]
    public Kontaktperson1 kontaktperson1 { get; set; }

    [XmlElement("kontaktperson2", Order = 3, IsNullable = true)]
    [JsonProperty("kontaktperson2")]
    [JsonPropertyName("kontaktperson2")]
    public Kontaktperson2 kontaktperson2 { get; set; }

    [XmlElement("periode", Order = 4, IsNullable = true)]
    [JsonProperty("periode")]
    [JsonPropertyName("periode")]
    public Periode periode { get; set; }

    [XmlElement("rapporteringsregisteret", Order = 5, IsNullable = true)]
    [JsonProperty("rapporteringsregisteret")]
    [JsonPropertyName("rapporteringsregisteret")]
    public Rapporteringsregisteret rapporteringsregisteret { get; set; }

    [XmlElement("sporvalgrappreg", Order = 6, IsNullable = true)]
    [JsonProperty("sporvalgrappreg")]
    [JsonPropertyName("sporvalgrappreg")]
    public Tekst_60_S1 sporvalgrappreg { get; set; }

    public bool ShouldSerializesporvalgrappreg() => sporvalgrappreg?.value is not null;

    [XmlElement("hjelpefelt", Order = 7, IsNullable = true)]
    [JsonProperty("hjelpefelt")]
    [JsonPropertyName("hjelpefelt")]
    public Tekst_120_S01 hjelpefelt { get; set; }

    public bool ShouldSerializehjelpefelt() => hjelpefelt?.value is not null;

    [XmlElement("avdeling", Order = 8, IsNullable = true)]
    [JsonProperty("avdeling")]
    [JsonPropertyName("avdeling")]
    public Avdeling avdeling { get; set; }

    public bool ShouldSerializeavdeling() => avdeling?.value is not null;

    [XmlElement("beskrivelse", Order = 9, IsNullable = true)]
    [JsonProperty("beskrivelse")]
    [JsonPropertyName("beskrivelse")]
    public Tekst_255_S10 beskrivelse { get; set; }

    public bool ShouldSerializebeskrivelse() => beskrivelse?.value is not null;

    [XmlElement("periodeaarstall", Order = 10, IsNullable = true)]
    [JsonProperty("periodeaarstall")]
    [JsonPropertyName("periodeaarstall")]
    public AAr_S01 periodeaarstall { get; set; }

    public bool ShouldSerializeperiodeaarstall() => periodeaarstall?.value is not null;

  }

  public class Arkiv
  {
    [XmlElement("arkivkode", Order = 1, IsNullable = true)]
    [JsonProperty("arkivkode")]
    [JsonPropertyName("arkivkode")]
    public Arkivkode arkivkode { get; set; }

    public bool ShouldSerializearkivkode() => arkivkode?.value is not null;

  }

  public class Arkivkode
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Arkivkode/660676";

  }

  public class Kontaktperson1
  {
    [XmlElement("epost", Order = 1, IsNullable = true)]
    [JsonProperty("epost")]
    [JsonPropertyName("epost")]
    public Epost_S01 epost { get; set; }

    public bool ShouldSerializeepost() => epost?.value is not null;

    [XmlElement("navn", Order = 2, IsNullable = true)]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    public Navn_S01 navn { get; set; }

    public bool ShouldSerializenavn() => navn?.value is not null;

    [XmlElement("telefonnummer", Order = 3, IsNullable = true)]
    [JsonProperty("telefonnummer")]
    [JsonPropertyName("telefonnummer")]
    public TelefonNummer_S01 telefonnummer { get; set; }

    public bool ShouldSerializetelefonnummer() => telefonnummer?.value is not null;

    [XmlElement("telefonprefiks", Order = 4, IsNullable = true)]
    [JsonProperty("telefonprefiks")]
    [JsonPropertyName("telefonprefiks")]
    public TelefonPrefiks_S01 telefonprefiks { get; set; }

    public bool ShouldSerializetelefonprefiks() => telefonprefiks?.value is not null;

  }

  public class Epost_S01
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Epost_S01/637664";

  }

  public class Navn_S01
  {
    [MaxLength(255)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Navn_S01/637662";

  }

  public class TelefonNummer_S01
  {
    [MaxLength(20)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/TelefonNummer_S01/637660";

  }

  public class TelefonPrefiks_S01
  {
    [MaxLength(4)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/TelefonPrefiks_S01/637658";

  }

  public class Kontaktperson2
  {
    [XmlElement("epost", Order = 1, IsNullable = true)]
    [JsonProperty("epost")]
    [JsonPropertyName("epost")]
    public Epost_S02 epost { get; set; }

    public bool ShouldSerializeepost() => epost?.value is not null;

    [XmlElement("navn", Order = 2, IsNullable = true)]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    public Navn_S02 navn { get; set; }

    public bool ShouldSerializenavn() => navn?.value is not null;

    [XmlElement("telefonnummer", Order = 3, IsNullable = true)]
    [JsonProperty("telefonnummer")]
    [JsonPropertyName("telefonnummer")]
    public TelefonNummer_S02 telefonnummer { get; set; }

    public bool ShouldSerializetelefonnummer() => telefonnummer?.value is not null;

    [XmlElement("telefonprefiks", Order = 4, IsNullable = true)]
    [JsonProperty("telefonprefiks")]
    [JsonPropertyName("telefonprefiks")]
    public TelefonPrefiks_S02 telefonprefiks { get; set; }

    public bool ShouldSerializetelefonprefiks() => telefonprefiks?.value is not null;

  }

  public class Epost_S02
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Epost_S02/637663";

  }

  public class Navn_S02
  {
    [MaxLength(255)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Navn_S02/637661";

  }

  public class TelefonNummer_S02
  {
    [MaxLength(20)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/TelefonNummer_S02/637659";

  }

  public class TelefonPrefiks_S02
  {
    [MaxLength(4)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/TelefonPrefiks_S02/637657";

  }

  public class Periode
  {
    [XmlElement("aar", Order = 1, IsNullable = true)]
    [JsonProperty("aar")]
    [JsonPropertyName("aar")]
    public AAr aar { get; set; }

    public bool ShouldSerializeaar() => aar?.value is not null;

    [XmlElement("periodetype", Order = 2, IsNullable = true)]
    [JsonProperty("periodetype")]
    [JsonPropertyName("periodetype")]
    public Periodetype periodetype { get; set; }

    public bool ShouldSerializeperiodetype() => periodetype?.value is not null;

  }

  public class AAr
  {
    [RegularExpression(@"^[0-9]{4}$")]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/År/660276";

  }

  public class Periodetype
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Periodetype/660275";

  }

  public class Rapporteringsregisteret
  {
    [XmlElement("rapporteringsid", Order = 1, IsNullable = true)]
    [JsonProperty("rapporteringsid")]
    [JsonPropertyName("rapporteringsid")]
    public Rapporteringsid rapporteringsid { get; set; }

    public bool ShouldSerializerapporteringsid() => rapporteringsid?.value is not null;

  }

  public class Rapporteringsid
  {
    [MaxLength(50)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/RapporteringsId/636854";

  }

  public class Tekst_60_S1
  {
    [MinLength(1)]
    [MaxLength(60)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Tekst_60_S1/488638";

  }

  public class Tekst_120_S01
  {
    [MaxLength(120)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Tekst_120_S01/619866";

  }

  public class Avdeling
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Avdeling/664243";

  }

  public class Tekst_255_S10
  {
    [MinLength(1)]
    [MaxLength(255)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/Tekst_255_S10/600714";

  }

  public class AAr_S01
  {
    [RegularExpression(@"^[0-9]{4}$")]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("guid")]
    [BindNever]
    public string guid { get; set; } = "http://seres.no/guid/Finanstilsynet/Dataenkeltype/År_S01/602291";

  }
}
