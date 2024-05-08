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
  [XmlRoot(ElementName="Vurdering")]
  public class VurderingInnhold
  {
    [XmlElement("VurderingsType", Order = 1)]
    [JsonProperty("VurderingsType")]
    [JsonPropertyName("VurderingsType")]
    public string VurderingsType { get; set; }

    [XmlElement("brukerID", Order = 2)]
    [JsonProperty("brukerID")]
    [JsonPropertyName("brukerID")]
    public string brukerID { get; set; }

    [XmlElement("Læremiddel", Order = 3)]
    [JsonProperty("Læremiddel")]
    [JsonPropertyName("Læremiddel")]
    public string Læremiddel { get; set; }

    [XmlElement("LæremiddelLeverandør", Order = 4)]
    [JsonProperty("LæremiddelLeverandør")]
    [JsonPropertyName("LæremiddelLeverandør")]
    public string LæremiddelLeverandør { get; set; }

    [XmlElement("Læreplan", Order = 5)]
    [JsonProperty("Læreplan")]
    [JsonPropertyName("Læreplan")]
    public string Læreplan { get; set; }

    [XmlElement("LæreplanKode", Order = 6)]
    [JsonProperty("LæreplanKode")]
    [JsonPropertyName("LæreplanKode")]
    public string LæreplanKode { get; set; }

    [XmlElement("Skolenivå", Order = 7)]
    [JsonProperty("Skolenivå")]
    [JsonPropertyName("Skolenivå")]
    public string Skolenivå { get; set; }

    [XmlElement("Utdanningsprogram", Order = 8)]
    [JsonProperty("Utdanningsprogram")]
    [JsonPropertyName("Utdanningsprogram")]
    public string Utdanningsprogram { get; set; }

    [XmlElement("Programområde", Order = 9)]
    [JsonProperty("Programområde")]
    [JsonPropertyName("Programområde")]
    public string Programområde { get; set; }

    [XmlElement("VurderingsID", Order = 10)]
    [JsonProperty("VurderingsID")]
    [JsonPropertyName("VurderingsID")]
    public string VurderingsID { get; set; }

    [XmlElement("VurderingsFrist", Order = 11)]
    [JsonProperty("VurderingsFrist")]
    [JsonPropertyName("VurderingsFrist")]
    public string VurderingsFrist { get; set; }

    [XmlElement("GruppeVurderingsID", Order = 12)]
    [JsonProperty("GruppeVurderingsID")]
    [JsonPropertyName("GruppeVurderingsID")]
    public string GruppeVurderingsID { get; set; }

    [XmlElement("Navn", Order = 13)]
    [JsonProperty("Navn")]
    [JsonPropertyName("Navn")]
    public string Navn { get; set; }

    [XmlElement("AlleFag", Order = 14)]
    [JsonProperty("AlleFag")]
    [JsonPropertyName("AlleFag")]
    public AlleFag AlleFag { get; set; }

    [XmlElement("Engelsk", Order = 15)]
    [JsonProperty("Engelsk")]
    [JsonPropertyName("Engelsk")]
    public Engelsk Engelsk { get; set; }

    [XmlElement("Matte", Order = 16)]
    [JsonProperty("Matte")]
    [JsonPropertyName("Matte")]
    public Matte Matte { get; set; }

    [XmlElement("Norsk", Order = 17)]
    [JsonProperty("Norsk")]
    [JsonPropertyName("Norsk")]
    public Norsk Norsk { get; set; }

    [XmlElement("OppsummeringsKommentar", Order = 18)]
    [JsonProperty("OppsummeringsKommentar")]
    [JsonPropertyName("OppsummeringsKommentar")]
    public string OppsummeringsKommentar { get; set; }

    [XmlElement("AppLogikk", Order = 19)]
    [JsonProperty("AppLogikk")]
    [JsonPropertyName("AppLogikk")]
    public AppLogikk AppLogikk { get; set; }

  }

  public class AlleFag
  {
    [XmlElement("del1", Order = 1)]
    [JsonProperty("del1")]
    [JsonPropertyName("del1")]
    public Del1_AF del1 { get; set; }

    [XmlElement("del2", Order = 2)]
    [JsonProperty("del2")]
    [JsonPropertyName("del2")]
    public Del2_AF del2 { get; set; }

    [XmlElement("del3", Order = 3)]
    [JsonProperty("del3")]
    [JsonPropertyName("del3")]
    public Del3_AF del3 { get; set; }

  }

  public class Del1_AF
  {
    [XmlElement("onskerIkkeSvare", Order = 1)]
    [JsonProperty("onskerIkkeSvare")]
    [JsonPropertyName("onskerIkkeSvare")]
    public string onskerIkkeSvare { get; set; }

    [XmlElement("paastand1", Order = 2)]
    [JsonProperty("paastand1")]
    [JsonPropertyName("paastand1")]
    public Paastand paastand1 { get; set; }

    [XmlElement("paastand2", Order = 3)]
    [JsonProperty("paastand2")]
    [JsonPropertyName("paastand2")]
    public Paastand paastand2 { get; set; }

    [XmlElement("paastand3", Order = 4)]
    [JsonProperty("paastand3")]
    [JsonPropertyName("paastand3")]
    public Paastand paastand3 { get; set; }

    [XmlElement("paastand4", Order = 5)]
    [JsonProperty("paastand4")]
    [JsonPropertyName("paastand4")]
    public Paastand paastand4 { get; set; }

  }

  public class Paastand
  {
    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("svar", Order = 1)]
    [JsonProperty("svar")]
    [JsonPropertyName("svar")]
    [Required]
    public decimal? svar { get; set; }

    [XmlElement("kommentar", Order = 2)]
    [JsonProperty("kommentar")]
    [JsonPropertyName("kommentar")]
    public string kommentar { get; set; }

    [XmlElement("valgtBortForGruppe", Order = 3)]
    [JsonProperty("valgtBortForGruppe")]
    [JsonPropertyName("valgtBortForGruppe")]
    public string valgtBortForGruppe { get; set; }

  }

  public class Del2_AF
  {
    [XmlElement("onskerIkkeSvare", Order = 1)]
    [JsonProperty("onskerIkkeSvare")]
    [JsonPropertyName("onskerIkkeSvare")]
    public string onskerIkkeSvare { get; set; }

    [XmlElement("paastand1", Order = 2)]
    [JsonProperty("paastand1")]
    [JsonPropertyName("paastand1")]
    public Paastand paastand1 { get; set; }

    [XmlElement("paastand2", Order = 3)]
    [JsonProperty("paastand2")]
    [JsonPropertyName("paastand2")]
    public Paastand paastand2 { get; set; }

    [XmlElement("paastand3", Order = 4)]
    [JsonProperty("paastand3")]
    [JsonPropertyName("paastand3")]
    public Paastand paastand3 { get; set; }

    [XmlElement("paastand4", Order = 5)]
    [JsonProperty("paastand4")]
    [JsonPropertyName("paastand4")]
    public Paastand paastand4 { get; set; }

    [XmlElement("paastand5", Order = 6)]
    [JsonProperty("paastand5")]
    [JsonPropertyName("paastand5")]
    public Paastand paastand5 { get; set; }

    [XmlElement("paastand6", Order = 7)]
    [JsonProperty("paastand6")]
    [JsonPropertyName("paastand6")]
    public Paastand paastand6 { get; set; }

  }

  public class Del3_AF
  {
    [XmlElement("onskerIkkeSvare", Order = 1)]
    [JsonProperty("onskerIkkeSvare")]
    [JsonPropertyName("onskerIkkeSvare")]
    public string onskerIkkeSvare { get; set; }

    [XmlElement("paastand1", Order = 2)]
    [JsonProperty("paastand1")]
    [JsonPropertyName("paastand1")]
    public Paastand paastand1 { get; set; }

    [XmlElement("paastand2", Order = 3)]
    [JsonProperty("paastand2")]
    [JsonPropertyName("paastand2")]
    public Paastand paastand2 { get; set; }

    [XmlElement("paastand3", Order = 4)]
    [JsonProperty("paastand3")]
    [JsonPropertyName("paastand3")]
    public Paastand paastand3 { get; set; }

    [XmlElement("paastand4", Order = 5)]
    [JsonProperty("paastand4")]
    [JsonPropertyName("paastand4")]
    public Paastand paastand4 { get; set; }

    [XmlElement("paastand5", Order = 6)]
    [JsonProperty("paastand5")]
    [JsonPropertyName("paastand5")]
    public Paastand paastand5 { get; set; }

    [XmlElement("paastand6", Order = 7)]
    [JsonProperty("paastand6")]
    [JsonPropertyName("paastand6")]
    public Paastand paastand6 { get; set; }

    [XmlElement("paastand7", Order = 8)]
    [JsonProperty("paastand7")]
    [JsonPropertyName("paastand7")]
    public Paastand paastand7 { get; set; }

    [XmlElement("paastand8", Order = 9)]
    [JsonProperty("paastand8")]
    [JsonPropertyName("paastand8")]
    public Paastand paastand8 { get; set; }

  }

  public class Engelsk
  {
    [XmlElement("del1", Order = 1)]
    [JsonProperty("del1")]
    [JsonPropertyName("del1")]
    public Del1_En del1 { get; set; }

    [XmlElement("del2", Order = 2)]
    [JsonProperty("del2")]
    [JsonPropertyName("del2")]
    public Del2_En del2 { get; set; }

    [XmlElement("del3", Order = 3)]
    [JsonProperty("del3")]
    [JsonPropertyName("del3")]
    public Del3_En del3 { get; set; }

  }

  public class Del1_En
  {
    [XmlElement("paastand1", Order = 1)]
    [JsonProperty("paastand1")]
    [JsonPropertyName("paastand1")]
    public Paastand paastand1 { get; set; }

    [XmlElement("paastand2", Order = 2)]
    [JsonProperty("paastand2")]
    [JsonPropertyName("paastand2")]
    public Paastand paastand2 { get; set; }

    [XmlElement("paastand3", Order = 3)]
    [JsonProperty("paastand3")]
    [JsonPropertyName("paastand3")]
    public Paastand paastand3 { get; set; }

    [XmlElement("paastand4", Order = 4)]
    [JsonProperty("paastand4")]
    [JsonPropertyName("paastand4")]
    public Paastand paastand4 { get; set; }

    [XmlElement("paastand5", Order = 5)]
    [JsonProperty("paastand5")]
    [JsonPropertyName("paastand5")]
    public Paastand paastand5 { get; set; }

    [XmlElement("paastand6", Order = 6)]
    [JsonProperty("paastand6")]
    [JsonPropertyName("paastand6")]
    public Paastand paastand6 { get; set; }

    [XmlElement("paastand7", Order = 7)]
    [JsonProperty("paastand7")]
    [JsonPropertyName("paastand7")]
    public Paastand paastand7 { get; set; }

    [XmlElement("paastand8", Order = 8)]
    [JsonProperty("paastand8")]
    [JsonPropertyName("paastand8")]
    public Paastand paastand8 { get; set; }

    [XmlElement("paastand9", Order = 9)]
    [JsonProperty("paastand9")]
    [JsonPropertyName("paastand9")]
    public Paastand paastand9 { get; set; }

    [XmlElement("paastand10", Order = 10)]
    [JsonProperty("paastand10")]
    [JsonPropertyName("paastand10")]
    public Paastand paastand10 { get; set; }

    [XmlElement("paastand11", Order = 11)]
    [JsonProperty("paastand11")]
    [JsonPropertyName("paastand11")]
    public Paastand paastand11 { get; set; }

    [XmlElement("paastand12", Order = 12)]
    [JsonProperty("paastand12")]
    [JsonPropertyName("paastand12")]
    public Paastand paastand12 { get; set; }

  }

  public class Del2_En
  {
    [XmlElement("paastand1", Order = 1)]
    [JsonProperty("paastand1")]
    [JsonPropertyName("paastand1")]
    public Paastand paastand1 { get; set; }

    [XmlElement("paastand2", Order = 2)]
    [JsonProperty("paastand2")]
    [JsonPropertyName("paastand2")]
    public Paastand paastand2 { get; set; }

    [XmlElement("paastand3", Order = 3)]
    [JsonProperty("paastand3")]
    [JsonPropertyName("paastand3")]
    public Paastand paastand3 { get; set; }

    [XmlElement("paastand4", Order = 4)]
    [JsonProperty("paastand4")]
    [JsonPropertyName("paastand4")]
    public Paastand paastand4 { get; set; }

    [XmlElement("paastand5", Order = 5)]
    [JsonProperty("paastand5")]
    [JsonPropertyName("paastand5")]
    public Paastand paastand5 { get; set; }

    [XmlElement("paastand6", Order = 6)]
    [JsonProperty("paastand6")]
    [JsonPropertyName("paastand6")]
    public Paastand paastand6 { get; set; }

    [XmlElement("paastand7", Order = 7)]
    [JsonProperty("paastand7")]
    [JsonPropertyName("paastand7")]
    public Paastand paastand7 { get; set; }

    [XmlElement("paastand8", Order = 8)]
    [JsonProperty("paastand8")]
    [JsonPropertyName("paastand8")]
    public Paastand paastand8 { get; set; }

    [XmlElement("paastand9", Order = 9)]
    [JsonProperty("paastand9")]
    [JsonPropertyName("paastand9")]
    public Paastand paastand9 { get; set; }

    [XmlElement("paastand10", Order = 10)]
    [JsonProperty("paastand10")]
    [JsonPropertyName("paastand10")]
    public Paastand paastand10 { get; set; }

    [XmlElement("paastand11", Order = 11)]
    [JsonProperty("paastand11")]
    [JsonPropertyName("paastand11")]
    public Paastand paastand11 { get; set; }

    [XmlElement("paastand12", Order = 12)]
    [JsonProperty("paastand12")]
    [JsonPropertyName("paastand12")]
    public Paastand paastand12 { get; set; }

    [XmlElement("paastand13", Order = 13)]
    [JsonProperty("paastand13")]
    [JsonPropertyName("paastand13")]
    public Paastand paastand13 { get; set; }

    [XmlElement("paastand14", Order = 14)]
    [JsonProperty("paastand14")]
    [JsonPropertyName("paastand14")]
    public Paastand paastand14 { get; set; }

  }

  public class Del3_En
  {
    [XmlElement("paastand1", Order = 1)]
    [JsonProperty("paastand1")]
    [JsonPropertyName("paastand1")]
    public Paastand paastand1 { get; set; }

    [XmlElement("paastand2", Order = 2)]
    [JsonProperty("paastand2")]
    [JsonPropertyName("paastand2")]
    public Paastand paastand2 { get; set; }

    [XmlElement("paastand3", Order = 3)]
    [JsonProperty("paastand3")]
    [JsonPropertyName("paastand3")]
    public Paastand paastand3 { get; set; }

    [XmlElement("paastand4", Order = 4)]
    [JsonProperty("paastand4")]
    [JsonPropertyName("paastand4")]
    public Paastand paastand4 { get; set; }

  }

  public class Matte
  {
    [XmlElement("del1", Order = 1)]
    [JsonProperty("del1")]
    [JsonPropertyName("del1")]
    public Del1_Ma del1 { get; set; }

    [XmlElement("del2", Order = 2)]
    [JsonProperty("del2")]
    [JsonPropertyName("del2")]
    public Del2_Ma del2 { get; set; }

    [XmlElement("del3", Order = 3)]
    [JsonProperty("del3")]
    [JsonPropertyName("del3")]
    public Del3_Ma del3 { get; set; }

  }

  public class Del1_Ma
  {
    [XmlElement("paastand1", Order = 1)]
    [JsonProperty("paastand1")]
    [JsonPropertyName("paastand1")]
    public Paastand paastand1 { get; set; }

    [XmlElement("paastand2", Order = 2)]
    [JsonProperty("paastand2")]
    [JsonPropertyName("paastand2")]
    public Paastand paastand2 { get; set; }

    [XmlElement("paastand3", Order = 3)]
    [JsonProperty("paastand3")]
    [JsonPropertyName("paastand3")]
    public Paastand paastand3 { get; set; }

    [XmlElement("paastand4", Order = 4)]
    [JsonProperty("paastand4")]
    [JsonPropertyName("paastand4")]
    public Paastand paastand4 { get; set; }

    [XmlElement("paastand5", Order = 5)]
    [JsonProperty("paastand5")]
    [JsonPropertyName("paastand5")]
    public Paastand paastand5 { get; set; }

    [XmlElement("paastand6", Order = 6)]
    [JsonProperty("paastand6")]
    [JsonPropertyName("paastand6")]
    public Paastand paastand6 { get; set; }

    [XmlElement("paastand7", Order = 7)]
    [JsonProperty("paastand7")]
    [JsonPropertyName("paastand7")]
    public Paastand paastand7 { get; set; }

  }

  public class Del2_Ma
  {
    [XmlElement("paastand1", Order = 1)]
    [JsonProperty("paastand1")]
    [JsonPropertyName("paastand1")]
    public Paastand paastand1 { get; set; }

    [XmlElement("paastand2", Order = 2)]
    [JsonProperty("paastand2")]
    [JsonPropertyName("paastand2")]
    public Paastand paastand2 { get; set; }

    [XmlElement("paastand3", Order = 3)]
    [JsonProperty("paastand3")]
    [JsonPropertyName("paastand3")]
    public Paastand paastand3 { get; set; }

    [XmlElement("paastand4", Order = 4)]
    [JsonProperty("paastand4")]
    [JsonPropertyName("paastand4")]
    public Paastand paastand4 { get; set; }

    [XmlElement("paastand5", Order = 5)]
    [JsonProperty("paastand5")]
    [JsonPropertyName("paastand5")]
    public Paastand paastand5 { get; set; }

    [XmlElement("paastand6", Order = 6)]
    [JsonProperty("paastand6")]
    [JsonPropertyName("paastand6")]
    public Paastand paastand6 { get; set; }

  }

  public class Del3_Ma
  {
    [XmlElement("paastand1", Order = 1)]
    [JsonProperty("paastand1")]
    [JsonPropertyName("paastand1")]
    public Paastand paastand1 { get; set; }

    [XmlElement("paastand2", Order = 2)]
    [JsonProperty("paastand2")]
    [JsonPropertyName("paastand2")]
    public Paastand paastand2 { get; set; }

    [XmlElement("paastand3", Order = 3)]
    [JsonProperty("paastand3")]
    [JsonPropertyName("paastand3")]
    public Paastand paastand3 { get; set; }

    [XmlElement("paastand4", Order = 4)]
    [JsonProperty("paastand4")]
    [JsonPropertyName("paastand4")]
    public Paastand paastand4 { get; set; }

    [XmlElement("paastand5", Order = 5)]
    [JsonProperty("paastand5")]
    [JsonPropertyName("paastand5")]
    public Paastand paastand5 { get; set; }

    [XmlElement("paastand6", Order = 6)]
    [JsonProperty("paastand6")]
    [JsonPropertyName("paastand6")]
    public Paastand paastand6 { get; set; }

    [XmlElement("paastand7", Order = 7)]
    [JsonProperty("paastand7")]
    [JsonPropertyName("paastand7")]
    public Paastand paastand7 { get; set; }

    [XmlElement("paastand8", Order = 8)]
    [JsonProperty("paastand8")]
    [JsonPropertyName("paastand8")]
    public Paastand paastand8 { get; set; }

    [XmlElement("paastand9", Order = 9)]
    [JsonProperty("paastand9")]
    [JsonPropertyName("paastand9")]
    public Paastand paastand9 { get; set; }

    [XmlElement("paastand10", Order = 10)]
    [JsonProperty("paastand10")]
    [JsonPropertyName("paastand10")]
    public Paastand paastand10 { get; set; }

    [XmlElement("paastand11", Order = 11)]
    [JsonProperty("paastand11")]
    [JsonPropertyName("paastand11")]
    public Paastand paastand11 { get; set; }

  }

  public class Norsk
  {
    [XmlElement("del1", Order = 1)]
    [JsonProperty("del1")]
    [JsonPropertyName("del1")]
    public Del1_No del1 { get; set; }

    [XmlElement("del2", Order = 2)]
    [JsonProperty("del2")]
    [JsonPropertyName("del2")]
    public Del2_No del2 { get; set; }

    [XmlElement("del3", Order = 3)]
    [JsonProperty("del3")]
    [JsonPropertyName("del3")]
    public Del3_No del3 { get; set; }

  }

  public class Del1_No
  {
    [XmlElement("paastand1", Order = 1)]
    [JsonProperty("paastand1")]
    [JsonPropertyName("paastand1")]
    public Paastand paastand1 { get; set; }

    [XmlElement("paastand2", Order = 2)]
    [JsonProperty("paastand2")]
    [JsonPropertyName("paastand2")]
    public Paastand paastand2 { get; set; }

    [XmlElement("paastand3", Order = 3)]
    [JsonProperty("paastand3")]
    [JsonPropertyName("paastand3")]
    public Paastand paastand3 { get; set; }

    [XmlElement("paastand4", Order = 4)]
    [JsonProperty("paastand4")]
    [JsonPropertyName("paastand4")]
    public Paastand paastand4 { get; set; }

    [XmlElement("paastand5", Order = 5)]
    [JsonProperty("paastand5")]
    [JsonPropertyName("paastand5")]
    public Paastand paastand5 { get; set; }

    [XmlElement("paastand6", Order = 6)]
    [JsonProperty("paastand6")]
    [JsonPropertyName("paastand6")]
    public Paastand paastand6 { get; set; }

    [XmlElement("paastand7", Order = 7)]
    [JsonProperty("paastand7")]
    [JsonPropertyName("paastand7")]
    public Paastand paastand7 { get; set; }

    [XmlElement("paastand8", Order = 8)]
    [JsonProperty("paastand8")]
    [JsonPropertyName("paastand8")]
    public Paastand paastand8 { get; set; }

    [XmlElement("paastand9", Order = 9)]
    [JsonProperty("paastand9")]
    [JsonPropertyName("paastand9")]
    public Paastand paastand9 { get; set; }

    [XmlElement("paastand10", Order = 10)]
    [JsonProperty("paastand10")]
    [JsonPropertyName("paastand10")]
    public Paastand paastand10 { get; set; }

    [XmlElement("paastand11", Order = 11)]
    [JsonProperty("paastand11")]
    [JsonPropertyName("paastand11")]
    public Paastand paastand11 { get; set; }

    [XmlElement("paastand12", Order = 12)]
    [JsonProperty("paastand12")]
    [JsonPropertyName("paastand12")]
    public Paastand paastand12 { get; set; }

    [XmlElement("paastand13", Order = 13)]
    [JsonProperty("paastand13")]
    [JsonPropertyName("paastand13")]
    public Paastand paastand13 { get; set; }

    [XmlElement("paastand14", Order = 14)]
    [JsonProperty("paastand14")]
    [JsonPropertyName("paastand14")]
    public Paastand paastand14 { get; set; }

  }

  public class Del2_No
  {
    [XmlElement("paastand1", Order = 1)]
    [JsonProperty("paastand1")]
    [JsonPropertyName("paastand1")]
    public Paastand paastand1 { get; set; }

    [XmlElement("paastand2", Order = 2)]
    [JsonProperty("paastand2")]
    [JsonPropertyName("paastand2")]
    public Paastand paastand2 { get; set; }

    [XmlElement("paastand3", Order = 3)]
    [JsonProperty("paastand3")]
    [JsonPropertyName("paastand3")]
    public Paastand paastand3 { get; set; }

    [XmlElement("paastand4", Order = 4)]
    [JsonProperty("paastand4")]
    [JsonPropertyName("paastand4")]
    public Paastand paastand4 { get; set; }

  }

  public class Del3_No
  {
    [XmlElement("paastand1", Order = 1)]
    [JsonProperty("paastand1")]
    [JsonPropertyName("paastand1")]
    public Paastand paastand1 { get; set; }

    [XmlElement("paastand2", Order = 2)]
    [JsonProperty("paastand2")]
    [JsonPropertyName("paastand2")]
    public Paastand paastand2 { get; set; }

    [XmlElement("paastand3", Order = 3)]
    [JsonProperty("paastand3")]
    [JsonPropertyName("paastand3")]
    public Paastand paastand3 { get; set; }

    [XmlElement("paastand4", Order = 4)]
    [JsonProperty("paastand4")]
    [JsonPropertyName("paastand4")]
    public Paastand paastand4 { get; set; }

    [XmlElement("paastand5", Order = 5)]
    [JsonProperty("paastand5")]
    [JsonPropertyName("paastand5")]
    public Paastand paastand5 { get; set; }

  }

  public class AppLogikk
  {
    [XmlElement("godtarVilkaar", Order = 1)]
    [JsonProperty("godtarVilkaar")]
    [JsonPropertyName("godtarVilkaar")]
    public string godtarVilkaar { get; set; }

    [XmlElement("valgtBortPaastandFlagg", Order = 2)]
    [JsonProperty("valgtBortPaastandFlagg")]
    [JsonPropertyName("valgtBortPaastandFlagg")]
    public string valgtBortPaastandFlagg { get; set; }

  }
}
