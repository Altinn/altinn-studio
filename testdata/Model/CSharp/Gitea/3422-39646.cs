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
  public class RR0010U_M
  {
    [XmlAttribute("dataFormatProvider")]
    [BindNever]
    public string dataFormatProvider { get; set; } = "SERES";

    [XmlAttribute("dataFormatId")]
    [BindNever]
    public string dataFormatId { get; set; } = "3422";

    [XmlAttribute("dataFormatVersion")]
    [BindNever]
    public string dataFormatVersion { get; set; } = "48706";

    [XmlElement("Rapport-RR0010U", Order = 1)]
    [JsonProperty("Rapport-RR0010U")]
    [JsonPropertyName("Rapport-RR0010U")]
    public RapportRR0010U RapportRR0010U { get; set; }

    [XmlElement("Skjemainnhold", Order = 2)]
    [JsonProperty("Skjemainnhold")]
    [JsonPropertyName("Skjemainnhold")]
    public Skjemainnhold Skjemainnhold { get; set; }

  }

  public class RapportRR0010U
  {
    [XmlElement("aarsregnskap", Order = 1)]
    [JsonProperty("aarsregnskap")]
    [JsonPropertyName("aarsregnskap")]
    public Aarsregnskap aarsregnskap { get; set; }

  }

  public class Aarsregnskap
  {
    [XmlElement("type", Order = 1)]
    [JsonProperty("type")]
    [JsonPropertyName("type")]
    public ArsregnskapType25942 type { get; set; }

    public bool ShouldSerializetype() => type?.value is not null;

    [XmlElement("valuta", Order = 2)]
    [JsonProperty("valuta")]
    [JsonPropertyName("valuta")]
    public ArsregnskapValutakode34984 valuta { get; set; }

    public bool ShouldSerializevaluta() => valuta?.value is not null;

    [XmlElement("valoer", Order = 3)]
    [JsonProperty("valoer")]
    [JsonPropertyName("valoer")]
    public ArsregnskapValor28974 valoer { get; set; }

    public bool ShouldSerializevaloer() => valoer?.value is not null;

  }

  public class ArsregnskapType25942
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "25942";

  }

  public class ArsregnskapValutakode34984
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "34984";

  }

  public class ArsregnskapValor28974
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "28974";

  }

  public class Skjemainnhold
  {
    [XmlElement("resultatregnskapAktivitetsbasert", Order = 1)]
    [JsonProperty("resultatregnskapAktivitetsbasert")]
    [JsonPropertyName("resultatregnskapAktivitetsbasert")]
    public ResultatregnskapAktivitetsbasert resultatregnskapAktivitetsbasert { get; set; }

    [XmlElement("balanseEiendelerAnleggsmidler", Order = 2)]
    [JsonProperty("balanseEiendelerAnleggsmidler")]
    [JsonPropertyName("balanseEiendelerAnleggsmidler")]
    public BalanseEiendelerAnleggsmidler balanseEiendelerAnleggsmidler { get; set; }

    [XmlElement("balanseEiendelerOmloepsmidler", Order = 3)]
    [JsonProperty("balanseEiendelerOmloepsmidler")]
    [JsonPropertyName("balanseEiendelerOmloepsmidler")]
    public BalanseEiendelerOmloepsmidler balanseEiendelerOmloepsmidler { get; set; }

    [XmlElement("balanseFormaalskapital", Order = 4)]
    [JsonProperty("balanseFormaalskapital")]
    [JsonPropertyName("balanseFormaalskapital")]
    public BalanseFormaalskapital balanseFormaalskapital { get; set; }

    [XmlElement("balanseGjeld", Order = 5)]
    [JsonProperty("balanseGjeld")]
    [JsonPropertyName("balanseGjeld")]
    public BalanseGjeld balanseGjeld { get; set; }

    [XmlElement("posterUtenomBalansen", Order = 6)]
    [JsonProperty("posterUtenomBalansen")]
    [JsonPropertyName("posterUtenomBalansen")]
    public PosterUtenomBalansen posterUtenomBalansen { get; set; }

  }

  public class ResultatregnskapAktivitetsbasert
  {
    [XmlElement("anskaffedeMidler", Order = 1)]
    [JsonProperty("anskaffedeMidler")]
    [JsonPropertyName("anskaffedeMidler")]
    public AnskaffedeMidler anskaffedeMidler { get; set; }

    [XmlElement("forbrukteMidler", Order = 2)]
    [JsonProperty("forbrukteMidler")]
    [JsonPropertyName("forbrukteMidler")]
    public ForbrukteMidler forbrukteMidler { get; set; }

    [XmlElement("aarsresultat", Order = 3)]
    [JsonProperty("aarsresultat")]
    [JsonPropertyName("aarsresultat")]
    public Aarsresultat aarsresultat { get; set; }

    [XmlElement("tilleggReduksjonEgenkapital", Order = 4)]
    [JsonProperty("tilleggReduksjonEgenkapital")]
    [JsonPropertyName("tilleggReduksjonEgenkapital")]
    public TilleggReduksjonEgenkapital tilleggReduksjonEgenkapital { get; set; }

  }

  public class AnskaffedeMidler
  {
    [XmlElement("medlemsinntekter", Order = 1)]
    [JsonProperty("medlemsinntekter")]
    [JsonPropertyName("medlemsinntekter")]
    public Medlemsinntekter medlemsinntekter { get; set; }

    [XmlElement("offentligeTilskudd", Order = 2)]
    [JsonProperty("offentligeTilskudd")]
    [JsonPropertyName("offentligeTilskudd")]
    public OffentligeTilskudd offentligeTilskudd { get; set; }

    [XmlElement("andreTilskudd", Order = 3)]
    [JsonProperty("andreTilskudd")]
    [JsonPropertyName("andreTilskudd")]
    public AndreTilskudd andreTilskudd { get; set; }

    [XmlElement("sumTilskudd", Order = 4)]
    [JsonProperty("sumTilskudd")]
    [JsonPropertyName("sumTilskudd")]
    public SumTilskudd sumTilskudd { get; set; }

    [XmlElement("innsamledeMidlerGaverMv", Order = 5)]
    [JsonProperty("innsamledeMidlerGaverMv")]
    [JsonPropertyName("innsamledeMidlerGaverMv")]
    public InnsamledeMidlerGaverMv innsamledeMidlerGaverMv { get; set; }

    [XmlElement("aktiviteterOppfyllerOrgFormaal", Order = 6)]
    [JsonProperty("aktiviteterOppfyllerOrgFormaal")]
    [JsonPropertyName("aktiviteterOppfyllerOrgFormaal")]
    public AktiviteterOppfyllerOrgFormaal aktiviteterOppfyllerOrgFormaal { get; set; }

    [XmlElement("aktiviteterSkaperInntekt", Order = 7)]
    [JsonProperty("aktiviteterSkaperInntekt")]
    [JsonPropertyName("aktiviteterSkaperInntekt")]
    public AktiviteterSkaperInntekt aktiviteterSkaperInntekt { get; set; }

    [XmlElement("opptjenteInntekterOperasjonelleAktiviteter", Order = 8)]
    [JsonProperty("opptjenteInntekterOperasjonelleAktiviteter")]
    [JsonPropertyName("opptjenteInntekterOperasjonelleAktiviteter")]
    public OpptjenteInntekterOperasjonelleAktiviteter opptjenteInntekterOperasjonelleAktiviteter { get; set; }

    [XmlElement("annenDriftsinntekt", Order = 9)]
    [JsonProperty("annenDriftsinntekt")]
    [JsonPropertyName("annenDriftsinntekt")]
    public AnnenDriftsinntekt annenDriftsinntekt { get; set; }

    [XmlElement("finansOgInvesteringsinntekter", Order = 10)]
    [JsonProperty("finansOgInvesteringsinntekter")]
    [JsonPropertyName("finansOgInvesteringsinntekter")]
    public FinansOgInvesteringsinntekter finansOgInvesteringsinntekter { get; set; }

    [XmlElement("andreInntekter", Order = 11)]
    [JsonProperty("andreInntekter")]
    [JsonPropertyName("andreInntekter")]
    public AndreInntekter andreInntekter { get; set; }

    [XmlElement("sumAnskaffedeMidler", Order = 12)]
    [JsonProperty("sumAnskaffedeMidler")]
    [JsonPropertyName("sumAnskaffedeMidler")]
    public SumAnskaffedeMidler sumAnskaffedeMidler { get; set; }

  }

  public class Medlemsinntekter
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteMedlemsinntekter30319 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public Medlemsinntekter30320 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public MedlemsinntekterFjoraret30321 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteMedlemsinntekter30319
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30319";

  }

  public class Medlemsinntekter30320
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30320";

  }

  public class MedlemsinntekterFjoraret30321
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30321";

  }

  public class OffentligeTilskudd
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteTilskuddOffentlig33418 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public TilskuddOffentlig33419 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public TilskuddOffentligFjoraret33420 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteTilskuddOffentlig33418
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33418";

  }

  public class TilskuddOffentlig33419
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33419";

  }

  public class TilskuddOffentligFjoraret33420
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33420";

  }

  public class AndreTilskudd
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteTilskuddAndre33421 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public TilskuddAndre33422 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public TilskuddAndreFjoraret33423 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteTilskuddAndre33421
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33421";

  }

  public class TilskuddAndre33422
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33422";

  }

  public class TilskuddAndreFjoraret33423
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33423";

  }

  public class SumTilskudd
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteTilskudd30310 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public TilskuddOffentlig30311 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public TilskuddOffentligFjoraret30312 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteTilskudd30310
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30310";

  }

  public class TilskuddOffentlig30311
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30311";

  }

  public class TilskuddOffentligFjoraret30312
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30312";

  }

  public class InnsamledeMidlerGaverMv
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteMidlerGaverInnsamlede30313 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public MidlerGaverInnsamlede30314 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public MidlerGaverInnsamledeFjoraret30315 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteMidlerGaverInnsamlede30313
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30313";

  }

  public class MidlerGaverInnsamlede30314
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30314";

  }

  public class MidlerGaverInnsamledeFjoraret30315
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30315";

  }

  public class AktiviteterOppfyllerOrgFormaal
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteAktiviteterOppfyllerOrganisasjonensFormal33424 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public AktiviteterOppfyllerOrganisasjonensFormal33425 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public AktiviteterOppfyllerOrganisasjonensFormalFjoraret33426 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteAktiviteterOppfyllerOrganisasjonensFormal33424
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33424";

  }

  public class AktiviteterOppfyllerOrganisasjonensFormal33425
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33425";

  }

  public class AktiviteterOppfyllerOrganisasjonensFormalFjoraret33426
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33426";

  }

  public class AktiviteterSkaperInntekt
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteAktiviteterSkaperInntekt33427 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public AktiviteterSkaperInntekt33428 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public AktiviteterSkaperInntektFjoraret33429 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteAktiviteterSkaperInntekt33427
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33427";

  }

  public class AktiviteterSkaperInntekt33428
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33428";

  }

  public class AktiviteterSkaperInntektFjoraret33429
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33429";

  }

  public class OpptjenteInntekterOperasjonelleAktiviteter
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteAktiviteterOperasjonelle33430 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public AktiviteterOperasjonelle33431 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public AktiviteterOperasjonelleFjoraret33432 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteAktiviteterOperasjonelle33430
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33430";

  }

  public class AktiviteterOperasjonelle33431
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33431";

  }

  public class AktiviteterOperasjonelleFjoraret33432
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33432";

  }

  public class AnnenDriftsinntekt
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteDriftsinntekterAndreSum18238 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public DriftsinntekterAndreSum7709 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public DriftsinntekterAndreFjoraretSum7966 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteDriftsinntekterAndreSum18238
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18238";

  }

  public class DriftsinntekterAndreSum7709
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7709";

  }

  public class DriftsinntekterAndreFjoraretSum7966
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7966";

  }

  public class FinansOgInvesteringsinntekter
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFinansinntekterInvesteringsinntekter33433 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FinansinntekterInvesteringsinntekter33434 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FinansinntekterInvesteringsinntekterFjoraret33435 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFinansinntekterInvesteringsinntekter33433
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33433";

  }

  public class FinansinntekterInvesteringsinntekter33434
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33434";

  }

  public class FinansinntekterInvesteringsinntekterFjoraret33435
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33435";

  }

  public class AndreInntekter
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteInntektAnnen30307 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public InntektAnnen30308 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public InntektAnnenFjoraret30309 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteInntektAnnen30307
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30307";

  }

  public class InntektAnnen30308
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30308";

  }

  public class InntektAnnenFjoraret30309
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30309";

  }

  public class SumAnskaffedeMidler
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteMidlerAnskaffede30316 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public MidlerAnskaffede30317 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public MidlerAnskaffedeFjoraret30318 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteMidlerAnskaffede30316
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30316";

  }

  public class MidlerAnskaffede30317
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30317";

  }

  public class MidlerAnskaffedeFjoraret30318
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30318";

  }

  public class ForbrukteMidler
  {
    [XmlElement("kostnadAnskaffelseMidler", Order = 1)]
    [JsonProperty("kostnadAnskaffelseMidler")]
    [JsonPropertyName("kostnadAnskaffelseMidler")]
    public KostnadAnskaffelseMidler kostnadAnskaffelseMidler { get; set; }

    [XmlElement("tilskuddBevilningOppfyllelseOrgFormaal", Order = 2)]
    [JsonProperty("tilskuddBevilningOppfyllelseOrgFormaal")]
    [JsonPropertyName("tilskuddBevilningOppfyllelseOrgFormaal")]
    public TilskuddBevilningOppfyllelseOrgFormaal tilskuddBevilningOppfyllelseOrgFormaal { get; set; }

    [XmlElement("kostnaderOppfyllelseOrgFormaal", Order = 3)]
    [JsonProperty("kostnaderOppfyllelseOrgFormaal")]
    [JsonPropertyName("kostnaderOppfyllelseOrgFormaal")]
    public KostnaderOppfyllelseOrgFormaal kostnaderOppfyllelseOrgFormaal { get; set; }

    [XmlElement("kostnaderOrgFormaal", Order = 4)]
    [JsonProperty("kostnaderOrgFormaal")]
    [JsonPropertyName("kostnaderOrgFormaal")]
    public KostnaderOrgFormaal kostnaderOrgFormaal { get; set; }

    [XmlElement("annenRentekostnad", Order = 5)]
    [JsonProperty("annenRentekostnad")]
    [JsonPropertyName("annenRentekostnad")]
    public AnnenRentekostnad annenRentekostnad { get; set; }

    [XmlElement("annenFinanskostnad", Order = 6)]
    [JsonProperty("annenFinanskostnad")]
    [JsonPropertyName("annenFinanskostnad")]
    public AnnenFinanskostnad annenFinanskostnad { get; set; }

    [XmlElement("administrasjonskostnader", Order = 7)]
    [JsonProperty("administrasjonskostnader")]
    [JsonPropertyName("administrasjonskostnader")]
    public Administrasjonskostnader administrasjonskostnader { get; set; }

    [XmlElement("annenDriftskostnad", Order = 8)]
    [JsonProperty("annenDriftskostnad")]
    [JsonPropertyName("annenDriftskostnad")]
    public AnnenDriftskostnad annenDriftskostnad { get; set; }

    [XmlElement("sumForbrukteMidler", Order = 9)]
    [JsonProperty("sumForbrukteMidler")]
    [JsonPropertyName("sumForbrukteMidler")]
    public SumForbrukteMidler sumForbrukteMidler { get; set; }

  }

  public class KostnadAnskaffelseMidler
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteKostnadAnskaffelseAvMidler30806 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public KostnadAnskaffelseAvMidler30807 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public KostnadAnskaffelseAvMidlerFjoraret30808 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteKostnadAnskaffelseAvMidler30806
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30806";

  }

  public class KostnadAnskaffelseAvMidler30807
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30807";

  }

  public class KostnadAnskaffelseAvMidlerFjoraret30808
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30808";

  }

  public class TilskuddBevilningOppfyllelseOrgFormaal
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteTilskuddBevilningOppfyllelseOrganisasjonensFormal33436 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public TilskuddBevilningOppfyllelseOrganisasjonensFormal33437 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public TilskuddBevilningOppfyllelseOrganisasjonensFormalFjoraret33438 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteTilskuddBevilningOppfyllelseOrganisasjonensFormal33436
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33436";

  }

  public class TilskuddBevilningOppfyllelseOrganisasjonensFormal33437
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33437";

  }

  public class TilskuddBevilningOppfyllelseOrganisasjonensFormalFjoraret33438
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33438";

  }

  public class KostnaderOppfyllelseOrgFormaal
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteKostnaderOppfyllelseOrganisasjonensFormal33439 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public KostnaderOppfyllelseOrganisasjonensFormal33440 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public KostnaderOppfyllelseOrganisasjonensFormalFjoraret33441 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteKostnaderOppfyllelseOrganisasjonensFormal33439
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33439";

  }

  public class KostnaderOppfyllelseOrganisasjonensFormal33440
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33440";

  }

  public class KostnaderOppfyllelseOrganisasjonensFormalFjoraret33441
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33441";

  }

  public class KostnaderOrgFormaal
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteKostnadOrganisasjonensFormal30809 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public KostnadOrganisasjonensFormal30810 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public KostnadOrganisasjonensFormalFjoraret30811 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteKostnadOrganisasjonensFormal30809
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30809";

  }

  public class KostnadOrganisasjonensFormal30810
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30810";

  }

  public class KostnadOrganisasjonensFormalFjoraret30811
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30811";

  }

  public class AnnenRentekostnad
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteRentekostnaderAndre18550 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public RentekostnaderAndre2216 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public RentekostnaderAndreFjoraret7039 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteRentekostnaderAndre18550
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18550";

  }

  public class RentekostnaderAndre2216
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "2216";

  }

  public class RentekostnaderAndreFjoraret7039
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7039";

  }

  public class AnnenFinanskostnad
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFinanskostnaderAndre18337 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FinanskostnaderAndre156 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FinanskostnaderAndreFjoraret7041 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFinanskostnaderAndre18337
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18337";

  }

  public class FinanskostnaderAndre156
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "156";

  }

  public class FinanskostnaderAndreFjoraret7041
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7041";

  }

  public class Administrasjonskostnader
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteKostnaderAdministrative27924 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public KostnaderAdministrative27926 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public KostnaderAdministrativeFjoraret27928 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteKostnaderAdministrative27924
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "27924";

  }

  public class KostnaderAdministrative27926
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "27926";

  }

  public class KostnaderAdministrativeFjoraret27928
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "27928";

  }

  public class AnnenDriftskostnad
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteDriftskostnaderAndre18249 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public DriftskostnaderAndre82 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public DriftskostnaderAndreFjoraret7023 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteDriftskostnaderAndre18249
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18249";

  }

  public class DriftskostnaderAndre82
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "82";

  }

  public class DriftskostnaderAndreFjoraret7023
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7023";

  }

  public class SumForbrukteMidler
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteMidlerForbrukte30812 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public MidlerForbrukte30813 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public MidlerForbrukteFjoraret30814 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteMidlerForbrukte30812
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30812";

  }

  public class MidlerForbrukte30813
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30813";

  }

  public class MidlerForbrukteFjoraret30814
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30814";

  }

  public class Aarsresultat
  {
    [XmlElement("ordinaertResultatFoerSkattekostnad", Order = 1)]
    [JsonProperty("ordinaertResultatFoerSkattekostnad")]
    [JsonPropertyName("ordinaertResultatFoerSkattekostnad")]
    public OrdinaertResultatFoerSkattekostnaO ordinaertResultatFoerSkattekostnad { get; set; }

    [XmlElement("skattekostnadOrdinaertResultat", Order = 2)]
    [JsonProperty("skattekostnadOrdinaertResultat")]
    [JsonPropertyName("skattekostnadOrdinaertResultat")]
    public SkattekostnadOrdinaertResultat skattekostnadOrdinaertResultat { get; set; }

    [XmlElement("ordinaertResultatEtterSkattekostnad", Order = 3)]
    [JsonProperty("ordinaertResultatEtterSkattekostnad")]
    [JsonPropertyName("ordinaertResultatEtterSkattekostnad")]
    public OrdinaertResultatEtterSkattekostnad ordinaertResultatEtterSkattekostnad { get; set; }

    [XmlElement("ekstraordinaerePoster", Order = 4)]
    [JsonProperty("ekstraordinaerePoster")]
    [JsonPropertyName("ekstraordinaerePoster")]
    public EkstraordinaerePoster ekstraordinaerePoster { get; set; }

    [XmlElement("skattekostnadPaaEkstraordinaertResultat", Order = 5)]
    [JsonProperty("skattekostnadPaaEkstraordinaertResultat")]
    [JsonPropertyName("skattekostnadPaaEkstraordinaertResultat")]
    public SkattekostnadPaaEkstraordinaertResultat skattekostnadPaaEkstraordinaertResultat { get; set; }

    [XmlElement("aarsresultat", Order = 6)]
    [JsonProperty("aarsresultat")]
    [JsonPropertyName("aarsresultat")]
    public AarsresultatPoster aarsresultat { get; set; }

    [XmlElement("minoritetsinteresser", Order = 7)]
    [JsonProperty("minoritetsinteresser")]
    [JsonPropertyName("minoritetsinteresser")]
    public Minoritetsinteresser minoritetsinteresser { get; set; }

    [XmlElement("aarsresultatEtterMinoritetsinteresser", Order = 8)]
    [JsonProperty("aarsresultatEtterMinoritetsinteresser")]
    [JsonPropertyName("aarsresultatEtterMinoritetsinteresser")]
    public AarsresultatEtterMinoritetsinteresser aarsresultatEtterMinoritetsinteresser { get; set; }

    [XmlElement("andreResultatkomponenterIfrs", Order = 9)]
    [JsonProperty("andreResultatkomponenterIfrs")]
    [JsonPropertyName("andreResultatkomponenterIfrs")]
    public AndreResultatkomponenterIfrs andreResultatkomponenterIfrs { get; set; }

    [XmlElement("totalresultatIfrs", Order = 10)]
    [JsonProperty("totalresultatIfrs")]
    [JsonPropertyName("totalresultatIfrs")]
    public TotalresultatIfrs totalresultatIfrs { get; set; }

  }

  public class OrdinaertResultatFoerSkattekostnaO
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteResultatForSkattekostnad18355 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public ResultatForSkattekostnad167 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public ResultatForSkattekostnadFjoraret7042 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteResultatForSkattekostnad18355
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18355";

  }

  public class ResultatForSkattekostnad167
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "167";

  }

  public class ResultatForSkattekostnadFjoraret7042
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7042";

  }

  public class SkattekostnadOrdinaertResultat
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteSkattekostnadOrdinartResultat18259 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public SkattekostnadOrdinartResultat11835 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public SkattekostnadOrdinartResultatFjoraret11836 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteSkattekostnadOrdinartResultat18259
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18259";

  }

  public class SkattekostnadOrdinartResultat11835
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "11835";

  }

  public class SkattekostnadOrdinartResultatFjoraret11836
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "11836";

  }

  public class OrdinaertResultatEtterSkattekostnad
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteResultatOrdinart18258 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public ResultatOrdinart7048 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public ResultatOrdinartFjordaret7049 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteResultatOrdinart18258
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18258";

  }

  public class ResultatOrdinart7048
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7048";

  }

  public class ResultatOrdinartFjordaret7049
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7049";

  }

  public class EkstraordinaerePoster
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteResultatEkstraordinarePoster29047 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public ResultatEkstraordinarePoster29048 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public ResultatEkstraordinarePosterFjoraret29049 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteResultatEkstraordinarePoster29047
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "29047";

  }

  public class ResultatEkstraordinarePoster29048
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "29048";

  }

  public class ResultatEkstraordinarePosterFjoraret29049
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "29049";

  }

  public class SkattekostnadPaaEkstraordinaertResultat
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteSkattekostnadEkstraordinartResultat18263 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public SkattekostnadEkstraordinartResultat2821 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public SkattekostnadEkstraordinartResultatFjoraret8002 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteSkattekostnadEkstraordinartResultat18263
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18263";

  }

  public class SkattekostnadEkstraordinartResultat2821
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "2821";

  }

  public class SkattekostnadEkstraordinartResultatFjoraret8002
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "8002";

  }

  public class AarsresultatPoster
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteArsresultat18265 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public Arsresultat172 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public ArsresultatFjoraret7054 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteArsresultat18265
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18265";

  }

  public class Arsresultat172
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "172";

  }

  public class ArsresultatFjoraret7054
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7054";

  }

  public class Minoritetsinteresser
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteMinoritetsinteresser18264 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public Minoritetsinteresser7717 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public MinoritetsinteresserFjoraret8004 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteMinoritetsinteresser18264
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18264";

  }

  public class Minoritetsinteresser7717
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7717";

  }

  public class MinoritetsinteresserFjoraret8004
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "8004";

  }

  public class AarsresultatEtterMinoritetsinteresser
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteArsresultatEtterMinoritetsinteresser33417 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public ArsresultatEtterMinoritetsinteresser33415 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public ArsresultatEtterMinoritetsinteresserFjoraret33416 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteArsresultatEtterMinoritetsinteresser33417
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33417";

  }

  public class ArsresultatEtterMinoritetsinteresser33415
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33415";

  }

  public class ArsresultatEtterMinoritetsinteresserFjoraret33416
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33416";

  }

  public class AndreResultatkomponenterIfrs
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteResultatkomponenterAndreIFRS35536 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public ResultatkomponenterAndreIFRS32929 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public ResultatkomponenterAndreIFRSFjoraret32930 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteResultatkomponenterAndreIFRS35536
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "35536";

  }

  public class ResultatkomponenterAndreIFRS32929
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "32929";

  }

  public class ResultatkomponenterAndreIFRSFjoraret32930
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "32930";

  }

  public class TotalresultatIfrs
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteTotalresultatIFRS36635 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public TotalresultatIFRS36633 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public TotalresultatIFRSFjoraaret36634 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteTotalresultatIFRS36635
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "36635";

  }

  public class TotalresultatIFRS36633
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "36633";

  }

  public class TotalresultatIFRSFjoraaret36634
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "36634";

  }

  public class TilleggReduksjonEgenkapital
  {
    [XmlElement("grunnkapital", Order = 1)]
    [JsonProperty("grunnkapital")]
    [JsonPropertyName("grunnkapital")]
    public GrunnkapitalTilleggReduksjonEgenkapital grunnkapital { get; set; }

    [XmlElement("formaalskapitalLovpaalagteRestriksjoner", Order = 2)]
    [JsonProperty("formaalskapitalLovpaalagteRestriksjoner")]
    [JsonPropertyName("formaalskapitalLovpaalagteRestriksjoner")]
    public FormaalskapitalLovpaalagteRestriksjonerPoster formaalskapitalLovpaalagteRestriksjoner { get; set; }

    [XmlElement("formaalskapitalEksterntPaalagteRestriksjoner", Order = 3)]
    [JsonProperty("formaalskapitalEksterntPaalagteRestriksjoner")]
    [JsonPropertyName("formaalskapitalEksterntPaalagteRestriksjoner")]
    public FormaalskapitalEksterntPaalagteRestriksjonerTilleggReduksjonEgenkapital formaalskapitalEksterntPaalagteRestriksjoner { get; set; }

    [XmlElement("formaalskapitalSelvpaalagteRestriksjoner", Order = 4)]
    [JsonProperty("formaalskapitalSelvpaalagteRestriksjoner")]
    [JsonPropertyName("formaalskapitalSelvpaalagteRestriksjoner")]
    public FormaalskapitalSelvpaalagteRestriksjonerPoster formaalskapitalSelvpaalagteRestriksjoner { get; set; }

    [XmlElement("annenFormaalskapital", Order = 5)]
    [JsonProperty("annenFormaalskapital")]
    [JsonPropertyName("annenFormaalskapital")]
    public AnnenFormaalskapitalTilleggReduksjonEgenkapital annenFormaalskapital { get; set; }

  }

  public class GrunnkapitalTilleggReduksjonEgenkapital
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteGrunnkapital30815 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public Grunnkapital30816 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public GrunnkapitalFjoraret30817 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteGrunnkapital30815
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30815";

  }

  public class Grunnkapital30816
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30816";

  }

  public class GrunnkapitalFjoraret30817
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30817";

  }

  public class FormaalskapitalLovpaalagteRestriksjonerPoster
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFormalskapitalRestriksjonerLovpalagte33445 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FormalskapitalRestriksjonerLovpalagte33446 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FormalskapitalRestriksjonerLovpalagteFjoraret33447 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFormalskapitalRestriksjonerLovpalagte33445
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33445";

  }

  public class FormalskapitalRestriksjonerLovpalagte33446
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33446";

  }

  public class FormalskapitalRestriksjonerLovpalagteFjoraret33447
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33447";

  }

  public class FormaalskapitalEksterntPaalagteRestriksjonerTilleggReduksjonEgenkapital
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFormalskapitalRestriksjonerEksterntPalagt33448 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FormalskapitalRestriksjonerEksterntPalagt33449 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FormalskapitalRestriksjonerEksterntPalagtFjoraret33450 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFormalskapitalRestriksjonerEksterntPalagt33448
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33448";

  }

  public class FormalskapitalRestriksjonerEksterntPalagt33449
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33449";

  }

  public class FormalskapitalRestriksjonerEksterntPalagtFjoraret33450
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33450";

  }

  public class FormaalskapitalSelvpaalagteRestriksjonerPoster
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFormalskapitalRestriksjonerSelvpalagte33451 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FormalskapitalRestriksjonerSelvpalagte33452 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FormalskapitalRestriksjonerSelvpalagteFjoraret33453 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFormalskapitalRestriksjonerSelvpalagte33451
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33451";

  }

  public class FormalskapitalRestriksjonerSelvpalagte33452
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33452";

  }

  public class FormalskapitalRestriksjonerSelvpalagteFjoraret33453
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33453";

  }

  public class AnnenFormaalskapitalTilleggReduksjonEgenkapital
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFormalskapitalAnnen33454 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FormalskapitalAnnen33455 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FormalskapitalAnnenFjoraret33456 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFormalskapitalAnnen33454
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33454";

  }

  public class FormalskapitalAnnen33455
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33455";

  }

  public class FormalskapitalAnnenFjoraret33456
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33456";

  }

  public class BalanseEiendelerAnleggsmidler
  {
    [XmlElement("immaterielleEiendeler", Order = 1)]
    [JsonProperty("immaterielleEiendeler")]
    [JsonPropertyName("immaterielleEiendeler")]
    public ImmaterielleEiendeler immaterielleEiendeler { get; set; }

    [XmlElement("bevaringsverdigeEiendeler", Order = 2)]
    [JsonProperty("bevaringsverdigeEiendeler")]
    [JsonPropertyName("bevaringsverdigeEiendeler")]
    public BevaringsverdigeEiendeler bevaringsverdigeEiendeler { get; set; }

    [XmlElement("andreDriftsmidler", Order = 3)]
    [JsonProperty("andreDriftsmidler")]
    [JsonPropertyName("andreDriftsmidler")]
    public AndreDriftsmidler andreDriftsmidler { get; set; }

    [XmlElement("finansielleAnleggsmidler", Order = 4)]
    [JsonProperty("finansielleAnleggsmidler")]
    [JsonPropertyName("finansielleAnleggsmidler")]
    public FinansielleAnleggsmidler finansielleAnleggsmidler { get; set; }

  }

  public class ImmaterielleEiendeler
  {
    [XmlElement("konsesjonerPatenterLisenserVaremerkerRettigheter", Order = 1)]
    [JsonProperty("konsesjonerPatenterLisenserVaremerkerRettigheter")]
    [JsonPropertyName("konsesjonerPatenterLisenserVaremerkerRettigheter")]
    public KonsesjonerPatenterLisenserVaremerkerRettigheter konsesjonerPatenterLisenserVaremerkerRettigheter { get; set; }

    [XmlElement("utsattSkattefordel", Order = 2)]
    [JsonProperty("utsattSkattefordel")]
    [JsonPropertyName("utsattSkattefordel")]
    public UtsattSkattefordel utsattSkattefordel { get; set; }

    [XmlElement("goodwill", Order = 3)]
    [JsonProperty("goodwill")]
    [JsonPropertyName("goodwill")]
    public Goodwill goodwill { get; set; }

    [XmlElement("sumImmaterielleEiendeler", Order = 4)]
    [JsonProperty("sumImmaterielleEiendeler")]
    [JsonPropertyName("sumImmaterielleEiendeler")]
    public SumImmaterielleEiendeler sumImmaterielleEiendeler { get; set; }

  }

  public class KonsesjonerPatenterLisenserVaremerkerRettigheter
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NotePatenterRettigheter18560 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public PatenterRettigheter205 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public PatenterRettigheterFjoraret7075 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NotePatenterRettigheter18560
  {
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18560";

  }

  public class PatenterRettigheter205
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "205";

  }

  public class PatenterRettigheterFjoraret7075
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7075";

  }

  public class UtsattSkattefordel
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteSkattefordelUtsatt18182 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public SkattefordelUtsatt202 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public SkattefordelUtsattFjoraret7076 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteSkattefordelUtsatt18182
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18182";

  }

  public class SkattefordelUtsatt202
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "202";

  }

  public class SkattefordelUtsattFjoraret7076
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7076";

  }

  public class Goodwill
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteForretningsverdiGoodwill18183 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public ForretningsverdiGoodwill206 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public ForretningsverdiGoodwillFjoraret7077 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteForretningsverdiGoodwill18183
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18183";

  }

  public class ForretningsverdiGoodwill206
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "206";

  }

  public class ForretningsverdiGoodwillFjoraret7077
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7077";

  }

  public class SumImmaterielleEiendeler
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteEiendelerImmaterielle18180 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public EiendelerImmaterielle2400 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public EiendelerImmaterielleFjoraret8006 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteEiendelerImmaterielle18180
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18180";

  }

  public class EiendelerImmaterielle2400
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "2400";

  }

  public class EiendelerImmaterielleFjoraret8006
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "8006";

  }

  public class BevaringsverdigeEiendeler
  {
    [XmlElement("tomterBygningerAnnenFastEiendom", Order = 1)]
    [JsonProperty("tomterBygningerAnnenFastEiendom")]
    [JsonPropertyName("tomterBygningerAnnenFastEiendom")]
    public TomterBygningerAnnenFastEiendom tomterBygningerAnnenFastEiendom { get; set; }

    [XmlElement("driftsloesoereInventarVerktoeyKontormaskiner", Order = 2)]
    [JsonProperty("driftsloesoereInventarVerktoeyKontormaskiner")]
    [JsonPropertyName("driftsloesoereInventarVerktoeyKontormaskiner")]
    public DriftsloesoereInventarVerktoeyKontormaskiner driftsloesoereInventarVerktoeyKontormaskiner { get; set; }

    [XmlElement("sumBevaringsverdigeEiendeler", Order = 3)]
    [JsonProperty("sumBevaringsverdigeEiendeler")]
    [JsonPropertyName("sumBevaringsverdigeEiendeler")]
    public SumBevaringsverdigeEiendeler sumBevaringsverdigeEiendeler { get; set; }

  }

  public class TomterBygningerAnnenFastEiendom
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFastEiendom18178 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FastEiendom1976 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FastEiendomFjoraret8007 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFastEiendom18178
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18178";

  }

  public class FastEiendom1976
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "1976";

  }

  public class FastEiendomFjoraret8007
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "8007";

  }

  public class DriftsloesoereInventarVerktoeyKontormaskiner
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteKjoretoyInventarVerktoyMv18562 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public KjoretoyInventarVerktoyMv7725 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public KjoretoyInventarVerktoyMvFjoraret8009 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteKjoretoyInventarVerktoyMv18562
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18562";

  }

  public class KjoretoyInventarVerktoyMv7725
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7725";

  }

  public class KjoretoyInventarVerktoyMvFjoraret8009
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "8009";

  }

  public class SumBevaringsverdigeEiendeler
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteDriftsmidlerVarige18176 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public DriftsmidlerVarige47 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public DriftsmidlerVarigeFjoraret8010 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteDriftsmidlerVarige18176
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18176";

  }

  public class DriftsmidlerVarige47
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "47";

  }

  public class DriftsmidlerVarigeFjoraret8010
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "8010";

  }

  public class AndreDriftsmidler
  {
    [XmlElement("andreDriftsmidler", Order = 1)]
    [JsonProperty("andreDriftsmidler")]
    [JsonPropertyName("andreDriftsmidler")]
    public AndreDriftsmidlerPoster andreDriftsmidler { get; set; }

    [XmlElement("sumAndreDriftsmidler", Order = 2)]
    [JsonProperty("sumAndreDriftsmidler")]
    [JsonPropertyName("sumAndreDriftsmidler")]
    public SumAndreDriftsmidler sumAndreDriftsmidler { get; set; }

  }

  public class AndreDriftsmidlerPoster
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteDriftsmidlerAndre18177 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public DriftsmidlerAndre2836 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public DriftsmidlerAndreFjoraret7088 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteDriftsmidlerAndre18177
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18177";

  }

  public class DriftsmidlerAndre2836
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "2836";

  }

  public class DriftsmidlerAndreFjoraret7088
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7088";

  }

  public class SumAndreDriftsmidler
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteDriftsmidlerAndre30979 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public DriftsmidlerAndre30980 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public DriftsmidlerAndreFjoraret30981 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteDriftsmidlerAndre30979
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30979";

  }

  public class DriftsmidlerAndre30980
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30980";

  }

  public class DriftsmidlerAndreFjoraret30981
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30981";

  }

  public class FinansielleAnleggsmidler
  {
    [XmlElement("investeringDatterselskap", Order = 1)]
    [JsonProperty("investeringDatterselskap")]
    [JsonPropertyName("investeringDatterselskap")]
    public InvesteringDatterselskap investeringDatterselskap { get; set; }

    [XmlElement("investeringAksjerAndeler", Order = 2)]
    [JsonProperty("investeringAksjerAndeler")]
    [JsonPropertyName("investeringAksjerAndeler")]
    public InvesteringAksjerAndeler investeringAksjerAndeler { get; set; }

    [XmlElement("obligasjoner", Order = 3)]
    [JsonProperty("obligasjoner")]
    [JsonPropertyName("obligasjoner")]
    public Obligasjoner obligasjoner { get; set; }

    [XmlElement("andreFordringer", Order = 4)]
    [JsonProperty("andreFordringer")]
    [JsonPropertyName("andreFordringer")]
    public AndreFordringerFinansielleAnleggsmidler andreFordringer { get; set; }

    [XmlElement("sumFinansielleAnleggsmidler", Order = 5)]
    [JsonProperty("sumFinansielleAnleggsmidler")]
    [JsonPropertyName("sumFinansielleAnleggsmidler")]
    public SumFinansielleAnleggsmidler sumFinansielleAnleggsmidler { get; set; }

    [XmlElement("sumAnleggsmidler", Order = 6)]
    [JsonProperty("sumAnleggsmidler")]
    [JsonPropertyName("sumAnleggsmidler")]
    public SumAnleggsmidler sumAnleggsmidler { get; set; }

  }

  public class InvesteringDatterselskap
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteInvesteringerDatterselskap18563 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public InvesteringerDatterselskap9686 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public InvesteringerDatterselskapFjoraret10289 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteInvesteringerDatterselskap18563
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18563";

  }

  public class InvesteringerDatterselskap9686
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "9686";

  }

  public class InvesteringerDatterselskapFjoraret10289
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "10289";

  }

  public class InvesteringAksjerAndeler
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteInvesteringerAksjerAndeler18568 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public InvesteringerAksjerAndeler7100 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public InvesteringerAksjerAndelerFjoraret7101 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteInvesteringerAksjerAndeler18568
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18568";

  }

  public class InvesteringerAksjerAndeler7100
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7100";

  }

  public class InvesteringerAksjerAndelerFjoraret7101
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7101";

  }

  public class Obligasjoner
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteObligasjonerLangsiktige27582 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public ObligasjonerLangsiktige27583 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public ObligasjonerLangsiktigeFjoraret27584 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteObligasjonerLangsiktige27582
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "27582";

  }

  public class ObligasjonerLangsiktige27583
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "27583";

  }

  public class ObligasjonerLangsiktigeFjoraret27584
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "27584";

  }

  public class AndreFordringerFinansielleAnleggsmidler
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFordringerAndreLangsiktige27578 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FordringerAndreLangsiktige203 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FordringerAndreLangsiktigeFjoraret27585 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFordringerAndreLangsiktige27578
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "27578";

  }

  public class FordringerAndreLangsiktige203
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "203";

  }

  public class FordringerAndreLangsiktigeFjoraret27585
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "27585";

  }

  public class SumFinansielleAnleggsmidler
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteAnleggsmidlerFinansielle18372 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public AnleggsmidlerFinansielle5267 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public AnleggsmidlerFinansielleFjoraret8014 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteAnleggsmidlerFinansielle18372
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18372";

  }

  public class AnleggsmidlerFinansielle5267
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "5267";

  }

  public class AnleggsmidlerFinansielleFjoraret8014
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "8014";

  }

  public class SumAnleggsmidler
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteAnleggsmidler18570 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public Anleggsmidler217 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public AnleggsmidlerFjoraret7108 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteAnleggsmidler18570
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18570";

  }

  public class Anleggsmidler217
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "217";

  }

  public class AnleggsmidlerFjoraret7108
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7108";

  }

  public class BalanseEiendelerOmloepsmidler
  {
    [XmlElement("beholdninger", Order = 1)]
    [JsonProperty("beholdninger")]
    [JsonPropertyName("beholdninger")]
    public Beholdninger beholdninger { get; set; }

    [XmlElement("fordringer", Order = 2)]
    [JsonProperty("fordringer")]
    [JsonPropertyName("fordringer")]
    public Fordringer fordringer { get; set; }

    [XmlElement("investeringer", Order = 3)]
    [JsonProperty("investeringer")]
    [JsonPropertyName("investeringer")]
    public Investeringer investeringer { get; set; }

    [XmlElement("bankinnskuddKontanter", Order = 4)]
    [JsonProperty("bankinnskuddKontanter")]
    [JsonPropertyName("bankinnskuddKontanter")]
    public BankinnskuddKontanter bankinnskuddKontanter { get; set; }

  }

  public class Beholdninger
  {
    [XmlElement("lagerbeholdning", Order = 1)]
    [JsonProperty("lagerbeholdning")]
    [JsonPropertyName("lagerbeholdning")]
    public Lagerbeholdning lagerbeholdning { get; set; }

    [XmlElement("sumBeholdninger", Order = 2)]
    [JsonProperty("sumBeholdninger")]
    [JsonPropertyName("sumBeholdninger")]
    public SumBeholdninger sumBeholdninger { get; set; }

  }

  public class Lagerbeholdning
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteLagerbeholdning30822 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public Lagerbeholdning30823 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public LagerbeholdningFjoraret30824 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteLagerbeholdning30822
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30822";

  }

  public class Lagerbeholdning30823
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30823";

  }

  public class LagerbeholdningFjoraret30824
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30824";

  }

  public class SumBeholdninger
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteLagerbeholdning18571 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public Lagerbeholdning326 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public LagerbeholdningFjoraret797 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteLagerbeholdning18571
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18571";

  }

  public class Lagerbeholdning326
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "326";

  }

  public class LagerbeholdningFjoraret797
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "797";

  }

  public class Fordringer
  {
    [XmlElement("kundefordringer", Order = 1)]
    [JsonProperty("kundefordringer")]
    [JsonPropertyName("kundefordringer")]
    public Kundefordringer kundefordringer { get; set; }

    [XmlElement("andreFordringer", Order = 2)]
    [JsonProperty("andreFordringer")]
    [JsonPropertyName("andreFordringer")]
    public AndreFordringer andreFordringer { get; set; }

    [XmlElement("sumFordringer", Order = 3)]
    [JsonProperty("sumFordringer")]
    [JsonPropertyName("sumFordringer")]
    public SumFordringer sumFordringer { get; set; }

  }

  public class Kundefordringer
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFordringerKunder18384 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FordringerKunder116 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FordringerKunderFjoraret6921 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFordringerKunder18384
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18384";

  }

  public class FordringerKunder116
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "116";

  }

  public class FordringerKunderFjoraret6921
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "6921";

  }

  public class AndreFordringer
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFordringerAndreKortsiktig18572 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FordringerAndreKortsiktig282 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FordringerAndreKortsiktigFjoraret7112 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFordringerAndreKortsiktig18572
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18572";

  }

  public class FordringerAndreKortsiktig282
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "282";

  }

  public class FordringerAndreKortsiktigFjoraret7112
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7112";

  }

  public class SumFordringer
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFordringer18389 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public Fordringer80 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FordringerFjoraret8015 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFordringer18389
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18389";

  }

  public class Fordringer80
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "80";

  }

  public class FordringerFjoraret8015
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "8015";

  }

  public class Investeringer
  {
    [XmlElement("markedsbaserteAksjer", Order = 1)]
    [JsonProperty("markedsbaserteAksjer")]
    [JsonPropertyName("markedsbaserteAksjer")]
    public MarkedsbaserteAksjer markedsbaserteAksjer { get; set; }

    [XmlElement("andreMarkedsbaserteFinansielleInstrumenter", Order = 2)]
    [JsonProperty("andreMarkedsbaserteFinansielleInstrumenter")]
    [JsonPropertyName("andreMarkedsbaserteFinansielleInstrumenter")]
    public AndreMarkedsbaserteFinansielleInstrumenter andreMarkedsbaserteFinansielleInstrumenter { get; set; }

    [XmlElement("andreFinansielleInstrumenter", Order = 3)]
    [JsonProperty("andreFinansielleInstrumenter")]
    [JsonPropertyName("andreFinansielleInstrumenter")]
    public AndreFinansielleInstrumenter andreFinansielleInstrumenter { get; set; }

    [XmlElement("sumInvesteringer", Order = 4)]
    [JsonProperty("sumInvesteringer")]
    [JsonPropertyName("sumInvesteringer")]
    public SumInvesteringer sumInvesteringer { get; set; }

  }

  public class MarkedsbaserteAksjer
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteAksjerMvMarkedsbaserte18575 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public AksjerMvMarkedsbaserte7117 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public AksjerMvMarkedsbaserteFjoraret7118 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteAksjerMvMarkedsbaserte18575
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18575";

  }

  public class AksjerMvMarkedsbaserte7117
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7117";

  }

  public class AksjerMvMarkedsbaserteFjoraret7118
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7118";

  }

  public class AndreMarkedsbaserteFinansielleInstrumenter
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFinansielleInstrumenterMarkedsbaserteAndre18577 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FinansielleInstrumenterMarkedsbaserteAndre7731 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FinansielleInstrumenterMarkedsbaserteAndreFjoraret8017 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFinansielleInstrumenterMarkedsbaserteAndre18577
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18577";

  }

  public class FinansielleInstrumenterMarkedsbaserteAndre7731
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7731";

  }

  public class FinansielleInstrumenterMarkedsbaserteAndreFjoraret8017
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "8017";

  }

  public class AndreFinansielleInstrumenter
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFinansielleInstrumenterAndre18578 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FinansielleInstrumenterAndre6429 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FinansielleInstrumenterAndreFjoraret7123 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFinansielleInstrumenterAndre18578
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18578";

  }

  public class FinansielleInstrumenterAndre6429
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "6429";

  }

  public class FinansielleInstrumenterAndreFjoraret7123
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7123";

  }

  public class SumInvesteringer
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteInvesteringer18579 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public Investeringer6601 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public InvesteringerFjoraret8018 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteInvesteringer18579
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18579";

  }

  public class Investeringer6601
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "6601";

  }

  public class InvesteringerFjoraret8018
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "8018";

  }

  public class BankinnskuddKontanter
  {
    [XmlElement("bankinnskuddKontanter", Order = 1)]
    [JsonProperty("bankinnskuddKontanter")]
    [JsonPropertyName("bankinnskuddKontanter")]
    public BankinnskuddKontanterPoster bankinnskuddKontanter { get; set; }

    [XmlElement("sumBankinnskuddKontanter", Order = 2)]
    [JsonProperty("sumBankinnskuddKontanter")]
    [JsonPropertyName("sumBankinnskuddKontanter")]
    public SumBankinnskuddKontanter sumBankinnskuddKontanter { get; set; }

    [XmlElement("sumOmloepsmidler", Order = 3)]
    [JsonProperty("sumOmloepsmidler")]
    [JsonPropertyName("sumOmloepsmidler")]
    public SumOmloepsmidler sumOmloepsmidler { get; set; }

    [XmlElement("sumEiendeler", Order = 4)]
    [JsonProperty("sumEiendeler")]
    [JsonPropertyName("sumEiendeler")]
    public SumEiendeler sumEiendeler { get; set; }

  }

  public class BankinnskuddKontanterPoster
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteKontanterBankinnskudd18390 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public KontanterBankinnskudd786 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public KontanterBankinnskuddFjoraret8019 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteKontanterBankinnskudd18390
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18390";

  }

  public class KontanterBankinnskudd786
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "786";

  }

  public class KontanterBankinnskuddFjoraret8019
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "8019";

  }

  public class SumBankinnskuddKontanter
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteKontanterBankinnskuddSum29041 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public KontanterBankinnskuddSum29042 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public KontanterBankinnskuddSumFjoraret29043 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteKontanterBankinnskuddSum29041
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "29041";

  }

  public class KontanterBankinnskuddSum29042
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "29042";

  }

  public class KontanterBankinnskuddSumFjoraret29043
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "29043";

  }

  public class SumOmloepsmidler
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteOmlopsmidler18580 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public Omlopsmidler194 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public OmlopsmidlerFjoraret7126 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteOmlopsmidler18580
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18580";

  }

  public class Omlopsmidler194
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "194";

  }

  public class OmlopsmidlerFjoraret7126
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7126";

  }

  public class SumEiendeler
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteEiendeler18167 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public Eiendeler219 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public EiendelerFjoraret7127 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteEiendeler18167
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18167";

  }

  public class Eiendeler219
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "219";

  }

  public class EiendelerFjoraret7127
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7127";

  }

  public class BalanseFormaalskapital
  {
    [XmlElement("grunnkapital", Order = 1)]
    [JsonProperty("grunnkapital")]
    [JsonPropertyName("grunnkapital")]
    public Grunnkapital grunnkapital { get; set; }

    [XmlElement("formaalskapitalLovpaalagteRestriksjoner", Order = 2)]
    [JsonProperty("formaalskapitalLovpaalagteRestriksjoner")]
    [JsonPropertyName("formaalskapitalLovpaalagteRestriksjoner")]
    public FormaalskapitalLovpaalagteRestriksjoner formaalskapitalLovpaalagteRestriksjoner { get; set; }

    [XmlElement("formaalskapitalEksterntPaalagteRestriksjoner", Order = 3)]
    [JsonProperty("formaalskapitalEksterntPaalagteRestriksjoner")]
    [JsonPropertyName("formaalskapitalEksterntPaalagteRestriksjoner")]
    public FormaalskapitalEksterntPaalagteRestriksjoner formaalskapitalEksterntPaalagteRestriksjoner { get; set; }

    [XmlElement("formaalskapitalSelvpaalagteRestriksjoner", Order = 4)]
    [JsonProperty("formaalskapitalSelvpaalagteRestriksjoner")]
    [JsonPropertyName("formaalskapitalSelvpaalagteRestriksjoner")]
    public FormaalskapitalSelvpaalagteRestriksjoner formaalskapitalSelvpaalagteRestriksjoner { get; set; }

  }

  public class Grunnkapital
  {
    [XmlElement("grunnkapital", Order = 1)]
    [JsonProperty("grunnkapital")]
    [JsonPropertyName("grunnkapital")]
    public GrunnkapitalPoster grunnkapital { get; set; }

    [XmlElement("annenInnskuttFormaalskapital", Order = 2)]
    [JsonProperty("annenInnskuttFormaalskapital")]
    [JsonPropertyName("annenInnskuttFormaalskapital")]
    public AnnenInnskuttFormaalskapital annenInnskuttFormaalskapital { get; set; }

    [XmlElement("sumInnskuttFormaalskapital", Order = 3)]
    [JsonProperty("sumInnskuttFormaalskapital")]
    [JsonPropertyName("sumInnskuttFormaalskapital")]
    public SumInnskuttFormaalskapital sumInnskuttFormaalskapital { get; set; }

  }

  public class GrunnkapitalPoster
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteGrunnkapital30819 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public Grunnkapital30820 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public GrunnkapitalFjoraret30821 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteGrunnkapital30819
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30819";

  }

  public class Grunnkapital30820
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30820";

  }

  public class GrunnkapitalFjoraret30821
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "30821";

  }

  public class AnnenInnskuttFormaalskapital
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFormalskapitalInnskuttAnnen33457 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FormalskapitalInnskuttAnnen33458 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FormalskapitalInnskuttAnnenFjoraret33459 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFormalskapitalInnskuttAnnen33457
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33457";

  }

  public class FormalskapitalInnskuttAnnen33458
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33458";

  }

  public class FormalskapitalInnskuttAnnenFjoraret33459
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33459";

  }

  public class SumInnskuttFormaalskapital
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFormalskapitalInnskuttSum33460 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FormalskapitalInnskuttSum33461 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public AktiviteterOppfyllerOrganisasjonensFormalFjoraret33426 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFormalskapitalInnskuttSum33460
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33460";

  }

  public class FormalskapitalInnskuttSum33461
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33461";

  }

  public class FormaalskapitalLovpaalagteRestriksjoner
  {
    [XmlElement("annenFormaalskapitalLovpaalagteRestriksjoner", Order = 1)]
    [JsonProperty("annenFormaalskapitalLovpaalagteRestriksjoner")]
    [JsonPropertyName("annenFormaalskapitalLovpaalagteRestriksjoner")]
    public AnnenFormaalskapitalLovpaalagteRestriksjoner annenFormaalskapitalLovpaalagteRestriksjoner { get; set; }

    [XmlElement("sumOpptjentFormaalskapitalLovpaalagteRestriksjoner", Order = 2)]
    [JsonProperty("sumOpptjentFormaalskapitalLovpaalagteRestriksjoner")]
    [JsonPropertyName("sumOpptjentFormaalskapitalLovpaalagteRestriksjoner")]
    public SumOpptjentFormaalskapitalLovpaalagteRestriksjoner sumOpptjentFormaalskapitalLovpaalagteRestriksjoner { get; set; }

  }

  public class AnnenFormaalskapitalLovpaalagteRestriksjoner
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFormalskapitalAnnenRestriksjonerLovpalagte33463 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FormalskapitalAnnenRestriksjonerLovpalagte33464 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FormalskapitalAnnenRestriksjonerLovpalagteFjoraret33465 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFormalskapitalAnnenRestriksjonerLovpalagte33463
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33463";

  }

  public class FormalskapitalAnnenRestriksjonerLovpalagte33464
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33464";

  }

  public class FormalskapitalAnnenRestriksjonerLovpalagteFjoraret33465
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33465";

  }

  public class SumOpptjentFormaalskapitalLovpaalagteRestriksjoner
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFormalskapitalOpptjentSumRestriksjonerLovpalagte33466 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FormalskapitalOpptjentSumRestriksjonerLovpalagte33467 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FormalskapitalOpptjentSumRestriksjonerLovpalagteFjoraret33468 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFormalskapitalOpptjentSumRestriksjonerLovpalagte33466
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33466";

  }

  public class FormalskapitalOpptjentSumRestriksjonerLovpalagte33467
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33467";

  }

  public class FormalskapitalOpptjentSumRestriksjonerLovpalagteFjoraret33468
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33468";

  }

  public class FormaalskapitalEksterntPaalagteRestriksjoner
  {
    [XmlElement("annenFormaalskapitalEksterntPaalagteRestriksjoner", Order = 1)]
    [JsonProperty("annenFormaalskapitalEksterntPaalagteRestriksjoner")]
    [JsonPropertyName("annenFormaalskapitalEksterntPaalagteRestriksjoner")]
    public AnnenFormaalskapitalEksterntPaalagteRestriksjoner annenFormaalskapitalEksterntPaalagteRestriksjoner { get; set; }

    [XmlElement("sumFormaalskapitalEksterntPaalagteRestriksjoner", Order = 2)]
    [JsonProperty("sumFormaalskapitalEksterntPaalagteRestriksjoner")]
    [JsonPropertyName("sumFormaalskapitalEksterntPaalagteRestriksjoner")]
    public SumFormaalskapitalEksterntPaalagteRestriksjoner sumFormaalskapitalEksterntPaalagteRestriksjoner { get; set; }

  }

  public class AnnenFormaalskapitalEksterntPaalagteRestriksjoner
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFormalskapitalAnnenRestriksjonerEksterntPalagte33469 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FormalskapitalAnnenRestriksjonerEksterntPalagte33470 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FormalskapitalAnnenRestriksjonerEksterntPalagteFjoraret33471 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFormalskapitalAnnenRestriksjonerEksterntPalagte33469
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33469";

  }

  public class FormalskapitalAnnenRestriksjonerEksterntPalagte33470
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33470";

  }

  public class FormalskapitalAnnenRestriksjonerEksterntPalagteFjoraret33471
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33471";

  }

  public class SumFormaalskapitalEksterntPaalagteRestriksjoner
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFormalskapitalSumRestriksjonerEksterntPalagte33472 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FormalskapitalSumRestriksjonerEksterntPalagte33473 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FormalskapitalSumRestriksjonerEksterntPalagteFjoraret33474 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFormalskapitalSumRestriksjonerEksterntPalagte33472
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33472";

  }

  public class FormalskapitalSumRestriksjonerEksterntPalagte33473
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33473";

  }

  public class FormalskapitalSumRestriksjonerEksterntPalagteFjoraret33474
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33474";

  }

  public class FormaalskapitalSelvpaalagteRestriksjoner
  {
    [XmlElement("annenFormaalskapitalSelvpaalagteRestriksjoner", Order = 1)]
    [JsonProperty("annenFormaalskapitalSelvpaalagteRestriksjoner")]
    [JsonPropertyName("annenFormaalskapitalSelvpaalagteRestriksjoner")]
    public AnnenFormaalskapitalSelvpaalagteRestriksjoner annenFormaalskapitalSelvpaalagteRestriksjoner { get; set; }

    [XmlElement("sumFormaalskapitalSelvpaalagteRestriksjoner", Order = 2)]
    [JsonProperty("sumFormaalskapitalSelvpaalagteRestriksjoner")]
    [JsonPropertyName("sumFormaalskapitalSelvpaalagteRestriksjoner")]
    public SumFormaalskapitalSelvpaalagteRestriksjoner sumFormaalskapitalSelvpaalagteRestriksjoner { get; set; }

    [XmlElement("annenFormaalskapital", Order = 3)]
    [JsonProperty("annenFormaalskapital")]
    [JsonPropertyName("annenFormaalskapital")]
    public AnnenFormaalskapital annenFormaalskapital { get; set; }

    [XmlElement("minoritetsinteresser", Order = 4)]
    [JsonProperty("minoritetsinteresser")]
    [JsonPropertyName("minoritetsinteresser")]
    public MinoritetsinteresserFormaalskapitalSelvpaalagteRestriksjoner minoritetsinteresser { get; set; }

    [XmlElement("sumFormaalskapital", Order = 5)]
    [JsonProperty("sumFormaalskapital")]
    [JsonPropertyName("sumFormaalskapital")]
    public SumFormaalskapital sumFormaalskapital { get; set; }

  }

  public class AnnenFormaalskapitalSelvpaalagteRestriksjoner
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFormalskapitalAnnenRestriksjonerSelpalagte33475 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FormalskapitalAnnenRestriksjonerSelvpalagte33476 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FormalskapitalAnnenRestriksjonerSelvpalagteFjoraret33477 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFormalskapitalAnnenRestriksjonerSelpalagte33475
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33475";

  }

  public class FormalskapitalAnnenRestriksjonerSelvpalagte33476
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33476";

  }

  public class FormalskapitalAnnenRestriksjonerSelvpalagteFjoraret33477
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33477";

  }

  public class SumFormaalskapitalSelvpaalagteRestriksjoner
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFormalskapitalSumRestriksjonerSelvpalagte33478 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FormalskapitalSumRestriksjonerSelvpalagte33479 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FormalskapitalSumRestriksjonerSelvpalagteFjoraret33480 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFormalskapitalSumRestriksjonerSelvpalagte33478
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33478";

  }

  public class FormalskapitalSumRestriksjonerSelvpalagte33479
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33479";

  }

  public class FormalskapitalSumRestriksjonerSelvpalagteFjoraret33480
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33480";

  }

  public class AnnenFormaalskapital
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFormalskapitalAnnen33481 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FormalskapitalAnnen33482 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FormalskapitalAnnenFjoraret33483 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFormalskapitalAnnen33481
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33481";

  }

  public class FormalskapitalAnnen33482
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33482";

  }

  public class FormalskapitalAnnenFjoraret33483
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33483";

  }

  public class MinoritetsinteresserFormaalskapitalSelvpaalagteRestriksjoner
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteMinoritetsinteresser29044 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public Minoritetsinteresser29045 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public MinoritetsinteresserFjoraret29046 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteMinoritetsinteresser29044
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "29044";

  }

  public class Minoritetsinteresser29045
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "29045";

  }

  public class MinoritetsinteresserFjoraret29046
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "29046";

  }

  public class SumFormaalskapital
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteFormalskapitalSum33484 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public FormalskapitalSum33485 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public FormalskapitalSumFjoraret33486 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteFormalskapitalSum33484
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33484";

  }

  public class FormalskapitalSum33485
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33485";

  }

  public class FormalskapitalSumFjoraret33486
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "33486";

  }

  public class BalanseGjeld
  {
    [XmlElement("avsetningerForForpliktelser", Order = 1)]
    [JsonProperty("avsetningerForForpliktelser")]
    [JsonPropertyName("avsetningerForForpliktelser")]
    public AvsetningerForForpliktelser avsetningerForForpliktelser { get; set; }

    [XmlElement("annenLangsiktigGjeld", Order = 2)]
    [JsonProperty("annenLangsiktigGjeld")]
    [JsonPropertyName("annenLangsiktigGjeld")]
    public AnnenLangsiktigGjeld annenLangsiktigGjeld { get; set; }

    [XmlElement("kortsiktigGjeld", Order = 3)]
    [JsonProperty("kortsiktigGjeld")]
    [JsonPropertyName("kortsiktigGjeld")]
    public KortsiktigGjeld kortsiktigGjeld { get; set; }

  }

  public class AvsetningerForForpliktelser
  {
    [XmlElement("pensjonsforpliktelser", Order = 1)]
    [JsonProperty("pensjonsforpliktelser")]
    [JsonPropertyName("pensjonsforpliktelser")]
    public Pensjonsforpliktelser pensjonsforpliktelser { get; set; }

    [XmlElement("utsattSkatt", Order = 2)]
    [JsonProperty("utsattSkatt")]
    [JsonPropertyName("utsattSkatt")]
    public UtsattSkatt utsattSkatt { get; set; }

    [XmlElement("andreAvsetningerForpliktelser", Order = 3)]
    [JsonProperty("andreAvsetningerForpliktelser")]
    [JsonPropertyName("andreAvsetningerForpliktelser")]
    public AndreAvsetningerForpliktelser andreAvsetningerForpliktelser { get; set; }

    [XmlElement("sumAvsetningerForpliktelser", Order = 4)]
    [JsonProperty("sumAvsetningerForpliktelser")]
    [JsonPropertyName("sumAvsetningerForpliktelser")]
    public SumAvsetningerForpliktelser sumAvsetningerForpliktelser { get; set; }

  }

  public class Pensjonsforpliktelser
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NotePensjonsforpliktelser18149 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public Pensjonsforpliktelser238 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public PensjonsforpliktelserFjoraret6685 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NotePensjonsforpliktelser18149
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18149";

  }

  public class Pensjonsforpliktelser238
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "238";

  }

  public class PensjonsforpliktelserFjoraret6685
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "6685";

  }

  public class UtsattSkatt
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteSkattUtsatt18148 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public SkattUtsatt237 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public SkattUtsattFjoraret7143 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteSkattUtsatt18148
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18148";

  }

  public class SkattUtsatt237
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "237";

  }

  public class SkattUtsattFjoraret7143
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7143";

  }

  public class AndreAvsetningerForpliktelser
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteAvsetningerForpliktelserLangsiktig18582 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public AvsetningerForpliktelserLangsiktig7157 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public AvsetningerForpliktelserLangsiktigFjoraret7146 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteAvsetningerForpliktelserLangsiktig18582
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18582";

  }

  public class AvsetningerForpliktelserLangsiktig7157
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7157";

  }

  public class AvsetningerForpliktelserLangsiktigFjoraret7146
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7146";

  }

  public class SumAvsetningerForpliktelser
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteAvsetningerForpliktelser18144 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public AvsetningerForpliktelser7231 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public AvsetningerForpliktelserFjoraret7230 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteAvsetningerForpliktelser18144
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18144";

  }

  public class AvsetningerForpliktelser7231
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7231";

  }

  public class AvsetningerForpliktelserFjoraret7230
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7230";

  }

  public class AnnenLangsiktigGjeld
  {
    [XmlElement("gjeldKredittinstitusjoner", Order = 1)]
    [JsonProperty("gjeldKredittinstitusjoner")]
    [JsonPropertyName("gjeldKredittinstitusjoner")]
    public GjeldKredittinstitusjoner gjeldKredittinstitusjoner { get; set; }

    [XmlElement("oevrigLangsiktigGjeld", Order = 2)]
    [JsonProperty("oevrigLangsiktigGjeld")]
    [JsonPropertyName("oevrigLangsiktigGjeld")]
    public OevrigLangsiktigGjeld oevrigLangsiktigGjeld { get; set; }

    [XmlElement("sumAnnenLangsiktigGjeld", Order = 3)]
    [JsonProperty("sumAnnenLangsiktigGjeld")]
    [JsonPropertyName("sumAnnenLangsiktigGjeld")]
    public SumAnnenLangsiktigGjeld sumAnnenLangsiktigGjeld { get; set; }

    [XmlElement("sumLangsiktigGjeld", Order = 4)]
    [JsonProperty("sumLangsiktigGjeld")]
    [JsonPropertyName("sumLangsiktigGjeld")]
    public SumLangsiktigGjeld sumLangsiktigGjeld { get; set; }

  }

  public class GjeldKredittinstitusjoner
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteGjeldKredittinstitusjoner18164 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public GjeldKredittinstitusjoner7150 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public GjeldKredittinstitusjonerFjoraret7151 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteGjeldKredittinstitusjoner18164
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18164";

  }

  public class GjeldKredittinstitusjoner7150
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7150";

  }

  public class GjeldKredittinstitusjonerFjoraret7151
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7151";

  }

  public class OevrigLangsiktigGjeld
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteGjeldAnnenLangsiktig18584 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public GjeldAnnenLangsiktig242 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public GjeldAnnenLangsiktigFjoraret7155 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteGjeldAnnenLangsiktig18584
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18584";

  }

  public class GjeldAnnenLangsiktig242
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "242";

  }

  public class GjeldAnnenLangsiktigFjoraret7155
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7155";

  }

  public class SumAnnenLangsiktigGjeld
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteGjeldAnnenLangsiktigSum25018 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public GjeldAnnenLangsiktigSum25019 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public GjeldAnnenLangsiktigSumFjoraret25020 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteGjeldAnnenLangsiktigSum25018
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "25018";

  }

  public class GjeldAnnenLangsiktigSum25019
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "25019";

  }

  public class GjeldAnnenLangsiktigSumFjoraret25020
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "25020";

  }

  public class SumLangsiktigGjeld
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteGjeldLangsiktig18585 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public GjeldLangsiktig86 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public GjeldLangsiktigFjoraret7156 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteGjeldLangsiktig18585
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18585";

  }

  public class GjeldLangsiktig86
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "86";

  }

  public class GjeldLangsiktigFjoraret7156
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7156";

  }

  public class KortsiktigGjeld
  {
    [XmlElement("gjeldKredittinstitusjoner", Order = 1)]
    [JsonProperty("gjeldKredittinstitusjoner")]
    [JsonPropertyName("gjeldKredittinstitusjoner")]
    public GjeldKredittinstitusjonerPoster gjeldKredittinstitusjoner { get; set; }

    [XmlElement("leverandoergjeld", Order = 2)]
    [JsonProperty("leverandoergjeld")]
    [JsonPropertyName("leverandoergjeld")]
    public Leverandoergjeld leverandoergjeld { get; set; }

    [XmlElement("betalbarSkatt", Order = 3)]
    [JsonProperty("betalbarSkatt")]
    [JsonPropertyName("betalbarSkatt")]
    public BetalbarSkatt betalbarSkatt { get; set; }

    [XmlElement("skyldigeOffentligeAvgifter", Order = 4)]
    [JsonProperty("skyldigeOffentligeAvgifter")]
    [JsonPropertyName("skyldigeOffentligeAvgifter")]
    public SkyldigeOffentligeAvgifter skyldigeOffentligeAvgifter { get; set; }

    [XmlElement("annenKortsiktigGjeld", Order = 5)]
    [JsonProperty("annenKortsiktigGjeld")]
    [JsonPropertyName("annenKortsiktigGjeld")]
    public AnnenKortsiktigGjeld annenKortsiktigGjeld { get; set; }

    [XmlElement("sumKortsiktigGjeld", Order = 6)]
    [JsonProperty("sumKortsiktigGjeld")]
    [JsonPropertyName("sumKortsiktigGjeld")]
    public SumKortsiktigGjeld sumKortsiktigGjeld { get; set; }

    [XmlElement("sumGjeld", Order = 7)]
    [JsonProperty("sumGjeld")]
    [JsonPropertyName("sumGjeld")]
    public SumGjeld sumGjeld { get; set; }

    [XmlElement("sumFormaalskapitalGjeld", Order = 8)]
    [JsonProperty("sumFormaalskapitalGjeld")]
    [JsonPropertyName("sumFormaalskapitalGjeld")]
    public SumFormaalskapitalGjeldS sumFormaalskapitalGjeld { get; set; }

  }

  public class GjeldKredittinstitusjonerPoster
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteGjeldKredittinstitusjonerKortsiktig18587 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public GjeldKredittinstitusjonerKortsiktig10926 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public GjeldKredittinstitusjonerKortsiktigFjoraret13203 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteGjeldKredittinstitusjonerKortsiktig18587
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18587";

  }

  public class GjeldKredittinstitusjonerKortsiktig10926
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "10926";

  }

  public class GjeldKredittinstitusjonerKortsiktigFjoraret13203
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "13203";

  }

  public class Leverandoergjeld
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteLeverandorgjeld18588 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public Leverandorgjeld220 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public LeverandorgjeldFjoraret7162 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteLeverandorgjeld18588
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18588";

  }

  public class Leverandorgjeld220
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "220";

  }

  public class LeverandorgjeldFjoraret7162
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7162";

  }

  public class BetalbarSkatt
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteSkattBetalbar18589 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public SkattBetalbar2483 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public SkattBetalbarFjoraret10293 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteSkattBetalbar18589
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18589";

  }

  public class SkattBetalbar2483
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "2483";

  }

  public class SkattBetalbarFjoraret10293
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "10293";

  }

  public class SkyldigeOffentligeAvgifter
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteAvgifterOffentligeSkyldig18590 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public AvgifterOffentligeSkyldig225 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public AvgifterOffentligeSkyldigFjoraret7170 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteAvgifterOffentligeSkyldig18590
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18590";

  }

  public class AvgifterOffentligeSkyldig225
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "225";

  }

  public class AvgifterOffentligeSkyldigFjoraret7170
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7170";

  }

  public class AnnenKortsiktigGjeld
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteGjeldAnnenKortsiktig18592 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public GjeldAnnenKortsiktig236 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public GjeldAnnenKortsiktigFjoraret7182 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteGjeldAnnenKortsiktig18592
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18592";

  }

  public class GjeldAnnenKortsiktig236
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "236";

  }

  public class GjeldAnnenKortsiktigFjoraret7182
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7182";

  }

  public class SumKortsiktigGjeld
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteGjeldKortsiktig18593 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public GjeldKortsiktig85 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public GjeldKortsiktigFjoraret7183 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteGjeldKortsiktig18593
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18593";

  }

  public class GjeldKortsiktig85
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "85";

  }

  public class GjeldKortsiktigFjoraret7183
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7183";

  }

  public class SumGjeld
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteGjeld18138 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public Gjeld1119 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public GjeldFjoraret7184 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteGjeld18138
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18138";

  }

  public class Gjeld1119
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "1119";

  }

  public class GjeldFjoraret7184
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7184";

  }

  public class SumFormaalskapitalGjeldS
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteGjeldEgenkapital18122 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public GjeldEgenkapital251 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public GjeldEgenkapitalFjoraret7185 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteGjeldEgenkapital18122
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18122";

  }

  public class GjeldEgenkapital251
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "251";

  }

  public class GjeldEgenkapitalFjoraret7185
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "7185";

  }

  public class PosterUtenomBalansen
  {
    [XmlElement("garantistillelser", Order = 1)]
    [JsonProperty("garantistillelser")]
    [JsonPropertyName("garantistillelser")]
    public Garantistillelser garantistillelser { get; set; }

    [XmlElement("pantstillelser", Order = 2)]
    [JsonProperty("pantstillelser")]
    [JsonPropertyName("pantstillelser")]
    public Pantstillelser pantstillelser { get; set; }

  }

  public class Garantistillelser
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NoteGarantistillelse18594 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public Garantistillelse16920 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public GarantistillelseFjoraret16921 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NoteGarantistillelse18594
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18594";

  }

  public class Garantistillelse16920
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "16920";

  }

  public class GarantistillelseFjoraret16921
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "16921";

  }

  public class Pantstillelser
  {
    [XmlElement("note", Order = 1)]
    [JsonProperty("note")]
    [JsonPropertyName("note")]
    public NotePantstillelser18595 note { get; set; }

    public bool ShouldSerializenote() => note?.value is not null;

    [XmlElement("aarets", Order = 2)]
    [JsonProperty("aarets")]
    [JsonPropertyName("aarets")]
    public Pantstillelser16922 aarets { get; set; }

    public bool ShouldSerializeaarets() => aarets?.valueNullable is not null;

    [XmlElement("fjoraarets", Order = 3)]
    [JsonProperty("fjoraarets")]
    [JsonPropertyName("fjoraarets")]
    public PantstillelserFjoraret16923 fjoraarets { get; set; }

    public bool ShouldSerializefjoraarets() => fjoraarets?.valueNullable is not null;

  }

  public class NotePantstillelser18595
  {
    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "18595";

  }

  public class Pantstillelser16922
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "16922";

  }

  public class PantstillelserFjoraret16923
  {
    [RegularExpression(@"^-?[0-9]{0,15}$")]
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

    [XmlAttribute("orid")]
    [BindNever]
    public string orid { get; set; } = "16923";

  }
}
