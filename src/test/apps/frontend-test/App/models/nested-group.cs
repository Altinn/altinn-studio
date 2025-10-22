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
  public class NestedGroup{
    [Range(Int32.MinValue,Int32.MaxValue)]
    [XmlAttribute("skjemanummer")]
    [BindNever]
    public decimal skjemanummer {get; set;} = 1603;

    [Range(Int32.MinValue,Int32.MaxValue)]
    [XmlAttribute("spesifikasjonsnummer")]
    [BindNever]
    public decimal spesifikasjonsnummer {get; set;} = 12392;

    [XmlAttribute("hideRowValue")]
    [JsonProperty("hideRowValue")]
    public int hideRowValue {get; set;}

    [XmlAttribute("sumAll")]
    [JsonProperty("sumAll")]
    public decimal sumAll {get; set;}

    [XmlAttribute("sumAboveLimit")]
    [JsonProperty("sumAboveLimit")]
    public decimal sumAboveLimit {get; set;}

    [XmlAttribute("numAboveLimit")]
    [JsonProperty("numAboveLimit")]
    public decimal numAboveLimit {get; set;}

    [XmlAttribute("blankettnummer")]
    [BindNever]
    public  string blankettnummer {get; set; } = "RF-1366";

    [XmlAttribute("tittel")]
    [BindNever]
    public  string tittel {get; set; } = "Endringsmelding";

    [Range(1,Int32.MaxValue)]
    [XmlAttribute("gruppeid")]
    [BindNever]
    public decimal gruppeid {get; set;} = 9785;

    [XmlAttribute("etatid")]
    public string etatid { get; set; }

    [XmlElement("Endringsmelding-grp-9786")]
    [JsonProperty("Endringsmelding-grp-9786")]
    [JsonPropertyName("Endringsmelding-grp-9786")]
    public Endringsmeldinggrp9786 Endringsmeldinggrp9786 { get; set; }

    [XmlElement("PrefillValues")]
    [JsonProperty("PrefillValues")]
    [JsonPropertyName("PrefillValues")]
    public string PrefillValues { get; set; }

    [XmlElement("PrefillValuesShadow")]
    [JsonProperty("PrefillValuesShadow")]
    [JsonPropertyName("PrefillValuesShadow")]
    public string PrefillValuesShadow { get; set; }

    [XmlElement("PrefillValuesEnabled")]
    [JsonProperty("PrefillValuesEnabled")]
    [JsonPropertyName("PrefillValuesEnabled")]
    public bool PrefillValuesEnabled { get; set; } = true;

    [XmlElement("Group2Teller")]
    [JsonProperty("Group2Teller")]
    [JsonPropertyName("Group2Teller")]
    public decimal Group2Teller { get; set; } = 0;

    [XmlElement("Pets")]
    [JsonProperty("Pets")]
    [JsonPropertyName("Pets")]
    public List<Pet> Pets { get; set; }

    [XmlElement("ForceShowPets")]
    [JsonProperty("ForceShowPets")]
    [JsonPropertyName("ForceShowPets")]
    public bool ForceShowPets { get; set; }

    [XmlElement("NumPets")]
    [JsonProperty("NumPets")]
    [JsonPropertyName("NumPets")]
    public int NumPets { get; set; }

    [XmlElement("HiddenPets")]
    [JsonProperty("HiddenPets")]
    [JsonPropertyName("HiddenPets")]
    public string HiddenPets { get; set; }

    [XmlElement("PetSortOrder")]
    [JsonProperty("PetSortOrder")]
    [JsonPropertyName("PetSortOrder")]
    public string PetSortOrder { get; set; }

    [XmlElement("PetsUseOptionComponent")]
    [JsonProperty("PetsUseOptionComponent")]
    [JsonPropertyName("PetsUseOptionComponent")]
    public bool? PetsUseOptionComponent { get; set; }
  }

  public class Pet
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public Guid AltinnRowId { get; set; }

    public bool AltinnRowIdSpecified()
    {
      return AltinnRowId == default;
    }

    [XmlElement("UniqueId")]
    [JsonProperty("UniqueId")]
    [JsonPropertyName("UniqueId")]
    public string UniqueId { get; set; }

    [XmlElement("Species")]
    [JsonProperty("Species")]
    [JsonPropertyName("Species")]
    public string Species { get; set; }

    [XmlElement("SpeciesLabel")]
    [JsonProperty("SpeciesLabel")]
    [JsonPropertyName("SpeciesLabel")]
    public string SpeciesLabel { get; set; }

    [XmlElement("Name")]
    [JsonProperty("Name")]
    [JsonPropertyName("Name")]
    public string Name { get; set; }

    [XmlElement("Age")]
    [JsonProperty("Age")]
    [JsonPropertyName("Age")]
    public decimal Age { get; set; }
  }

  public class Endringsmeldinggrp9786{
    [Range(1,Int32.MaxValue)]
    [XmlAttribute("gruppeid")]
    [BindNever]
    public decimal gruppeid {get; set;} = 9786;

    [XmlElement("Avgiver-grp-9787")]
    [JsonProperty("Avgiver-grp-9787")]
    [JsonPropertyName("Avgiver-grp-9787")]
    public Avgivergrp9787 Avgivergrp9787 { get; set; }

    [XmlElement("OversiktOverEndringene-grp-9788")]
    [JsonProperty("OversiktOverEndringene-grp-9788")]
    [JsonPropertyName("OversiktOverEndringene-grp-9788")]
    public List<OversiktOverEndringenegrp9788>? OversiktOverEndringenegrp9788 { get; set; }

    [XmlElement("Gruppe2")]
    [JsonProperty("Gruppe2")]
    [JsonPropertyName("Gruppe2")]
    public List<Gruppe2> Gruppe2 { get; set; }

  }
  public class Avgivergrp9787{
    [Range(1,Int32.MaxValue)]
    [XmlAttribute("gruppeid")]
    [BindNever]
    public decimal gruppeid {get; set;} = 9787;

    [XmlElement("OppgavegiverNavn-datadef-68")]
    [JsonProperty("OppgavegiverNavn-datadef-68")]
    [JsonPropertyName("OppgavegiverNavn-datadef-68")]
    public OppgavegiverNavndatadef68 OppgavegiverNavndatadef68 { get; set; }

    [XmlElement("OppgavegiverFodselsnummer-datadef-26")]
    [JsonProperty("OppgavegiverFodselsnummer-datadef-26")]
    [JsonPropertyName("OppgavegiverFodselsnummer-datadef-26")]
    public OppgavegiverFodselsnummerdatadef26 OppgavegiverFodselsnummerdatadef26 { get; set; }

    [XmlElement("KontaktpersonEPost-datadef-27688")]
    [JsonProperty("KontaktpersonEPost-datadef-27688")]
    [JsonPropertyName("KontaktpersonEPost-datadef-27688")]
    public KontaktpersonEPostdatadef27688 KontaktpersonEPostdatadef27688 { get; set; }

    [XmlElement("KontaktpersonTelefonnummer-datadef-3")]
    [JsonProperty("KontaktpersonTelefonnummer-datadef-3")]
    [JsonPropertyName("KontaktpersonTelefonnummer-datadef-3")]
    public KontaktpersonTelefonnummerdatadef3 KontaktpersonTelefonnummerdatadef3 { get; set; }

  }
  public class OppgavegiverNavndatadef68{
    [Range(1,Int32.MaxValue)]
    [XmlAttribute("orid")]
    [BindNever]
    public decimal orid {get; set;} = 68;

    [MinLength(1)]
    [MaxLength(175)]
    [XmlText()]
    public string value { get; set; }

  }
  public class OppgavegiverFodselsnummerdatadef26{
    [Range(1,Int32.MaxValue)]
    [XmlAttribute("orid")]
    [BindNever]
    public decimal orid {get; set;} = 26;

    [XmlText()]
    public string value { get; set; }

  }
  public class KontaktpersonEPostdatadef27688{
    [Range(1,Int32.MaxValue)]
    [XmlAttribute("orid")]
    [BindNever]
    public decimal orid {get; set;} = 27688;

    [MinLength(1)]
    [MaxLength(45)]
    [XmlText()]
    public string value { get; set; }

  }
  public class KontaktpersonTelefonnummerdatadef3{
    [Range(1,Int32.MaxValue)]
    [XmlAttribute("orid")]
    [BindNever]
    public decimal orid {get; set;} = 3;

    [MinLength(1)]
    [MaxLength(13)]
    [XmlText()]
    public string value { get; set; }

  }
  public class OversiktOverEndringenegrp9788{
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public Guid AltinnRowId { get; set; }

    public bool AltinnRowIdSpecified()
    {
      return AltinnRowId == default;
    }

    [Range(1,Int32.MaxValue)]
    [XmlAttribute("gruppeid")]
    [BindNever]
    public decimal gruppeid {get; set;} = 9788;

    [XmlElement("SkattemeldingEndringEtterFristPost-datadef-37130")]
    [JsonProperty("SkattemeldingEndringEtterFristPost-datadef-37130")]
    [JsonPropertyName("SkattemeldingEndringEtterFristPost-datadef-37130")]
    public SkattemeldingEndringEtterFristPostdatadef37130 SkattemeldingEndringEtterFristPostdatadef37130 { get; set; }

    [XmlElement("SkattemeldingEndringEtterFristOpprinneligBelop-datadef-37131")]
    [JsonProperty("SkattemeldingEndringEtterFristOpprinneligBelop-datadef-37131")]
    [JsonPropertyName("SkattemeldingEndringEtterFristOpprinneligBelop-datadef-37131")]
    public SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131? SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131 { get; set; }

    [XmlElement("SkattemeldingEndringEtterFristNyttBelop-datadef-37132")]
    [JsonProperty("SkattemeldingEndringEtterFristNyttBelop-datadef-37132")]
    [JsonPropertyName("SkattemeldingEndringEtterFristNyttBelop-datadef-37132")]
    public SkattemeldingEndringEtterFristNyttBelopdatadef37132? SkattemeldingEndringEtterFristNyttBelopdatadef37132 { get; set; }

    [XmlElement("SkattemeldingEndringEtterFristKommentar-datadef-37133")]
    [JsonProperty("SkattemeldingEndringEtterFristKommentar-datadef-37133")]
    [JsonPropertyName("SkattemeldingEndringEtterFristKommentar-datadef-37133")]
    public SkattemeldingEndringEtterFristKommentardatadef37133 SkattemeldingEndringEtterFristKommentardatadef37133 { get; set; }

    [XmlElement("fileUpload")]
    [JsonProperty("fileUpload")]
    [JsonPropertyName("fileUpload")]
    public string fileUpload { get; set; }

    [XmlElement("fileUploadList")]
    [JsonProperty("fileUploadList")]
    [JsonPropertyName("fileUploadList")]
    public List<string> fileUploadList { get; set; }

    [XmlElement("isPrefill")]
    [JsonProperty("isPrefill")]
    [JsonPropertyName("isPrefill")]
    public bool isPrefill { get; set; }

    [XmlElement("nested-grp-1234")]
    [JsonProperty("nested-grp-1234")]
    [JsonPropertyName("nested-grp-1234")]
    public List<nestedgrp1234> nestedgrp1234 { get; set; }

    [XmlElement("source")]
    [JsonProperty("source")]
    [JsonPropertyName("source")]
    public string source { get; set; }

    [XmlElement("reference")]
    [JsonProperty("reference")]
    [JsonPropertyName("reference")]
    public string reference { get; set; }

  }

  public class Gruppe2{
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public Guid AltinnRowId { get; set; }

    public bool AltinnRowIdSpecified()
    {
      return AltinnRowId == default;
    }

    [Range(1,Int32.MaxValue)]
    [XmlAttribute("gruppeid")]
    [BindNever]
    public decimal gruppeid {get; set;} = 2;

    [XmlElement("felt1")]
    [JsonProperty("felt1")]
    [JsonPropertyName("felt1")]
    public SkattemeldingEndringEtterFristPostdatadef37130 Felt1 { get; set; }

    [XmlElement("teller")]
    [JsonProperty("teller")]
    [JsonPropertyName("teller")]
    public decimal? Teller { get; set; }
  }

  public class SkattemeldingEndringEtterFristPostdatadef37130{
    [Range(1,Int32.MaxValue)]
    [XmlAttribute("orid")]
    [BindNever]
    public decimal orid {get; set;} = 37130;

    [MinLength(1)]
    [MaxLength(35)]
    [XmlText()]
    public string value { get; set; }

  }
  public class SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131{
    [Range(1,Int32.MaxValue)]
    [XmlAttribute("orid")]
    [BindNever]
    public decimal orid {get; set;} = 37131;

    [Range(Int32.MinValue,Int32.MaxValue)]
    [XmlText()]
    public decimal value { get; set; }

  }
  public class SkattemeldingEndringEtterFristNyttBelopdatadef37132{
    [Range(1,Int32.MaxValue)]
    [XmlAttribute("orid")]
    [BindNever]
    public decimal orid {get; set;} = 37132;

    [Range(Int32.MinValue,Int32.MaxValue)]
    [XmlText()]
    public decimal value { get; set; }

  }
  public class SkattemeldingEndringEtterFristKommentardatadef37133{
    [Range(1,Int32.MaxValue)]
    [XmlAttribute("orid")]
    [BindNever]
    public decimal orid {get; set;} = 37133;

    [MinLength(1)]
    [MaxLength(500)]
    [XmlText()]
    public string value { get; set; }

  }
  public class nestedgrp1234{
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public Guid AltinnRowId { get; set; }

    public bool AltinnRowIdSpecified()
    {
      return AltinnRowId == default;
    }

    [Range(1,Int32.MaxValue)]
    [XmlAttribute("gruppeid")]
    [BindNever]
    public decimal gruppeid {get; set;} = 1234;

    [XmlElement("SkattemeldingEndringEtterFristPost-datadef-37130")]
    [JsonProperty("SkattemeldingEndringEtterFristPost-datadef-37130")]
    [JsonPropertyName("SkattemeldingEndringEtterFristPost-datadef-37130")]
    public SkattemeldingEndringEtterFristPostdatadef37130 SkattemeldingEndringEtterFristPostdatadef37130 { get; set; }

    [XmlElement("SkattemeldingEndringEtterFristOpprinneligBelop-datadef-37131")]
    [JsonProperty("SkattemeldingEndringEtterFristOpprinneligBelop-datadef-37131")]
    [JsonPropertyName("SkattemeldingEndringEtterFristOpprinneligBelop-datadef-37131")]
    public SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131 SkattemeldingEndringEtterFristOpprinneligBelopdatadef37131 { get; set; }

    [XmlElement("SkattemeldingEndringEtterFristNyttBelop-datadef-37132")]
    [JsonProperty("SkattemeldingEndringEtterFristNyttBelop-datadef-37132")]
    [JsonPropertyName("SkattemeldingEndringEtterFristNyttBelop-datadef-37132")]
    public SkattemeldingEndringEtterFristNyttBelopdatadef37132 SkattemeldingEndringEtterFristNyttBelopdatadef37132 { get; set; }

    [XmlElement("SkattemeldingEndringEtterFristKommentar-datadef-37133")]
    [JsonProperty("SkattemeldingEndringEtterFristKommentar-datadef-37133")]
    [JsonPropertyName("SkattemeldingEndringEtterFristKommentar-datadef-37133")]
    public SkattemeldingEndringEtterFristKommentardatadef37133 SkattemeldingEndringEtterFristKommentardatadef37133 { get; set; }

    [XmlElement("fileUpload")]
    [JsonProperty("fileUpload")]
    [JsonPropertyName("fileUpload")]
    public string fileUpload { get; set; }

    [XmlElement("fileUploadList")]
    [JsonProperty("fileUploadList")]
    [JsonPropertyName("fileUploadList")]
    public List<string> fileUploadList { get; set; }

    [XmlElement("extraOptionsToggle")]
    [JsonProperty("extraOptionsToggle")]
    [JsonPropertyName("extraOptionsToggle")]
    public string extraOptionsToggle { get; set; }

    [XmlElement("extraOptions")]
    [JsonProperty("extraOptions")]
    [JsonPropertyName("extraOptions")]
    public string extraOptions { get; set; }

    [XmlElement("source")]
    [JsonProperty("source")]
    [JsonPropertyName("source")]
    public string source { get; set; }

    [XmlElement("reference")]
    [JsonProperty("reference")]
    [JsonPropertyName("reference")]
    public string reference { get; set; }

    [XmlElement("hideComment")]
    [JsonProperty("hideComment")]
    [JsonPropertyName("hideComment")]
    public string hideComment { get; set; }

  }
}
