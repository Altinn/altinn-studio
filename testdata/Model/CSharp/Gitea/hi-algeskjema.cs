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
  [XmlRoot(ElementName="schema")]
  public class AltinnSchema
  {
    [XmlElement("schematype", Order = 1)]
    [JsonProperty("schematype")]
    [JsonPropertyName("schematype")]
    public string schematype { get; set; }

    [XmlElement("archiveidforupdate", Order = 2)]
    [JsonProperty("archiveidforupdate")]
    [JsonPropertyName("archiveidforupdate")]
    public string archiveidforupdate { get; set; }

    [XmlElement("stationtype", Order = 3)]
    [JsonProperty("stationtype")]
    [JsonPropertyName("stationtype")]
    public string stationtype { get; set; }

    [XmlElement("stationid", Order = 4)]
    [JsonProperty("stationid")]
    [JsonPropertyName("stationid")]
    public string stationid { get; set; }

    [XmlElement("longitude", Order = 5)]
    [JsonProperty("longitude")]
    [JsonPropertyName("longitude")]
    public decimal? longitude { get; set; }

    [XmlElement("latitude", Order = 6)]
    [JsonProperty("latitude")]
    [JsonPropertyName("latitude")]
    public decimal? latitude { get; set; }

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("depth", Order = 7)]
    [JsonProperty("depth")]
    [JsonPropertyName("depth")]
    public decimal? depth { get; set; }

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("sampledate", Order = 8)]
    [JsonProperty("sampledate")]
    [JsonPropertyName("sampledate")]
    public string sampledate { get; set; }

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("hour", Order = 9)]
    [JsonProperty("hour")]
    [JsonPropertyName("hour")]
    public decimal? hour { get; set; }

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("minute", Order = 10)]
    [JsonProperty("minute")]
    [JsonPropertyName("minute")]
    public decimal? minute { get; set; }

    [XmlElement("productionarea", Order = 11)]
    [JsonProperty("productionarea")]
    [JsonPropertyName("productionarea")]
    public string productionarea { get; set; }

    [XmlElement("testingcompany", Order = 12)]
    [JsonProperty("testingcompany")]
    [JsonPropertyName("testingcompany")]
    public string testingcompany { get; set; }

    [XmlElement("organisationid", Order = 13)]
    [JsonProperty("organisationid")]
    [JsonPropertyName("organisationid")]
    public string organisationid { get; set; }

    [XmlElement("analysisresponsible", Order = 14)]
    [JsonProperty("analysisresponsible")]
    [JsonPropertyName("analysisresponsible")]
    public string analysisresponsible { get; set; }

    [XmlElement("harmfulalgae", Order = 15)]
    [JsonProperty("harmfulalgae")]
    [JsonPropertyName("harmfulalgae")]
    public bool? harmfulalgae { get; set; }

    [XmlElement("reportedmortality", Order = 16)]
    [JsonProperty("reportedmortality")]
    [JsonPropertyName("reportedmortality")]
    public bool? reportedmortality { get; set; }

    [XmlElement("behaviourchanges", Order = 17)]
    [JsonProperty("behaviourchanges")]
    [JsonPropertyName("behaviourchanges")]
    public bool? behaviourchanges { get; set; }

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("diatomcount", Order = 18)]
    [JsonProperty("diatomcount")]
    [JsonPropertyName("diatomcount")]
    public decimal? diatomcount { get; set; }

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("dinoflagellatecount", Order = 19)]
    [JsonProperty("dinoflagellatecount")]
    [JsonPropertyName("dinoflagellatecount")]
    public decimal? dinoflagellatecount { get; set; }

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("flagellatecount", Order = 20)]
    [JsonProperty("flagellatecount")]
    [JsonPropertyName("flagellatecount")]
    public decimal? flagellatecount { get; set; }

    [XmlElement("comments", Order = 21)]
    [JsonProperty("comments")]
    [JsonPropertyName("comments")]
    public string comments { get; set; }

    [XmlElement("algae", Order = 22)]
    [JsonProperty("algae")]
    [JsonPropertyName("algae")]
    public List<AltinnAlgae> algae { get; set; }

    [XmlElement("owner", Order = 23)]
    [JsonProperty("owner")]
    [JsonPropertyName("owner")]
    public List<AltinnOwner> owner { get; set; }

  }

  public class AltinnAlgae
  {
    [XmlElement("scientificname", Order = 1)]
    [JsonProperty("scientificname")]
    [JsonPropertyName("scientificname")]
    public string scientificname { get; set; }

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("density", Order = 2)]
    [JsonProperty("density")]
    [JsonPropertyName("density")]
    public decimal? density { get; set; }

  }

  public class AltinnOwner
  {
    [XmlElement("organisationid", Order = 1)]
    [JsonProperty("organisationid")]
    [JsonPropertyName("organisationid")]
    public string organisationid { get; set; }

    [XmlElement("organisationname", Order = 2)]
    [JsonProperty("organisationname")]
    [JsonPropertyName("organisationname")]
    public string organisationname { get; set; }

  }
}
