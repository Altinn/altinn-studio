using System.Collections;
using NanoJsonReader;
using Xunit.Abstractions;

namespace Altinn.App.SourceGenerator.Tests.NanoJsonReader;

public class NanoJsonReaderTests(ITestOutputHelper output)
{
    [Fact]
    public void Test()
    {
        string json = """
            {
                "number": 1,
                "bigNumber": 233e+10,
                "true": true,
                "false": false,
                "null": null,
                "string": "string",
                "stringWithEscapes": "string with \"escapes\"",
                "stringWithEscapes2": "string with \\\\escapes",
                "stringWithEscapes3": "string with \\\\n",
                "array": [1, 2, 3],
                "array2": [1, 2, 3, "string", true, false, null],
                "object": {
                    "number": 1,
                    "bigNumber": 233e+10,
                    "true": true,
                    "false": false,
                    "null": null,
                    "string": "string",
                    "stringWithEscapes": "string with \"escapes\"",
                    "stringWithEscapes2": "string with \\\\escapes",
                    "stringWithEscapes3": "string with \\\\n",
                    "array": [1, 2, 3],
                    "array2": [1, 2, 3, "string", true, false, null]
                }
            }
            """;

        JsonValue root = JsonValue.Parse(json);
        Assert.Equal(JsonType.Object, root.Type);

        Dictionary<string, object?> expectedValues = new()
        {
            { "number", 1.0 },
            { "bigNumber", 233e+10 },
            { "true", true },
            { "false", false },
            { "null", null },
            { "string", "string" },
            { "stringWithEscapes", "string with \"escapes\"" },
            { "stringWithEscapes2", @"string with \\escapes" },
            { "stringWithEscapes3", @"string with \\n" },
            {
                "array",
                new List<double> { 1, 2, 3 }
            },
            {
                "array2",
                new List<object?> { 1.0, 2.0, 3.0, "string", true, false, null }
            },
            {
                "object",
                new Dictionary<string, object?>
                {
                    { "number", 1.0 },
                    { "bigNumber", 233e+10 },
                    { "true", true },
                    { "false", false },
                    { "null", null },
                    { "string", "string" },
                    { "stringWithEscapes", "string with \"escapes\"" },
                    { "stringWithEscapes2", @"string with \\escapes" },
                    { "stringWithEscapes3", @"string with \\n" },
                    {
                        "array",
                        new List<double> { 1, 2, 3 }
                    },
                    {
                        "array2",
                        new List<object?> { 1.0, 2.0, 3.0, "string", true, false, null }
                    },
                }
            },
        };
        AssertEquivalency(expectedValues, root);
    }

    [Fact]
    public void TestSimple()
    {
        string json = """
            {
                "array": [1, 2, 3],
                "array2": [
                    1,
                    2,
                    3,
                    "string\n\r\b\t\f\\v\u0020",
                    true,
                    {"key": "value"},
                    false,
                    null],
            }
            """;

        JsonValue root = JsonValue.Parse(json);
        Assert.Equal(JsonType.Object, root.Type);

        Dictionary<string, object> expectedValues = new()
        {
            {
                "array",
                new List<double> { 1, 2, 3 }
            },
            {
                "array2",
                new List<object?>
                {
                    1.0,
                    2.0,
                    3.0,
                    "string\n\r\b\t\f\\v\u0020",
                    true,
                    new Dictionary<string, object?>() { { "key", "value" } },
                    false,
                    null,
                }
            },
        };
        AssertEquivalency(expectedValues, root);
    }

    private void AssertEquivalency(object? expectedValue, JsonValue currentValue)
    {
        output.WriteLine("asserting " + expectedValue);
        switch (expectedValue)
        {
            case null:
                Assert.Equal(JsonType.Null, currentValue.Type);
                break;
            case string s:
                Assert.Equal(JsonType.String, currentValue.Type);
                Assert.Equal(s, currentValue.GetString());
                Assert.True(currentValue.StringEquals(s.AsSpan()));
                break;
            case double d:
                Assert.Equal(JsonType.Number, currentValue.Type);
                Assert.Equal(d, currentValue.GetNumber());
                break;
            case bool b:
                Assert.Equal(JsonType.Boolean, currentValue.Type);
                Assert.Equal(b, currentValue.GetBool());
                break;
            case IDictionary dictionary:
                Assert.Equal(JsonType.Object, currentValue.Type);
                using (var propEnumerator = currentValue.GetObjectValues().GetEnumerator())
                {
                    foreach (DictionaryEntry entry in dictionary)
                    {
                        Assert.True(propEnumerator.MoveNext());
                        Assert.Equal(entry.Key, propEnumerator.Current.Key);
                        AssertEquivalency(entry.Value, propEnumerator.Current.Value);
                    }
                    Assert.False(propEnumerator.MoveNext());
                }
                break;
            case ICollection collection:
                Assert.Equal(JsonType.Array, currentValue.Type);
                using (var arrayEnumerator = currentValue.GetArrayValues().GetEnumerator())
                {
                    foreach (var item in collection)
                    {
                        Assert.True(arrayEnumerator.MoveNext());
                        AssertEquivalency(item, arrayEnumerator.Current);
                    }
                    Assert.False(arrayEnumerator.MoveNext());
                }

                break;
            default:
                throw new Exception($"Unexpected value type {expectedValue.GetType()}, assert with only json types");
        }
    }

    [Fact]
    public void TestAppMetadata()
    {
        var applicationMetadata = """
            {
                "$schema": "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/application/application-metadata.schema.v1.json",
                "id": "ttd/source-generator-test",
                "title": {},
                "org": "ttd",
                "partyTypesAllowed": {},
                "dataTypes": [{
                  "id": "form",
                  "appLogic": {
                      "classRef": "Altinn.App.SourceGenerator.Tests.Skjema"
                  }
                }]
            }

            """;

        JsonValue root = JsonValue.Parse(applicationMetadata);
        Assert.Equal(JsonType.Object, root.Type);
        var expected = new Dictionary<string, object?>()
        {
            {
                "$schema",
                "https://altinncdn.no/toolkits/altinn-app-frontend/4/schemas/json/application/application-metadata.schema.v1.json"
            },
            { "id", "ttd/source-generator-test" },
            { "title", new Dictionary<string, object?>() },
            { "org", "ttd" },
            { "partyTypesAllowed", new Dictionary<string, object?>() },
            {
                "dataTypes",
                new List<object?>()
                {
                    new Dictionary<string, object?>()
                    {
                        { "id", "form" },
                        {
                            "appLogic",
                            new Dictionary<string, object?>()
                            {
                                { "classRef", "Altinn.App.SourceGenerator.Tests.Skjema" },
                            }
                        },
                    },
                }
            },
        };
        AssertEquivalency(expected, root);
    }

    [Theory]
    [InlineData("""{"\"}""", 1, 5)]
    [InlineData("""{"b": {},"e":tRue}""", 13, 17)]
    [InlineData("""{"d":4true}""", 6, null)]
    [InlineData("""{"e"4.4.4}""", 4, null)]
    [InlineData("""{ """, 1, 2)]
    [InlineData("""{""", 1, null)]
    public void TestInvalid(string json, int start, int? end)
    {
        var exception = Assert.Throws<NanoJsonException>(() => JsonValue.Parse(json).GetProperty("e"));
        output.WriteLine(exception.Message);
        Assert.Equal(start, exception.StartIndex);
        Assert.Equal(end, exception.EndIndex);
    }

    [Theory]
    [InlineData("""{"e":4.4.4}""", 5, 10)]
    [InlineData("""{"e":4.4e43e}""", 5, 12)]
    public void TestInvalidNumber(string json, int start, int? end)
    {
        var exception = Assert.Throws<NanoJsonException>(() => JsonValue.Parse(json).GetProperty("e")?.GetNumber());
        output.WriteLine(exception.Message);
        Assert.Equal(start, exception.StartIndex);
        Assert.Equal(end, exception.EndIndex);
    }

    [Theory]
    [InlineData("""{"e":"\u234ø"}""", 5, 13)]
    [InlineData("""{"e":"\"}""", 5, 9)]
    [InlineData("""{"e":"\ø"}""", 5, 9)]
    [InlineData("""{"":[2,null,}, "e"}""", 12, null)]
    [InlineData("""{"":[2,null}, "e"}""", 11, null)]
    public void TestInvalidString(string json, int start, int? end)
    {
        var exception = Assert.Throws<NanoJsonException>(() => JsonValue.Parse(json).GetProperty("e")?.GetString());
        output.WriteLine(exception.Message);
        Assert.Equal(start, exception.StartIndex);
        Assert.Equal(end, exception.EndIndex);
    }

    [Theory]
    [InlineData("""[]""")]
    [InlineData("""[null,]""")]
    [InlineData("""{}""")]
    [InlineData("""{"e":null,}""")]
    [InlineData("""null""")]
    [InlineData("""true""")]
    [InlineData("""false""")]
    [InlineData("""234e-23""")]
    public void TestSkipProperties(string skip)
    {
        var value = JsonValue.Parse($$"""{"skip": {{skip}}, "end":"e\bnd"}""");
        var end = value.GetProperty("end");
        Assert.NotNull(end);
        Assert.Equal(JsonType.String, end.Type);
        Assert.Equal("e\bnd", end.GetString());
        Assert.Equal("\"e\\bnd\"", end.ToString());
    }
}
