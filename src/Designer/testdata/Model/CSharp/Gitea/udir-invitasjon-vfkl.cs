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
  [XmlRoot(ElementName="GruppeInvitasjon")]
  public class InvitasjonsInnhold
  {
    [XmlElement("VurderingsType", Order = 1)]
    [JsonProperty("VurderingsType")]
    [JsonPropertyName("VurderingsType")]
    [Required]
    public string VurderingsType { get; set; }

    [XmlElement("BrukerID", Order = 2)]
    [JsonProperty("BrukerID")]
    [JsonPropertyName("BrukerID")]
    [Required]
    public string BrukerID { get; set; }

    [XmlElement("BrukerEpost", Order = 3)]
    [JsonProperty("BrukerEpost")]
    [JsonPropertyName("BrukerEpost")]
    [Required]
    public string BrukerEpost { get; set; }

    [XmlElement("Læremiddel", Order = 4)]
    [JsonProperty("Læremiddel")]
    [JsonPropertyName("Læremiddel")]
    [Required]
    public string Læremiddel { get; set; }

    [XmlElement("LæremiddelLeverandør", Order = 5)]
    [JsonProperty("LæremiddelLeverandør")]
    [JsonPropertyName("LæremiddelLeverandør")]
    [Required]
    public string LæremiddelLeverandør { get; set; }

    [XmlElement("Læreplan", Order = 6)]
    [JsonProperty("Læreplan")]
    [JsonPropertyName("Læreplan")]
    [Required]
    public string Læreplan { get; set; }

    [XmlElement("Skolenivå", Order = 7)]
    [JsonProperty("Skolenivå")]
    [JsonPropertyName("Skolenivå")]
    [Required]
    public string Skolenivå { get; set; }

    [XmlElement("Utdanningsprogram", Order = 8)]
    [JsonProperty("Utdanningsprogram")]
    [JsonPropertyName("Utdanningsprogram")]
    [Required]
    public string Utdanningsprogram { get; set; }

    [XmlElement("Programområde", Order = 9)]
    [JsonProperty("Programområde")]
    [JsonPropertyName("Programområde")]
    [Required]
    public string Programområde { get; set; }

    [XmlElement("gruppeVurderingsID", Order = 10)]
    [JsonProperty("gruppeVurderingsID")]
    [JsonPropertyName("gruppeVurderingsID")]
    [Required]
    public string gruppeVurderingsID { get; set; }

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("VurderingsFrist", Order = 11)]
    [JsonProperty("VurderingsFrist")]
    [JsonPropertyName("VurderingsFrist")]
    [Required]
    public string VurderingsFrist { get; set; }

    [XmlElement("MottakerEposter", Order = 12)]
    [JsonProperty("MottakerEposter")]
    [JsonPropertyName("MottakerEposter")]
    [Required]
    public string MottakerEposter { get; set; }

    [XmlElement("Navn", Order = 13)]
    [JsonProperty("Navn")]
    [JsonPropertyName("Navn")]
    [Required]
    public string Navn { get; set; }

    [XmlElement("BortvalgteSpørsmål", Order = 14)]
    [JsonProperty("BortvalgteSpørsmål")]
    [JsonPropertyName("BortvalgteSpørsmål")]
    [Required]
    public string BortvalgteSpørsmål { get; set; }

    [XmlElement("BortvalgteSpørsmålDel1", Order = 15)]
    [JsonProperty("BortvalgteSpørsmålDel1")]
    [JsonPropertyName("BortvalgteSpørsmålDel1")]
    [Required]
    public string BortvalgteSpørsmålDel1 { get; set; }

    [XmlElement("BortvalgteSpørsmålDel2", Order = 16)]
    [JsonProperty("BortvalgteSpørsmålDel2")]
    [JsonPropertyName("BortvalgteSpørsmålDel2")]
    [Required]
    public string BortvalgteSpørsmålDel2 { get; set; }

    [XmlElement("BortvalgteSpørsmålDel3", Order = 17)]
    [JsonProperty("BortvalgteSpørsmålDel3")]
    [JsonPropertyName("BortvalgteSpørsmålDel3")]
    [Required]
    public string BortvalgteSpørsmålDel3 { get; set; }

    [XmlElement("AppLogikk", Order = 18)]
    [JsonProperty("AppLogikk")]
    [JsonPropertyName("AppLogikk")]
    public AppLogikk AppLogikk { get; set; }

  }

  public class AppLogikk
  {
    [XmlElement("samledeEposter", Order = 1)]
    [JsonProperty("samledeEposter")]
    [JsonPropertyName("samledeEposter")]
    [Required]
    public string samledeEposter { get; set; }

    [XmlElement("feilendeEposter", Order = 2)]
    [JsonProperty("feilendeEposter")]
    [JsonPropertyName("feilendeEposter")]
    [Required]
    public string feilendeEposter { get; set; }

    [XmlElement("velgBortSpørsmål", Order = 3)]
    [JsonProperty("velgBortSpørsmål")]
    [JsonPropertyName("velgBortSpørsmål")]
    [Required]
    public string velgBortSpørsmål { get; set; }

    [XmlElement("godtarVilkaar", Order = 4)]
    [JsonProperty("godtarVilkaar")]
    [JsonPropertyName("godtarVilkaar")]
    [Required]
    public string godtarVilkaar { get; set; }

  }
}
