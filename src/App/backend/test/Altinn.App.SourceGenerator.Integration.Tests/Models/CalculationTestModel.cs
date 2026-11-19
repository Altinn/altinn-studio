using System;
using System.Collections.Generic;
using System.Text.Json.Serialization;
using System.Xml.Serialization;

namespace Altinn.App.SourceGenerator.Integration.Tests.Models;

/// <summary>
/// The data model of the shared calculation tests in <c>src/common/expression-tests/calculation</c>, written the way
/// Studio generates a model. It mirrors <c>calculation/model.schema.json</c>, which the frontend uses, and
/// <c>SharedCalculationTests.Model_matches_the_shared_schema</c> checks that the two agree.
/// </summary>
/// <remarks>
/// Optional numbers and booleans are nullable, as Studio generates them, so a property the data leaves out
/// serializes as null. The non-nullable value types are in <see cref="ValueTypes"/>, so they only serialize as
/// 0 and false in the tests that use that object.
/// </remarks>
public class CalculationTestModel
{
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("otherText")]
    public string? OtherText { get; set; }

    [JsonPropertyName("decimal")]
    public decimal? Decimal { get; set; }

    [JsonPropertyName("otherDecimal")]
    public decimal? OtherDecimal { get; set; }

    [JsonPropertyName("nullableDecimal")]
    public decimal? NullableDecimal { get; set; }

    [JsonPropertyName("integer")]
    public int? Integer { get; set; }

    [JsonPropertyName("boolean")]
    public bool? Boolean { get; set; }

    [JsonPropertyName("nullableBoolean")]
    public bool? NullableBoolean { get; set; }

    [JsonPropertyName("numbers")]
    public List<decimal>? Numbers { get; set; }

    [JsonPropertyName("nullableNumbers")]
    public List<decimal?>? NullableNumbers { get; set; }

    [JsonPropertyName("texts")]
    public List<string>? Texts { get; set; }

    [JsonPropertyName("valueTypes")]
    public CalculationTestValueTypes? ValueTypes { get; set; }

    [JsonPropertyName("object")]
    public CalculationTestObject? Object { get; set; }

    [JsonPropertyName("rows")]
    public List<CalculationTestRow>? Rows { get; set; }

    [JsonPropertyName("copies")]
    public List<CalculationTestRow>? Copies { get; set; }
}

public class CalculationTestValueTypes
{
    [JsonPropertyName("decimal")]
    public decimal Decimal { get; set; }

    [JsonPropertyName("integer")]
    public int Integer { get; set; }

    [JsonPropertyName("boolean")]
    public bool Boolean { get; set; }

    [JsonPropertyName("numberDefaultFive")]
    public int NumberDefaultFive { get; set; } = 5;
}

public class CalculationTestObject
{
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("decimal")]
    public decimal? Decimal { get; set; }

    [JsonPropertyName("nested")]
    public CalculationTestNested? Nested { get; set; }
}

public class CalculationTestNested
{
    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("decimal")]
    public decimal? Decimal { get; set; }
}

public class CalculationTestRow
{
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public Guid AltinnRowId { get; set; }

    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("decimal")]
    public decimal? Decimal { get; set; }

    [JsonPropertyName("total")]
    public decimal? Total { get; set; }

    [JsonPropertyName("children")]
    public List<CalculationTestChild>? Children { get; set; }
}

public class CalculationTestChild
{
    [XmlAttribute("altinnRowId")]
    [JsonPropertyName("altinnRowId")]
    [JsonIgnore(Condition = JsonIgnoreCondition.WhenWritingDefault)]
    public Guid AltinnRowId { get; set; }

    [JsonPropertyName("text")]
    public string? Text { get; set; }

    [JsonPropertyName("decimal")]
    public decimal? Decimal { get; set; }
}
