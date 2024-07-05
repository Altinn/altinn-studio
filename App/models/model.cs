#nullable disable
using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Linq;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;
namespace Altinn.App.Models.model
{
  [XmlRoot(ElementName="model")]
  public class model
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

    [XmlElement("checkboxesInput", Order = 5)]
    [JsonProperty("checkboxesInput")]
    [JsonPropertyName("checkboxesInput")]
    public string checkboxesInput { get; set; }

    [XmlElement("nestedInput", Order = 6)]
    [JsonProperty("nestedInput")]
    [JsonPropertyName("nestedInput")]
    public string nestedInput { get; set; }

    [XmlElement("streetnr", Order = 7)]
    [JsonProperty("streetnr")]
    [JsonPropertyName("streetnr")]
    public string streetnr { get; set; }

    [XmlElement("postnr", Order = 8)]
    [JsonProperty("postnr")]
    [JsonPropertyName("postnr")]
    public string postnr { get; set; }

    [XmlElement("city", Order = 9)]
    [JsonProperty("city")]
    [JsonPropertyName("city")]
    public string city { get; set; }

    [XmlElement("co", Order = 10)]
    [JsonProperty("co")]
    [JsonPropertyName("co")]
    public string co { get; set; }

    [XmlElement("street", Order = 11)]
    [JsonProperty("street")]
    [JsonPropertyName("street")]
    public string street { get; set; }

    [XmlElement("GridExample", Order = 12)]
    [JsonProperty("GridExample")]
    [JsonPropertyName("GridExample")]
    public GridExample GridExample { get; set; }

    [XmlElement("dropdown", Order = 13)]
    [JsonProperty("dropdown")]
    [JsonPropertyName("dropdown")]
    public string dropdown { get; set; }

    [XmlElement("multipleSelect", Order = 14)]
    [JsonProperty("multipleSelect")]
    [JsonPropertyName("multipleSelect")]
    public string multipleSelect { get; set; }

    [XmlElement("repeatingGroup", Order = 15)]
    [JsonProperty("repeatingGroup")]
    [JsonPropertyName("repeatingGroup")]
    public List<RepeatingGroupExample> repeatingGroup { get; set; }

    [XmlElement("nestedRepeatingGroup", Order = 16)]
    [JsonProperty("nestedRepeatingGroup")]
    [JsonPropertyName("nestedRepeatingGroup")]
    public List<RepeatingGroupWithNestedGroup> nestedRepeatingGroup { get; set; }

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
}
