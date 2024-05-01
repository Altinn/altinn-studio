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
  public class RR0010H_M
  {
    [XmlAttribute("dataFormatProvider")]
    [BindNever]
    public string dataFormatProvider { get; set; } = "SERES";

    [XmlAttribute("dataFormatId")]
    [BindNever]
    public string dataFormatId { get; set; } = "3430";

    [XmlAttribute("dataFormatVersion")]
    [BindNever]
    public string dataFormatVersion { get; set; } = "48617";

    [XmlElement("Innsender", Order = 1)]
    [JsonProperty("Innsender")]
    [JsonPropertyName("Innsender")]
    public Innsender Innsender { get; set; }

    [XmlElement("Skjemainnhold", Order = 2)]
    [JsonProperty("Skjemainnhold")]
    [JsonPropertyName("Skjemainnhold")]
    public Skjemainnhold Skjemainnhold { get; set; }

  }

  public class Innsender
  {
    [XmlElement("enhet", Order = 1)]
    [JsonProperty("enhet")]
    [JsonPropertyName("enhet")]
    public Enhet enhet { get; set; }

    [XmlElement("kontaktperson", Order = 2)]
    [JsonProperty("kontaktperson")]
    [JsonPropertyName("kontaktperson")]
    public List<Kontaktperson> kontaktperson { get; set; }

    [XmlElement("opplysningerInnsending", Order = 3)]
    [JsonProperty("opplysningerInnsending")]
    [JsonPropertyName("opplysningerInnsending")]
    public OpplysningerInnsending opplysningerInnsending { get; set; }

  }

  public class Enhet
  {
    [XmlElement("organisasjonsnummer", Order = 1)]
    [JsonProperty("organisasjonsnummer")]
    [JsonPropertyName("organisasjonsnummer")]
    public EnhetOrganisasjonsnummer18 organisasjonsnummer { get; set; }

    [XmlElement("organisasjonsform", Order = 2)]
    [JsonProperty("organisasjonsform")]
    [JsonPropertyName("organisasjonsform")]
    public EnhetOrganisasjonsform756 organisasjonsform { get; set; }

    [XmlElement("navn", Order = 3)]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    public EnhetNavn1 navn { get; set; }

  }

  public class EnhetOrganisasjonsnummer18
  {
    [MinLength(9)]
    [MaxLength(9)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18";

  }

  public class EnhetOrganisasjonsform756
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "756";

  }

  public class EnhetNavn1
  {
    [MinLength(1)]
    [MaxLength(175)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "1";

  }

  public class Kontaktperson
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId()
    {
      return AltinnRowId != default;
    }

    [XmlElement("e-post", Order = 1)]
    [JsonProperty("e-post")]
    [JsonPropertyName("e-post")]
    public KontaktpersonEPost19022 epost { get; set; }

  }

  public class KontaktpersonEPost19022
  {
    [MinLength(1)]
    [MaxLength(70)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "19022";

  }

  public class OpplysningerInnsending
  {
    [XmlElement("fraSluttbrukersystem", Order = 1)]
    [JsonProperty("fraSluttbrukersystem")]
    [JsonPropertyName("fraSluttbrukersystem")]
    public ArsregnskapSysteminnsending35139 fraSluttbrukersystem { get; set; }

    [XmlElement("landTilLand", Order = 2)]
    [JsonProperty("landTilLand")]
    [JsonPropertyName("landTilLand")]
    public ArsregnskapLandTilLand35172 landTilLand { get; set; }

  }

  public class ArsregnskapSysteminnsending35139
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "35139";

  }

  public class ArsregnskapLandTilLand35172
  {
    [XmlText()]
    [Required]
    public bool value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "35172";

  }

  public class Skjemainnhold
  {
    [XmlElement("regnskapsperiode", Order = 1)]
    [JsonProperty("regnskapsperiode")]
    [JsonPropertyName("regnskapsperiode")]
    public Regnskapsperiode regnskapsperiode { get; set; }

    [XmlElement("konsern", Order = 2)]
    [JsonProperty("konsern")]
    [JsonPropertyName("konsern")]
    public Konsern konsern { get; set; }

    [XmlElement("regnskapsprinsipper", Order = 3)]
    [JsonProperty("regnskapsprinsipper")]
    [JsonPropertyName("regnskapsprinsipper")]
    public Regnskapsprinsipper regnskapsprinsipper { get; set; }

    [XmlElement("fastsettelse", Order = 4)]
    [JsonProperty("fastsettelse")]
    [JsonPropertyName("fastsettelse")]
    public Fastsettelse fastsettelse { get; set; }

  }

  public class Regnskapsperiode
  {
    [XmlElement("regnskapsstart", Order = 1)]
    [JsonProperty("regnskapsstart")]
    [JsonPropertyName("regnskapsstart")]
    public RegnskapStartdato17103 regnskapsstart { get; set; }

    [XmlElement("regnskapsslutt", Order = 2)]
    [JsonProperty("regnskapsslutt")]
    [JsonPropertyName("regnskapsslutt")]
    public RegnskapAvslutningsdato17104 regnskapsslutt { get; set; }

    [XmlElement("regnskapsaar", Order = 3)]
    [JsonProperty("regnskapsaar")]
    [JsonPropertyName("regnskapsaar")]
    public RegnskapAr17102 regnskapsaar { get; set; }

  }

  public class RegnskapStartdato17103
  {
    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "17103";

  }

  public class RegnskapAvslutningsdato17104
  {
    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "17104";

  }

  public class RegnskapAr17102
  {
    [RegularExpression(@"^[0-9]{4}$")]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "17102";

  }

  public class Konsern
  {
    [XmlElement("morselskap", Order = 1)]
    [JsonProperty("morselskap")]
    [JsonPropertyName("morselskap")]
    public Morselskap4168 morselskap { get; set; }

    [XmlElement("konsernregnskap", Order = 2)]
    [JsonProperty("konsernregnskap")]
    [JsonPropertyName("konsernregnskap")]
    public KonsernregnskapVedlegg25943 konsernregnskap { get; set; }

    [XmlElement("utenlandskKonsern", Order = 3)]
    [JsonProperty("utenlandskKonsern")]
    [JsonPropertyName("utenlandskKonsern")]
    public UtenlandskKonsern36640 utenlandskKonsern { get; set; }

  }

  public class Morselskap4168
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "4168";

  }

  public class KonsernregnskapVedlegg25943
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "25943";

  }

  public class UtenlandskKonsern36640
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "36640";

  }

  public class Regnskapsprinsipper
  {
    [XmlElement("smaaForetak", Order = 1)]
    [JsonProperty("smaaForetak")]
    [JsonPropertyName("smaaForetak")]
    public RegnskapsreglerSmaForetak8079 smaaForetak { get; set; }

    [XmlElement("regnskapsreglerSelskap", Order = 2)]
    [JsonProperty("regnskapsreglerSelskap")]
    [JsonPropertyName("regnskapsreglerSelskap")]
    public RegnskapsoppsettIFRS25021 regnskapsreglerSelskap { get; set; }

    [XmlElement("forenkletIfrs", Order = 3)]
    [JsonProperty("forenkletIfrs")]
    [JsonPropertyName("forenkletIfrs")]
    public ForenkletIFRS36639 forenkletIfrs { get; set; }

    [XmlElement("regnskapsreglerKonsern", Order = 4)]
    [JsonProperty("regnskapsreglerKonsern")]
    [JsonPropertyName("regnskapsreglerKonsern")]
    public RegnskapsoppsettKonsernIFRS25944 regnskapsreglerKonsern { get; set; }

    [XmlElement("forenkletIfrsKonsern", Order = 5)]
    [JsonProperty("forenkletIfrsKonsern")]
    [JsonPropertyName("forenkletIfrsKonsern")]
    public ForenkletIFRSKonsern36641 forenkletIfrsKonsern { get; set; }

    [XmlElement("aarsregnskapIkkeRevideres", Order = 6)]
    [JsonProperty("aarsregnskapIkkeRevideres")]
    [JsonPropertyName("aarsregnskapIkkeRevideres")]
    public ArsregnskapIkkeRevisjonBesluttet34669 aarsregnskapIkkeRevideres { get; set; }

    [XmlElement("aarsregnskapUtarbeidetAutorisertRegnskapsfoerer", Order = 7)]
    [JsonProperty("aarsregnskapUtarbeidetAutorisertRegnskapsfoerer")]
    [JsonPropertyName("aarsregnskapUtarbeidetAutorisertRegnskapsfoerer")]
    public ArsregnskapUtarbeidelseAvAutorisertRegnskapsforer34670 aarsregnskapUtarbeidetAutorisertRegnskapsfoerer { get; set; }

    [XmlElement("tjenestebistandEksternAutorisertRegnskapsfoerer", Order = 8)]
    [JsonProperty("tjenestebistandEksternAutorisertRegnskapsfoerer")]
    [JsonPropertyName("tjenestebistandEksternAutorisertRegnskapsfoerer")]
    public TjenestebistandEksternAutorisertRegnskapsforer34671 tjenestebistandEksternAutorisertRegnskapsfoerer { get; set; }

  }

  public class RegnskapsreglerSmaForetak8079
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "8079";

  }

  public class RegnskapsoppsettIFRS25021
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "25021";

  }

  public class ForenkletIFRS36639
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "36639";

  }

  public class RegnskapsoppsettKonsernIFRS25944
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "25944";

  }

  public class ForenkletIFRSKonsern36641
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "36641";

  }

  public class ArsregnskapIkkeRevisjonBesluttet34669
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "34669";

  }

  public class ArsregnskapUtarbeidelseAvAutorisertRegnskapsforer34670
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "34670";

  }

  public class TjenestebistandEksternAutorisertRegnskapsforer34671
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "34671";

  }

  public class Fastsettelse
  {
    [XmlElement("fastsettelsesdato", Order = 1)]
    [JsonProperty("fastsettelsesdato")]
    [JsonPropertyName("fastsettelsesdato")]
    public RegnskapFastsettelseDato17105 fastsettelsesdato { get; set; }

    [XmlElement("bekreftendeSelskapsrepresentant", Order = 2)]
    [JsonProperty("bekreftendeSelskapsrepresentant")]
    [JsonPropertyName("bekreftendeSelskapsrepresentant")]
    public StyremedlemNavnSpesifisertStyremedlem19023 bekreftendeSelskapsrepresentant { get; set; }

  }

  public class RegnskapFastsettelseDato17105
  {
    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "17105";

  }

  public class StyremedlemNavnSpesifisertStyremedlem19023
  {
    [MinLength(1)]
    [MaxLength(70)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "19023";

  }
}
