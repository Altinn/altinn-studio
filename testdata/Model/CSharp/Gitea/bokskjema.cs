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
  [XmlRoot(ElementName="publication")]
  public class schematic
  {
    [XmlElement("userLanguage", Order = 1)]
    [JsonProperty("userLanguage")]
    [JsonPropertyName("userLanguage")]
    public string userLanguage { get; set; }

    [XmlElement("materialType", Order = 2)]
    [JsonProperty("materialType")]
    [JsonPropertyName("materialType")]
    public string materialType { get; set; }

    [XmlElement("theaterType", Order = 3)]
    [JsonProperty("theaterType")]
    [JsonPropertyName("theaterType")]
    public string theaterType { get; set; }

    [XmlElement("title", Order = 4)]
    [JsonProperty("title")]
    [JsonPropertyName("title")]
    public string title { get; set; }

    [XmlElement("subtitle", Order = 5)]
    [JsonProperty("subtitle")]
    [JsonPropertyName("subtitle")]
    public string subtitle { get; set; }

    [XmlElement("persons", Order = 6)]
    [JsonProperty("persons")]
    [JsonPropertyName("persons")]
    public List<personOfResponsibility> persons { get; set; }

    [XmlElement("organizations", Order = 7)]
    [JsonProperty("organizations")]
    [JsonPropertyName("organizations")]
    public List<organizationOfResponsibility> organizations { get; set; }

    [XmlElement("submitter", Order = 8)]
    [JsonProperty("submitter")]
    [JsonPropertyName("submitter")]
    public string submitter { get; set; }

    [RegularExpression(@"^(19|20)[0-9]{2}$")]
    [XmlElement("publishYear", Order = 9)]
    [JsonProperty("publishYear")]
    [JsonPropertyName("publishYear")]
    public string publishYear { get; set; }

    [XmlElement("meantForPress", Order = 10)]
    [JsonProperty("meantForPress")]
    [JsonPropertyName("meantForPress")]
    public bool? meantForPress { get; set; }

    public bool ShouldSerializemeantForPress() => meantForPress.HasValue;

    [XmlElement("language", Order = 11)]
    [JsonProperty("language")]
    [JsonPropertyName("language")]
    public string language { get; set; }

    [XmlElement("edition", Order = 12)]
    [JsonProperty("edition")]
    [JsonPropertyName("edition")]
    public string edition { get; set; }

    [XmlElement("publishPlace", Order = 13)]
    [JsonProperty("publishPlace")]
    [JsonPropertyName("publishPlace")]
    public string publishPlace { get; set; }

    [XmlElement("numberOfPages", Order = 14)]
    [JsonProperty("numberOfPages")]
    [JsonPropertyName("numberOfPages")]
    public string numberOfPages { get; set; }

    [XmlElement("premiereDateAndPlace", Order = 15)]
    [JsonProperty("premiereDateAndPlace")]
    [JsonPropertyName("premiereDateAndPlace")]
    public string premiereDateAndPlace { get; set; }

    [XmlElement("hasISBN", Order = 16)]
    [JsonProperty("hasISBN")]
    [JsonPropertyName("hasISBN")]
    public bool? hasISBN { get; set; }

    public bool ShouldSerializehasISBN() => hasISBN.HasValue;

    [RegularExpression(@"(?=[\S\s]{13}$|[\S\s]{17}$)[\S\s]*^(978([\-]?)[0-9]{2}([\-]?)([0-1][0-9]|[2-6][0-9]{2}|[78][0-9]{3}|9[0-8][0-9]{3}|99[0-9]{4}|69[0-9]{4})([\-]?)[0-9]{1,5}([\-]?)[xX0-9])$")]
    [XmlElement("isbn", Order = 17)]
    [JsonProperty("isbn")]
    [JsonPropertyName("isbn")]
    public string isbn { get; set; }

    [XmlElement("originalTitle", Order = 18)]
    [JsonProperty("originalTitle")]
    [JsonPropertyName("originalTitle")]
    public string originalTitle { get; set; }

    [XmlElement("isSeries", Order = 19)]
    [JsonProperty("isSeries")]
    [JsonPropertyName("isSeries")]
    public bool? isSeries { get; set; }

    public bool ShouldSerializeisSeries() => isSeries.HasValue;

    [RegularExpression(@"(?=[\S\s]{8}$|[\S\s]{9}$)[\S\s]*^([0-9]{4}([\-]?)[0-9]{3}[xX0-9])$")]
    [XmlElement("issn", Order = 20)]
    [JsonProperty("issn")]
    [JsonPropertyName("issn")]
    public string issn { get; set; }

    [XmlElement("seriesTitle", Order = 21)]
    [JsonProperty("seriesTitle")]
    [JsonPropertyName("seriesTitle")]
    public string seriesTitle { get; set; }

    [XmlElement("numberInSeries", Order = 22)]
    [JsonProperty("numberInSeries")]
    [JsonPropertyName("numberInSeries")]
    public string numberInSeries { get; set; }

    [XmlElement("summary", Order = 23)]
    [JsonProperty("summary")]
    [JsonPropertyName("summary")]
    public string summary { get; set; }

    [XmlElement("missionClient", Order = 24)]
    [JsonProperty("missionClient")]
    [JsonPropertyName("missionClient")]
    public string missionClient { get; set; }

    [XmlElement("missionExecutor", Order = 25)]
    [JsonProperty("missionExecutor")]
    [JsonPropertyName("missionExecutor")]
    public string missionExecutor { get; set; }

    [XmlElement("documentType", Order = 26)]
    [JsonProperty("documentType")]
    [JsonPropertyName("documentType")]
    public string documentType { get; set; }

    [XmlElement("scale", Order = 27)]
    [JsonProperty("scale")]
    [JsonPropertyName("scale")]
    public string scale { get; set; }

    [XmlElement("hasISMN", Order = 28)]
    [JsonProperty("hasISMN")]
    [JsonPropertyName("hasISMN")]
    public bool? hasISMN { get; set; }

    public bool ShouldSerializehasISMN() => hasISMN.HasValue;

    [RegularExpression(@"(?=[\S\s]{13}$|[\S\s]{17}$)[\S\s]*^(979([\-]?)0([\-]?)(0[0-9]{2}|[1-3][0-9]{3}|[4-6][0-9]{4}|[78][0-9]{5}|9[0-9]{6})([\-]?)[0-9]{1,5}([\-]?)[xX0-9])$")]
    [XmlElement("ismn", Order = 29)]
    [JsonProperty("ismn")]
    [JsonPropertyName("ismn")]
    public string ismn { get; set; }

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("orgNumber", Order = 30)]
    [JsonProperty("orgNumber")]
    [JsonPropertyName("orgNumber")]
    public decimal? orgNumber { get; set; }

    public bool ShouldSerializeorgNumber() => orgNumber.HasValue;

    [XmlElement("access", Order = 31)]
    [JsonProperty("access")]
    [JsonPropertyName("access")]
    public bool? access { get; set; }

    public bool ShouldSerializeaccess() => access.HasValue;

    [XmlElement("comment", Order = 32)]
    [JsonProperty("comment")]
    [JsonPropertyName("comment")]
    public string comment { get; set; }

    [XmlElement("publishers", Order = 33)]
    [JsonProperty("publishers")]
    [JsonPropertyName("publishers")]
    public List<publisherObject> publishers { get; set; }

  }

  public class personOfResponsibility
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("role", Order = 1)]
    [JsonProperty("role")]
    [JsonPropertyName("role")]
    public string role { get; set; }

    [XmlElement("firstname", Order = 2)]
    [JsonProperty("firstname")]
    [JsonPropertyName("firstname")]
    public string firstname { get; set; }

    [XmlElement("lastname", Order = 3)]
    [JsonProperty("lastname")]
    [JsonPropertyName("lastname")]
    public string lastname { get; set; }

  }

  public class organizationOfResponsibility
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("orgName", Order = 1)]
    [JsonProperty("orgName")]
    [JsonPropertyName("orgName")]
    public string orgName { get; set; }

    [XmlElement("orgRole", Order = 2)]
    [JsonProperty("orgRole")]
    [JsonPropertyName("orgRole")]
    public string orgRole { get; set; }

  }

  public class publisherObject
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("publisherName", Order = 1)]
    [JsonProperty("publisherName")]
    [JsonPropertyName("publisherName")]
    public string publisherName { get; set; }

  }
}
