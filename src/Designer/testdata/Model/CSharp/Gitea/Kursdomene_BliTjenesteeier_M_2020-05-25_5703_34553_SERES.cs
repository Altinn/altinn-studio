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
  public class BliTjenesteeier_M
  {
    [XmlAttribute("dataFormatProvider")]
    [BindNever]
    public string dataFormatProvider { get; set; } = "SERES";

    [XmlAttribute("dataFormatId")]
    [BindNever]
    public string dataFormatId { get; set; } = "5703";

    [XmlAttribute("dataFormatVersion")]
    [BindNever]
    public string dataFormatVersion { get; set; } = "34553";

    [XmlElement("Tjenesteeier", Order = 1)]
    [JsonProperty("Tjenesteeier")]
    [JsonPropertyName("Tjenesteeier")]
    public Tjenesteeier Tjenesteeier { get; set; }

    [XmlElement("Kontaktperson", Order = 2)]
    [JsonProperty("Kontaktperson")]
    [JsonPropertyName("Kontaktperson")]
    public Kontaktperson Kontaktperson { get; set; }

    [XmlElement("OEnsketBruk", Order = 3)]
    [JsonProperty("OEnsketBruk")]
    [JsonPropertyName("OEnsketBruk")]
    public OEnsketBruk OEnsketBruk { get; set; }

  }

  public class Tjenesteeier
  {
    [XmlElement("navnBokmaal", Order = 1)]
    [JsonProperty("navnBokmaal")]
    [JsonPropertyName("navnBokmaal")]
    [Required]
    public string navnBokmaal { get; set; }

    [RegularExpression(@"[0-9]{9}")]
    [XmlElement("organisasjonsnummer", Order = 2)]
    [JsonProperty("organisasjonsnummer")]
    [JsonPropertyName("organisasjonsnummer")]
    [Required]
    public string organisasjonsnummer { get; set; }

    [XmlElement("sektor", Order = 3)]
    [JsonProperty("sektor")]
    [JsonPropertyName("sektor")]
    [Required]
    public string sektor { get; set; }

    [XmlElement("navnNynorsk", Order = 4, IsNullable = true)]
    [JsonProperty("navnNynorsk")]
    [JsonPropertyName("navnNynorsk")]
    public string navnNynorsk { get; set; }

    [XmlElement("navnEngelsk", Order = 5, IsNullable = true)]
    [JsonProperty("navnEngelsk")]
    [JsonPropertyName("navnEngelsk")]
    public string navnEngelsk { get; set; }

    [XmlElement("akronym", Order = 6)]
    [JsonProperty("akronym")]
    [JsonPropertyName("akronym")]
    [Required]
    public string akronym { get; set; }

    [XmlElement("ipAdresse", Order = 7)]
    [JsonProperty("ipAdresse")]
    [JsonPropertyName("ipAdresse")]
    [Required]
    public string ipAdresse { get; set; }

    [RegularExpression(@"[0-9]{11}")]
    [XmlElement("adminTEServicearkivFoedselsnr", Order = 8)]
    [JsonProperty("adminTEServicearkivFoedselsnr")]
    [JsonPropertyName("adminTEServicearkivFoedselsnr")]
    [Required]
    public string adminTEServicearkivFoedselsnr { get; set; }

    [XmlElement("adminTEServicearkivNavn", Order = 9)]
    [JsonProperty("adminTEServicearkivNavn")]
    [JsonPropertyName("adminTEServicearkivNavn")]
    [Required]
    public string adminTEServicearkivNavn { get; set; }

    [XmlElement("adminTEServicearkivTelefon", Order = 10)]
    [JsonProperty("adminTEServicearkivTelefon")]
    [JsonPropertyName("adminTEServicearkivTelefon")]
    [Required]
    public string adminTEServicearkivTelefon { get; set; }

  }

  public class Kontaktperson
  {
    [XmlElement("navn", Order = 1)]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    [Required]
    public string navn { get; set; }

    [XmlElement("epost", Order = 2)]
    [JsonProperty("epost")]
    [JsonPropertyName("epost")]
    [Required]
    public string epost { get; set; }

    [XmlElement("telefonnummer", Order = 3)]
    [JsonProperty("telefonnummer")]
    [JsonPropertyName("telefonnummer")]
    [Required]
    public string telefonnummer { get; set; }

  }

  public class OEnsketBruk
  {
    [XmlElement("hvaKanViBrukeAltinnTil", Order = 1)]
    [JsonProperty("hvaKanViBrukeAltinnTil")]
    [JsonPropertyName("hvaKanViBrukeAltinnTil")]
    [Required]
    public string hvaKanViBrukeAltinnTil { get; set; }

  }
}
