using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Newtonsoft.Json;

namespace Altinn.App.Api.Tests.Data.apps.tdd.contributer_restriction.models;

public class Skjema
{
    [XmlElement("melding", Order = 1)]
    [JsonProperty("melding")]
    [JsonPropertyName("melding")]
    public Dummy Melding { get; set; } = default!;
}

public class Dummy
{
    [XmlElement("name", Order = 1)]
    [JsonProperty("name")]
    [JsonPropertyName("name")]
    public string Name { get; set; } = default!;

    [XmlElement("random", Order = 2)]
    [JsonProperty("random")]
    [JsonPropertyName("random")]
    public string Random { get; set; } = default!;

    [XmlElement("tags", Order = 3)]
    [JsonProperty("tags")]
    [JsonPropertyName("tags")]
    public string Tags { get; set; } = default!;

    [XmlElement("simple_list", Order = 4)]
    [JsonProperty("simple_list")]
    [JsonPropertyName("simple_list")]
    public ValuesList SimpleList { get; set; } = default!;

    [XmlElement("nested_list", Order = 5)]
    [JsonProperty("nested_list")]
    [JsonPropertyName("nested_list")]
    public List<Nested> NestedList { get; set; } = default!;

    [XmlElement("toggle", Order = 6)]
    [JsonProperty("toggle")]
    [JsonPropertyName("toggle")]
    public bool Toggle { get; set; } = default!;
}

public class ValuesList
{
    [XmlElement("simple_keyvalues", Order = 1)]
    [JsonProperty("simple_keyvalues")]
    [JsonPropertyName("simple_keyvalues")]
    public List<SimpleKeyvalues> SimpleKeyvalues { get; set; } = default!;
}

public class SimpleKeyvalues
{
    [XmlElement("key", Order = 1)]
    [JsonProperty("key")]
    [JsonPropertyName("key")]
    public string Key { get; set; } = default!;

    [XmlElement("doubleValue", Order = 2)]
    [JsonProperty("doubleValue")]
    [JsonPropertyName("doubleValue")]
    public decimal DoubleValue { get; set; } = default!;

    [Range(int.MinValue, int.MaxValue)]
    [XmlElement("intValue", Order = 3)]
    [JsonProperty("intValue")]
    [JsonPropertyName("intValue")]
    public decimal IntValue { get; set; } = default!;
}

public class Nested
{
    [XmlElement("key", Order = 1)]
    [JsonProperty("key")]
    [JsonPropertyName("key")]
    public string Key { get; set; } = default!;

    [XmlElement("values", Order = 2)]
    [JsonProperty("values")]
    [JsonPropertyName("values")]
    public List<SimpleKeyvalues> Values { get; set; } = default!;
}