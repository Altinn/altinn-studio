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

  }
}
