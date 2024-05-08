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
  [XmlRoot(ElementName="XML2Ephorte")]
  public class DataModel
  {
    [XmlElement("FORMID", Order = 1)]
    [JsonProperty("FORMID")]
    [JsonPropertyName("FORMID")]
    public string FORMID { get; set; }

    [XmlElement("AVSMOT", Order = 2)]
    [JsonProperty("AVSMOT")]
    [JsonPropertyName("AVSMOT")]
    public AVSMOT AVSMOT { get; set; }

    [XmlElement("DOKLINK", Order = 3)]
    [JsonProperty("DOKLINK")]
    [JsonPropertyName("DOKLINK")]
    public List<DOKLINK> DOKLINK { get; set; }

    [XmlElement("DOKBESKRIV", Order = 4)]
    [JsonProperty("DOKBESKRIV")]
    [JsonPropertyName("DOKBESKRIV")]
    public List<DOKBESKRIV> DOKBESKRIV { get; set; }

    [XmlElement("DOKVERSJON", Order = 5)]
    [JsonProperty("DOKVERSJON")]
    [JsonPropertyName("DOKVERSJON")]
    public List<DOKVERSJON> DOKVERSJON { get; set; }

    [XmlElement("FlatData", Order = 6)]
    [JsonProperty("FlatData")]
    [JsonPropertyName("FlatData")]
    public FlatData FlatData { get; set; }

    [XmlElement("AppLogikk", Order = 7)]
    [JsonProperty("AppLogikk")]
    [JsonPropertyName("AppLogikk")]
    public AppLogikk AppLogikk { get; set; }

  }

  public class AVSMOT
  {
    [XmlElement("AM_ID", Order = 1)]
    [JsonProperty("AM_ID")]
    [JsonPropertyName("AM_ID")]
    public string AM_ID { get; set; }

    [XmlElement("AM_JPID", Order = 2)]
    [JsonProperty("AM_JPID")]
    [JsonPropertyName("AM_JPID")]
    public string AM_JPID { get; set; }

    [XmlElement("AM_IHTYPE", Order = 3)]
    [JsonProperty("AM_IHTYPE")]
    [JsonPropertyName("AM_IHTYPE")]
    public string AM_IHTYPE { get; set; }

    [XmlElement("AM_KOPIMOT", Order = 4)]
    [JsonProperty("AM_KOPIMOT")]
    [JsonPropertyName("AM_KOPIMOT")]
    public string AM_KOPIMOT { get; set; }

    [XmlElement("AM_BEHANSV", Order = 5)]
    [JsonProperty("AM_BEHANSV")]
    [JsonPropertyName("AM_BEHANSV")]
    public string AM_BEHANSV { get; set; }

    [XmlElement("AM_NAVN", Order = 6)]
    [JsonProperty("AM_NAVN")]
    [JsonPropertyName("AM_NAVN")]
    public string AM_NAVN { get; set; }

    [XmlElement("AM_GRUPPEMOT", Order = 7)]
    [JsonProperty("AM_GRUPPEMOT")]
    [JsonPropertyName("AM_GRUPPEMOT")]
    public string AM_GRUPPEMOT { get; set; }

    [XmlElement("AM_ADRESSE", Order = 8)]
    [JsonProperty("AM_ADRESSE")]
    [JsonPropertyName("AM_ADRESSE")]
    public string AM_ADRESSE { get; set; }

    [XmlElement("AM_POSTNR_PO", Order = 9)]
    [JsonProperty("AM_POSTNR_PO")]
    [JsonPropertyName("AM_POSTNR_PO")]
    public string AM_POSTNR_PO { get; set; }

    [XmlElement("AM_POSTSTED", Order = 10)]
    [JsonProperty("AM_POSTSTED")]
    [JsonPropertyName("AM_POSTSTED")]
    public string AM_POSTSTED { get; set; }

    [XmlElement("AM_EPOSTADR", Order = 11)]
    [JsonProperty("AM_EPOSTADR")]
    [JsonPropertyName("AM_EPOSTADR")]
    public string AM_EPOSTADR { get; set; }

    [XmlElement("AM_ADMID_AI", Order = 12)]
    [JsonProperty("AM_ADMID_AI")]
    [JsonPropertyName("AM_ADMID_AI")]
    public string AM_ADMID_AI { get; set; }

    [XmlElement("AM_NASJONALIDENTIFIKATOR_G", Order = 13)]
    [JsonProperty("AM_NASJONALIDENTIFIKATOR_G")]
    [JsonPropertyName("AM_NASJONALIDENTIFIKATOR_G")]
    public string AM_NASJONALIDENTIFIKATOR_G { get; set; }

    [XmlElement("AM_TLF_G", Order = 14)]
    [JsonProperty("AM_TLF_G")]
    [JsonPropertyName("AM_TLF_G")]
    public string AM_TLF_G { get; set; }

    [XmlElement("AM_IFKODE_IF", Order = 15)]
    [JsonProperty("AM_IFKODE_IF")]
    [JsonPropertyName("AM_IFKODE_IF")]
    public string AM_IFKODE_IF { get; set; }

    [XmlElement("AM_PERSON_G", Order = 16)]
    [JsonProperty("AM_PERSON_G")]
    [JsonPropertyName("AM_PERSON_G")]
    public string AM_PERSON_G { get; set; }

  }

  public class DOKLINK
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("DL_DOKID_DB", Order = 1)]
    [JsonProperty("DL_DOKID_DB")]
    [JsonPropertyName("DL_DOKID_DB")]
    public string DL_DOKID_DB { get; set; }

    [XmlElement("DL_TYPE_DT", Order = 2)]
    [JsonProperty("DL_TYPE_DT")]
    [JsonPropertyName("DL_TYPE_DT")]
    public string DL_TYPE_DT { get; set; }

  }

  public class DOKBESKRIV
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("DB_DOKID", Order = 1)]
    [JsonProperty("DB_DOKID")]
    [JsonPropertyName("DB_DOKID")]
    public string DB_DOKID { get; set; }

    [XmlElement("DB_TITTEL", Order = 2)]
    [JsonProperty("DB_TITTEL")]
    [JsonPropertyName("DB_TITTEL")]
    public string DB_TITTEL { get; set; }

  }

  public class DOKVERSJON
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("VE_DOKID_DB", Order = 1)]
    [JsonProperty("VE_DOKID_DB")]
    [JsonPropertyName("VE_DOKID_DB")]
    public string VE_DOKID_DB { get; set; }

    [XmlElement("VE_DOKFORMAT_LF", Order = 2)]
    [JsonProperty("VE_DOKFORMAT_LF")]
    [JsonPropertyName("VE_DOKFORMAT_LF")]
    public string VE_DOKFORMAT_LF { get; set; }

    [XmlElement("VE_FILREF", Order = 3)]
    [JsonProperty("VE_FILREF")]
    [JsonPropertyName("VE_FILREF")]
    public string VE_FILREF { get; set; }

  }

  public class FlatData
  {
    [XmlElement("kommune", Order = 1)]
    [JsonProperty("kommune")]
    [JsonPropertyName("kommune")]
    public string kommune { get; set; }

    [XmlElement("soker", Order = 2)]
    [JsonProperty("soker")]
    [JsonPropertyName("soker")]
    public Soker soker { get; set; }

    [XmlElement("barn", Order = 3)]
    [JsonProperty("barn")]
    [JsonPropertyName("barn")]
    public List<Barn> barn { get; set; }

    [XmlElement("girSamtykke", Order = 4)]
    [JsonProperty("girSamtykke")]
    [JsonPropertyName("girSamtykke")]
    public string girSamtykke { get; set; }

    [XmlElement("sokerSkattegrunnlag", Order = 5)]
    [JsonProperty("sokerSkattegrunnlag")]
    [JsonPropertyName("sokerSkattegrunnlag")]
    public List<Skattegrunnlag> sokerSkattegrunnlag { get; set; }

    [XmlElement("partnerSkattegrunnlag", Order = 6)]
    [JsonProperty("partnerSkattegrunnlag")]
    [JsonPropertyName("partnerSkattegrunnlag")]
    public List<Skattegrunnlag> partnerSkattegrunnlag { get; set; }

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("skattegrunnlagSummert", Order = 7)]
    [JsonProperty("skattegrunnlagSummert")]
    [JsonPropertyName("skattegrunnlagSummert")]
    [Required]
    public decimal? skattegrunnlagSummert { get; set; }

    [XmlElement("nedgangInntekt", Order = 8)]
    [JsonProperty("nedgangInntekt")]
    [JsonPropertyName("nedgangInntekt")]
    public string nedgangInntekt { get; set; }

    [XmlElement("upload_vedlegg", Order = 9)]
    [JsonProperty("upload_vedlegg")]
    [JsonPropertyName("upload_vedlegg")]
    public string upload_vedlegg { get; set; }

    [XmlElement("riktigInntekt", Order = 10)]
    [JsonProperty("riktigInntekt")]
    [JsonPropertyName("riktigInntekt")]
    public string riktigInntekt { get; set; }

  }

  public class Soker
  {
    [XmlElement("navn", Order = 1)]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    public string navn { get; set; }

    [XmlElement("fodselsnummer", Order = 2)]
    [JsonProperty("fodselsnummer")]
    [JsonPropertyName("fodselsnummer")]
    public string fodselsnummer { get; set; }

    [XmlElement("adresse", Order = 3)]
    [JsonProperty("adresse")]
    [JsonPropertyName("adresse")]
    public string adresse { get; set; }

    [XmlElement("postnummer", Order = 4)]
    [JsonProperty("postnummer")]
    [JsonPropertyName("postnummer")]
    public string postnummer { get; set; }

    [XmlElement("poststed", Order = 5)]
    [JsonProperty("poststed")]
    [JsonPropertyName("poststed")]
    public string poststed { get; set; }

    [XmlElement("medSokerNavn", Order = 6)]
    [JsonProperty("medSokerNavn")]
    [JsonPropertyName("medSokerNavn")]
    public string medSokerNavn { get; set; }

    [XmlElement("medSokerFodselsnummer", Order = 7)]
    [JsonProperty("medSokerFodselsnummer")]
    [JsonPropertyName("medSokerFodselsnummer")]
    public string medSokerFodselsnummer { get; set; }

    [XmlElement("medSokerSammeAdresseSomSoker", Order = 8)]
    [JsonProperty("medSokerSammeAdresseSomSoker")]
    [JsonPropertyName("medSokerSammeAdresseSomSoker")]
    public string medSokerSammeAdresseSomSoker { get; set; }

  }

  public class Barn
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("navn", Order = 1)]
    [JsonProperty("navn")]
    [JsonPropertyName("navn")]
    public string navn { get; set; }

    [XmlElement("fodselsnummer", Order = 2)]
    [JsonProperty("fodselsnummer")]
    [JsonPropertyName("fodselsnummer")]
    public string fodselsnummer { get; set; }

    [XmlElement("navnBhgSfo", Order = 3)]
    [JsonProperty("navnBhgSfo")]
    [JsonPropertyName("navnBhgSfo")]
    public string navnBhgSfo { get; set; }

    [XmlElement("sokerOm", Order = 4)]
    [JsonProperty("sokerOm")]
    [JsonPropertyName("sokerOm")]
    public string sokerOm { get; set; }

    [XmlElement("bhgEllerSfo", Order = 5)]
    [JsonProperty("bhgEllerSfo")]
    [JsonPropertyName("bhgEllerSfo")]
    public string bhgEllerSfo { get; set; }

  }

  public class Skattegrunnlag
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("grunnlagNavn", Order = 1)]
    [JsonProperty("grunnlagNavn")]
    [JsonPropertyName("grunnlagNavn")]
    public string grunnlagNavn { get; set; }

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("beloep", Order = 2)]
    [JsonProperty("beloep")]
    [JsonPropertyName("beloep")]
    [Required]
    public decimal? beloep { get; set; }

  }

  public class AppLogikk
  {
    [XmlElement("testFelt", Order = 1)]
    [JsonProperty("testFelt")]
    [JsonPropertyName("testFelt")]
    public string testFelt { get; set; }

    [XmlElement("sokerForBarn", Order = 2)]
    [JsonProperty("sokerForBarn")]
    [JsonPropertyName("sokerForBarn")]
    public string sokerForBarn { get; set; }

    [XmlElement("prefillBarn", Order = 3)]
    [JsonProperty("prefillBarn")]
    [JsonPropertyName("prefillBarn")]
    public List<Barn> prefillBarn { get; set; }

    [XmlElement("prefillBarnNavn", Order = 4)]
    [JsonProperty("prefillBarnNavn")]
    [JsonPropertyName("prefillBarnNavn")]
    public string prefillBarnNavn { get; set; }

    [XmlElement("skjulSkatteinfo", Order = 5)]
    [JsonProperty("skjulSkatteinfo")]
    [JsonPropertyName("skjulSkatteinfo")]
    public string skjulSkatteinfo { get; set; }

    [XmlElement("folkeregPartner", Order = 6)]
    [JsonProperty("folkeregPartner")]
    [JsonPropertyName("folkeregPartner")]
    public string folkeregPartner { get; set; }

  }
}
