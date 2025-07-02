#nullable disable
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;
namespace Altinn.App.Models.Model
{
  [XmlRoot(ElementName="Model")]
  public class Model
  {
    [XmlElement("inputfield", Order = 1)]
    [JsonProperty("inputfield")]
    [JsonPropertyName("inputfield")]
    public string inputfield { get; set; }

    [XmlElement("shortAnswerInput", Order = 2)]
    [JsonProperty("shortAnswerInput")]
    [JsonPropertyName("shortAnswerInput")]
    public string shortAnswerInput { get; set; }

    [XmlElement("longAnswerInput", Order = 3)]
    [JsonProperty("longAnswerInput")]
    [JsonPropertyName("longAnswerInput")]
    public string longAnswerInput { get; set; }

    [XmlElement("radioButtonInput", Order = 4)]
    [JsonProperty("radioButtonInput")]
    [JsonPropertyName("radioButtonInput")]
    public string radioButtonInput { get; set; }

    [RegularExpression(@"[A-Za-z,æøå]*(kjoringISkogen)[A-Za-z,æøå]*")]
    [XmlElement("checkboxesInput", Order = 5)]
    [JsonProperty("checkboxesInput")]
    [JsonPropertyName("checkboxesInput")]
    public string checkboxesInput { get; set; }

    [XmlElement("nestedInput", Order = 6)]
    [JsonProperty("nestedInput")]
    [JsonPropertyName("nestedInput")]
    public string nestedInput { get; set; }

    [XmlElement("nestedInput2", Order = 7)]
    [JsonProperty("nestedInput2")]
    [JsonPropertyName("nestedInput2")]
    public string nestedInput2 { get; set; }

    [XmlElement("nestedInput3", Order = 8)]
    [JsonProperty("nestedInput3")]
    [JsonPropertyName("nestedInput3")]
    public string nestedInput3 { get; set; }

    [XmlElement("streetnr", Order = 9)]
    [JsonProperty("streetnr")]
    [JsonPropertyName("streetnr")]
    public string streetnr { get; set; }

    [XmlElement("postnr", Order = 10)]
    [JsonProperty("postnr")]
    [JsonPropertyName("postnr")]
    public string postnr { get; set; }

    [XmlElement("city", Order = 11)]
    [JsonProperty("city")]
    [JsonPropertyName("city")]
    public string city { get; set; }

    [XmlElement("co", Order = 12)]
    [JsonProperty("co")]
    [JsonPropertyName("co")]
    public string co { get; set; }

    [XmlElement("street", Order = 13)]
    [JsonProperty("street")]
    [JsonPropertyName("street")]
    public string street { get; set; }

    [XmlElement("GridExample", Order = 14)]
    [JsonProperty("GridExample")]
    [JsonPropertyName("GridExample")]
    public GridExample GridExample { get; set; }

    [XmlElement("dropdown", Order = 15)]
    [JsonProperty("dropdown")]
    [JsonPropertyName("dropdown")]
    public string dropdown { get; set; }

    [XmlElement("multipleSelect", Order = 16)]
    [JsonProperty("multipleSelect")]
    [JsonPropertyName("multipleSelect")]
    public string multipleSelect { get; set; }

    [XmlElement("repeatingGroup", Order = 17)]
    [JsonProperty("repeatingGroup")]
    [JsonPropertyName("repeatingGroup")]
    public List<RepeatingGroupExample> repeatingGroup { get; set; }

    [XmlElement("nestedRepeatingGroup", Order = 18)]
    [JsonProperty("nestedRepeatingGroup")]
    [JsonPropertyName("nestedRepeatingGroup")]
    public List<RepeatingGroupWithNestedGroup> nestedRepeatingGroup { get; set; }

    [XmlElement("list", Order = 19)]
    [JsonProperty("list")]
    [JsonPropertyName("list")]
    public string list { get; set; }

    [XmlElement("LikertExample", Order = 20)]
    [JsonProperty("LikertExample")]
    [JsonPropertyName("LikertExample")]
    public List<LikertQuestion> LikertExample { get; set; }

    [XmlElement("DatepickerExample", Order = 21)]
    [JsonProperty("DatepickerExample")]
    [JsonPropertyName("DatepickerExample")]
    public string DatepickerExample { get; set; }

    [XmlElement("mapComponent", Order = 22)]
    [JsonProperty("mapComponent")]
    [JsonPropertyName("mapComponent")]
    public string mapComponent { get; set; }

    [Range(Double.MinValue, 100d)]
    [XmlElement("numberPercentage", Order = 23)]
    [JsonProperty("numberPercentage")]
    [JsonPropertyName("numberPercentage")]
    public decimal? numberPercentage { get; set; }

    public bool ShouldSerializenumberPercentage() => numberPercentage.HasValue;

    [XmlElement("anyNumber", Order = 24)]
    [JsonProperty("anyNumber")]
    [JsonPropertyName("anyNumber")]
    public decimal? anyNumber { get; set; }

    public bool ShouldSerializeanyNumber() => anyNumber.HasValue;

    [XmlElement("checkboxForCard", Order = 25)]
    [JsonProperty("checkboxForCard")]
    [JsonPropertyName("checkboxForCard")]
    public string checkboxForCard { get; set; }

    [XmlElement("Numbers", Order = 26)]
    [JsonProperty("Numbers")]
    [JsonPropertyName("Numbers")]
    public Numbers Numbers { get; set; }

    [XmlElement("ListGroupExample", Order = 27)]
    [JsonProperty("ListGroupExample")]
    [JsonPropertyName("ListGroupExample")]
    public List<ListGroupExample> ListGroupExample { get; set; }

    [XmlElement("checkboxesPersons", Order = 28)]
    [JsonProperty("checkboxesPersons")]
    [JsonPropertyName("checkboxesPersons")]
    public string checkboxesPersons { get; set; }

    [XmlElement("Dates", Order = 29)]
    [JsonProperty("Dates")]
    [JsonPropertyName("Dates")]
    public Dates Dates { get; set; }

    [XmlElement("CheckboxesGroupExample", Order = 30)]
    [JsonProperty("CheckboxesGroupExample")]
    [JsonPropertyName("CheckboxesGroupExample")]
    public List<CheckboxesGroupExample> CheckboxesGroupExample { get; set; }

    [XmlElement("MultiselectGroupExample", Order = 31)]
    [JsonProperty("MultiselectGroupExample")]
    [JsonPropertyName("MultiselectGroupExample")]
    public List<MultiselectGroupExample> MultiselectGroupExample { get; set; }

    [XmlElement("DatepickerMaxDateExample", Order = 32)]
    [JsonProperty("DatepickerMaxDateExample")]
    [JsonPropertyName("DatepickerMaxDateExample")]
    public string DatepickerMaxDateExample { get; set; }

    [XmlElement("DatepickerMinDateExample", Order = 33)]
    [JsonProperty("DatepickerMinDateExample")]
    [JsonPropertyName("DatepickerMinDateExample")]
    public string DatepickerMinDateExample { get; set; }

  }

  public class GridExample
  {
    [XmlElement("ExampleDate", Order = 1)]
    [JsonProperty("ExampleDate")]
    [JsonPropertyName("ExampleDate")]
    public string ExampleDate { get; set; }

    [XmlElement("ExampleDropdown", Order = 2)]
    [JsonProperty("ExampleDropdown")]
    [JsonPropertyName("ExampleDropdown")]
    public string ExampleDropdown { get; set; }

    [XmlElement("ExampleMultiSelect", Order = 3)]
    [JsonProperty("ExampleMultiSelect")]
    [JsonPropertyName("ExampleMultiSelect")]
    public string ExampleMultiSelect { get; set; }

    [XmlElement("ExampleTextArea", Order = 4)]
    [JsonProperty("ExampleTextArea")]
    [JsonPropertyName("ExampleTextArea")]
    public string ExampleTextArea { get; set; }

    [MaxLength(7)]
    [XmlElement("ExampleInput", Order = 5)]
    [JsonProperty("ExampleInput")]
    [JsonPropertyName("ExampleInput")]
    public string ExampleInput { get; set; }

    [XmlElement("ExampleRadio", Order = 6)]
    [JsonProperty("ExampleRadio")]
    [JsonPropertyName("ExampleRadio")]
    public string ExampleRadio { get; set; }

    [XmlElement("ExampleCheckbox", Order = 7)]
    [JsonProperty("ExampleCheckbox")]
    [JsonPropertyName("ExampleCheckbox")]
    public string ExampleCheckbox { get; set; }

    [XmlElement("ExampleInputTwo", Order = 8)]
    [JsonProperty("ExampleInputTwo")]
    [JsonPropertyName("ExampleInputTwo")]
    public string ExampleInputTwo { get; set; }

    [XmlElement("ExampleInputThree", Order = 9)]
    [JsonProperty("ExampleInputThree")]
    [JsonPropertyName("ExampleInputThree")]
    public string ExampleInputThree { get; set; }

    [XmlElement("ExampleRadioTwo", Order = 10)]
    [JsonProperty("ExampleRadioTwo")]
    [JsonPropertyName("ExampleRadioTwo")]
    public string ExampleRadioTwo { get; set; }

    [XmlElement("ExampleRadioThree", Order = 11)]
    [JsonProperty("ExampleRadioThree")]
    [JsonPropertyName("ExampleRadioThree")]
    public string ExampleRadioThree { get; set; }

    [XmlElement("ExampleCheckboxTwo", Order = 12)]
    [JsonProperty("ExampleCheckboxTwo")]
    [JsonPropertyName("ExampleCheckboxTwo")]
    public string ExampleCheckboxTwo { get; set; }

    [XmlElement("ExampleCheckboxThree", Order = 13)]
    [JsonProperty("ExampleCheckboxThree")]
    [JsonPropertyName("ExampleCheckboxThree")]
    public string ExampleCheckboxThree { get; set; }

  }

  public class RepeatingGroupExample
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("name", Order = 1)]
    [JsonProperty("name")]
    [JsonPropertyName("name")]
    public string name { get; set; }

    [Range(Double.MinValue, 100d)]
    [XmlElement("points", Order = 2)]
    [JsonProperty("points")]
    [JsonPropertyName("points")]
    public decimal? points { get; set; }

    public bool ShouldSerializepoints() => points.HasValue;

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("date", Order = 3)]
    [JsonProperty("date")]
    [JsonPropertyName("date")]
    public string date { get; set; }

  }

  public class RepeatingGroupWithNestedGroup
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("name", Order = 1)]
    [JsonProperty("name")]
    [JsonPropertyName("name")]
    public string name { get; set; }

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("points", Order = 2)]
    [JsonProperty("points")]
    [JsonPropertyName("points")]
    public decimal? points { get; set; }

    public bool ShouldSerializepoints() => points.HasValue;

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("date", Order = 3)]
    [JsonProperty("date")]
    [JsonPropertyName("date")]
    public string date { get; set; }

    [XmlElement("cars", Order = 4)]
    [JsonProperty("cars")]
    [JsonPropertyName("cars")]
    public List<NestedGroup> cars { get; set; }

  }

  public class NestedGroup
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("carBrand", Order = 1)]
    [JsonProperty("carBrand")]
    [JsonPropertyName("carBrand")]
    public string carBrand { get; set; }

    [XmlElement("carModel", Order = 2)]
    [JsonProperty("carModel")]
    [JsonPropertyName("carModel")]
    public string carModel { get; set; }

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("modelYear", Order = 3)]
    [JsonProperty("modelYear")]
    [JsonPropertyName("modelYear")]
    public decimal? modelYear { get; set; }

    public bool ShouldSerializemodelYear() => modelYear.HasValue;

  }

  public class LikertQuestion
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [XmlElement("Id", Order = 1)]
    [JsonProperty("Id")]
    [JsonPropertyName("Id")]
    public string Id { get; set; }

    [XmlElement("Answer", Order = 2)]
    [JsonProperty("Answer")]
    [JsonPropertyName("Answer")]
    public string Answer { get; set; }

  }

  public class Numbers
  {
    [XmlElement("TotalGjeld", Order = 1)]
    [JsonProperty("TotalGjeld")]
    [JsonPropertyName("TotalGjeld")]
    public decimal? TotalGjeld { get; set; }

    public bool ShouldSerializeTotalGjeld() => TotalGjeld.HasValue;

    [XmlElement("Gjeldsfordeling", Order = 2)]
    [JsonProperty("Gjeldsfordeling")]
    [JsonPropertyName("Gjeldsfordeling")]
    public Gjeldsfordeling Gjeldsfordeling { get; set; }

  }

  public class Gjeldsfordeling
  {
    [Range(0d, 100d)]
    [XmlElement("Prosent", Order = 1)]
    [JsonProperty("Prosent")]
    [JsonPropertyName("Prosent")]
    public decimal? Prosent { get; set; }

    public bool ShouldSerializeProsent() => Prosent.HasValue;

    [XmlElement("Belop", Order = 2)]
    [JsonProperty("Belop")]
    [JsonPropertyName("Belop")]
    public decimal? Belop { get; set; }

    public bool ShouldSerializeBelop() => Belop.HasValue;

  }

  public class ListGroupExample
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("age", Order = 1)]
    [JsonProperty("age")]
    [JsonPropertyName("age")]
    public decimal? age { get; set; }

    public bool ShouldSerializeage() => age.HasValue;

    [XmlElement("profession", Order = 2)]
    [JsonProperty("profession")]
    [JsonPropertyName("profession")]
    public string profession { get; set; }

    [XmlElement("surname", Order = 3)]
    [JsonProperty("surname")]
    [JsonPropertyName("surname")]
    public string surname { get; set; }

    [XmlElement("Internal", Order = 4)]
    [JsonProperty("Internal")]
    [JsonPropertyName("Internal")]
    public Internal Internal { get; set; }

    [XmlElement("Name", Order = 5)]
    [JsonProperty("Name")]
    [JsonPropertyName("Name")]
    public Name Name { get; set; }

  }

  public class Internal
  {
    [XmlElement("isChecked", Order = 1)]
    [JsonProperty("isChecked")]
    [JsonPropertyName("isChecked")]
    public bool? isChecked { get; set; }

    public bool ShouldSerializeisChecked() => isChecked.HasValue;

  }

  public class Name
  {
    [XmlElement("firstname", Order = 1)]
    [JsonProperty("firstname")]
    [JsonPropertyName("firstname")]
    public string firstname { get; set; }

    [XmlElement("id", Order = 2)]
    [JsonProperty("id")]
    [JsonPropertyName("id")]
    public decimal? id { get; set; }

    public bool ShouldSerializeid() => id.HasValue;

  }

  public class Dates
  {
    [XmlElement("SetDate", Order = 1)]
    [JsonProperty("SetDate")]
    [JsonPropertyName("SetDate")]
    public string SetDate { get; set; }

    [XmlElement("String", Order = 2)]
    [JsonProperty("String")]
    [JsonPropertyName("String")]
    public DateTime? String { get; set; }

    public bool ShouldSerializeString() => String.HasValue;

    [XmlElement("DateTime", Order = 3)]
    [JsonProperty("DateTime")]
    [JsonPropertyName("DateTime")]
    public DateTime? DateTime { get; set; }

    public bool ShouldSerializeDateTime() => DateTime.HasValue;

    [RegularExpression(@"^[0-9]{4}-(0[1-9]|1[0-2])-(0[1-9]|[1-2][0-9]|3[0-1])$")]
    [XmlElement("DateOnly", Order = 4)]
    [JsonProperty("DateOnly")]
    [JsonPropertyName("DateOnly")]
    public string DateOnly { get; set; }

    [XmlElement("FormatStringBackend", Order = 5)]
    [JsonProperty("FormatStringBackend")]
    [JsonPropertyName("FormatStringBackend")]
    public string FormatStringBackend { get; set; }

    [XmlElement("FormatDateTimeBackend", Order = 6)]
    [JsonProperty("FormatDateTimeBackend")]
    [JsonPropertyName("FormatDateTimeBackend")]
    public string FormatDateTimeBackend { get; set; }

    [XmlElement("FormatDateOnlyBackend", Order = 7)]
    [JsonProperty("FormatDateOnlyBackend")]
    [JsonPropertyName("FormatDateOnlyBackend")]
    public string FormatDateOnlyBackend { get; set; }

  }

  public class CheckboxesGroupExample
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("age", Order = 1)]
    [JsonProperty("age")]
    [JsonPropertyName("age")]
    public decimal? age { get; set; }

    public bool ShouldSerializeage() => age.HasValue;

    [XmlElement("profession", Order = 2)]
    [JsonProperty("profession")]
    [JsonPropertyName("profession")]
    public string profession { get; set; }

    [XmlElement("surname", Order = 3)]
    [JsonProperty("surname")]
    [JsonPropertyName("surname")]
    public string surname { get; set; }

    [XmlElement("Internal", Order = 4)]
    [JsonProperty("Internal")]
    [JsonPropertyName("Internal")]
    public Internal Internal { get; set; }

    [XmlElement("Name", Order = 5)]
    [JsonProperty("Name")]
    [JsonPropertyName("Name")]
    public Name Name { get; set; }

  }

  public class MultiselectGroupExample
  {
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    [Newtonsoft.Json.JsonIgnore]
    public Guid AltinnRowId { get; set; }

    public bool ShouldSerializeAltinnRowId() => AltinnRowId != default;

    [Range(Double.MinValue,Double.MaxValue)]
    [XmlElement("age", Order = 1)]
    [JsonProperty("age")]
    [JsonPropertyName("age")]
    public decimal? age { get; set; }

    public bool ShouldSerializeage() => age.HasValue;

    [XmlElement("profession", Order = 2)]
    [JsonProperty("profession")]
    [JsonPropertyName("profession")]
    public string profession { get; set; }

    [XmlElement("surname", Order = 3)]
    [JsonProperty("surname")]
    [JsonPropertyName("surname")]
    public string surname { get; set; }

    [XmlElement("Internal", Order = 4)]
    [JsonProperty("Internal")]
    [JsonPropertyName("Internal")]
    public Internal Internal { get; set; }

    [XmlElement("Name", Order = 5)]
    [JsonProperty("Name")]
    [JsonPropertyName("Name")]
    public Name Name { get; set; }

  }
}
