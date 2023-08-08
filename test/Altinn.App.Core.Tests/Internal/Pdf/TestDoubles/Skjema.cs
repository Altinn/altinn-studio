using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Newtonsoft.Json;

namespace Altinn.App.Core.Internal.Pdf.TestDoubles;

public class Skjema
{
    [XmlElement("melding", Order = 1)]
    [JsonProperty("melding")]
    [JsonPropertyName("melding")]
    public Dummy Melding { get; set; }
}

public class Dummy
{
    [XmlElement("name", Order = 1)]
    [JsonProperty("name")]
    [JsonPropertyName("name")]
    public string Name { get; set; }

    [XmlElement("random", Order = 2)]
    [JsonProperty("random")]
    [JsonPropertyName("random")]
    public string Random { get; set; }

    [XmlElement("tags", Order = 3)]
    [JsonProperty("tags")]
    [JsonPropertyName("tags")]
    public string Tags { get; set; }

    [XmlElement("simple_list", Order = 4)]
    [JsonProperty("simple_list")]
    [JsonPropertyName("simple_list")]
    public ValuesList SimpleList { get; set; }

    [XmlElement("nested_list", Order = 5)]
    [JsonProperty("nested_list")]
    [JsonPropertyName("nested_list")]
    public List<Nested> NestedList { get; set; }

    [XmlElement("toggle", Order = 6)]
    [JsonProperty("toggle")]
    [JsonPropertyName("toggle")]
    public bool Toggle { get; set; }
}

public class ValuesList
{
    [XmlElement("simple_keyvalues", Order = 1)]
    [JsonProperty("simple_keyvalues")]
    [JsonPropertyName("simple_keyvalues")]
    public List<SimpleKeyvalues> SimpleKeyvalues { get; set; }
}

public class SimpleKeyvalues
{
    [XmlElement("key", Order = 1)]
    [JsonProperty("key")]
    [JsonPropertyName("key")]
    public string Key { get; set; }

    [XmlElement("doubleValue", Order = 2)]
    [JsonProperty("doubleValue")]
    [JsonPropertyName("doubleValue")]
    public decimal DoubleValue { get; set; }

    [Range(int.MinValue, int.MaxValue)]
    [XmlElement("intValue", Order = 3)]
    [JsonProperty("intValue")]
    [JsonPropertyName("intValue")]
    public decimal IntValue { get; set; }
}

public class Nested
{
    [XmlElement("key", Order = 1)]
    [JsonProperty("key")]
    [JsonPropertyName("key")]
    public string Key { get; set; }

    [XmlElement("values", Order = 2)]
    [JsonProperty("values")]
    [JsonPropertyName("values")]
    public List<SimpleKeyvalues> Values { get; set; }
}
