#pragma warning disable IDE1006 // Naming Styles does not matter in model classes
using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;
using System.Xml.Serialization;
using Microsoft.AspNetCore.Mvc.ModelBinding;
using Newtonsoft.Json;

namespace Altinn.App.Api.Tests.Data.apps.tdd.contributer_restriction.models;

public class Skjema
{
    [XmlElement("melding", Order = 1)]
    [JsonProperty("melding")]
    [JsonPropertyName("melding")]
    public Dummy? Melding { get; set; }
}

public class Dummy
{
    [XmlElement("name", Order = 1)]
    [JsonProperty("name")]
    [JsonPropertyName("name")]
    public string? Name { get; set; }

    [XmlElement("random", Order = 2)]
    [JsonProperty("random")]
    [JsonPropertyName("random")]
    public string? Random { get; set; }

    [XmlElement("tags", Order = 3)]
    [JsonProperty("tags")]
    [JsonPropertyName("tags")]
    public string? Tags { get; set; }

    [XmlElement("simple_list", Order = 4)]
    [JsonProperty("simple_list")]
    [JsonPropertyName("simple_list")]
    public ValuesList? SimpleList { get; set; }

    [XmlElement("nested_list", Order = 5)]
    [JsonProperty("nested_list")]
    [JsonPropertyName("nested_list")]
    public List<Nested>? NestedList { get; set; }

    [XmlElement("toggle", Order = 6)]
    [JsonProperty("toggle")]
    [JsonPropertyName("toggle")]
    public bool Toggle { get; set; }

    [XmlElement("tag-with-attribute", IsNullable = true, Order = 7)]
    [JsonProperty("tag-with-attribute")]
    [JsonPropertyName("tag-with-attribute")]
    public TagWithAttribute? TagWithAttribute { get; set; }

    public bool ShouldSerializeTagWithAttribute()
    {
        return TagWithAttribute?.value != null;
    }

    [XmlElement("hidden", Order = 8)]
    [JsonProperty("hidden")]
    [JsonPropertyName("hidden")]
    public string? Hidden { get; set; }

    [XmlElement("SF_test", Order = 9)]
    [JsonProperty("SF_test")]
    [JsonPropertyName("SF_test")]
    public string? SF_test { get; set; }

    [XmlElement("hiddenNotRemove", Order = 10)]
    [JsonProperty("hiddenNotRemove")]
    [JsonPropertyName("hiddenNotRemove")]
    public string? HiddenNotRemove { get; set; }
}

public class TagWithAttribute
{
    [Range(1, Int32.MaxValue)]
    [XmlAttribute("orid")]
    [BindNever]
    public decimal orid { get; set; } = 34730;

    [MinLength(1)]
    [MaxLength(60)]
    [XmlText()]
    public string? value { get; set; }
}

public class ValuesList
{
    [XmlElement("simple_keyvalues", Order = 1)]
    [JsonProperty("simple_keyvalues")]
    [JsonPropertyName("simple_keyvalues")]
    public List<SimpleKeyvalues>? SimpleKeyvalues { get; set; }
}

public class SimpleKeyvalues
{
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public Guid AltinnRowId { get; set; }

    public bool AltinnRowIdSpecified()
    {
        return AltinnRowId != default;
    }

    [XmlElement("key", Order = 1)]
    [JsonProperty("key")]
    [JsonPropertyName("key")]
    public string? Key { get; set; }

    [XmlElement("doubleValue", Order = 2)]
    [JsonProperty("doubleValue")]
    [JsonPropertyName("doubleValue")]
    public decimal? DoubleValue { get; set; }

    [Range(int.MinValue, int.MaxValue)]
    [XmlElement("intValue", Order = 3)]
    [JsonProperty("intValue")]
    [JsonPropertyName("intValue")]
    public decimal? IntValue { get; set; }
}

public class Nested
{
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [System.Text.Json.Serialization.JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public Guid AltinnRowId { get; set; }

    public bool AltinnRowIdSpecified()
    {
        return AltinnRowId != default;
    }

    [XmlElement("key", Order = 1)]
    [JsonProperty("key")]
    [JsonPropertyName("key")]
    public string? Key { get; set; }

    [XmlElement("values", Order = 2)]
    [JsonProperty("values")]
    [JsonPropertyName("values")]
    public List<SimpleKeyvalues>? Values { get; set; }
}

#pragma warning restore IDE1006 // Naming Styles
