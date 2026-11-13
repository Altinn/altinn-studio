using System.Globalization;
using System.Numerics;
using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.Json.Serialization;
using Altinn.App.Core.Internal.Expressions;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.LayoutExpressions.ExpressionEvaluatorTests;

public class ExpressionValueTests(ITestOutputHelper outputHelper)
{
    [Fact]
    public void TestNull()
    {
        Assert.Throws<NotImplementedException>(() => ExpressionValue.Null != ExpressionValue.False);
        // String? nullString = null;
        // Assert.Equal(ExpressionValue.Null, nullString);
        // double? nullDouble = null;
        // Assert.Equal(ExpressionValue.Null, nullDouble);
        // int? nullInt = null;
        // Assert.Equal(ExpressionValue.Null, nullInt);
        // bool? nullBool = null;
        // Assert.Equal(ExpressionValue.Null, nullBool);
        //
        // ExpressionValue nullValue = ExpressionValue.Null;
        // Assert.Null(nullValue.ToObject());
        // Assert.Equal(ExpressionValue.Null, nullValue);
        //
        // nullValue = ExpressionValue.FromObject(null);
        // Assert.Null(nullValue.ToObject());
        // Assert.Equal(ExpressionValue.Null, nullValue);
        //
        // Assert.Equal(0, nullValue.GetHashCode());
        //
        // var nullEqualsEmptyObject = nullValue.Equals(new { });
        // Assert.False(nullEqualsEmptyObject);
        // Assert.False(nullValue == ExpressionValue.False);
        // Assert.True(nullValue != ExpressionValue.False);
        //
        // Assert.Equal("null", nullValue.ToString());
    }

    [Fact]
    public void TestString()
    {
        var stringValue = "test";
        ExpressionValue value = stringValue;
        Assert.Equal(stringValue, value.ToObject());
        Assert.Equal(stringValue, value.String);

        value = ExpressionValue.FromObject(stringValue);
        Assert.Equal(stringValue, value.ToObject());

        Assert.Equal('"' + stringValue + '"', value.ToString());
        Assert.Throws<NotImplementedException>(() => value.GetHashCode());
        // Assert.Equal(stringValue.GetHashCode(), value.GetHashCode());
    }

    [Fact]
    public void TestDouble()
    {
        double doubleValue = 123.456;
        ExpressionValue value = doubleValue;
        Assert.Equal(doubleValue, value.ToObject());
        Assert.Equal(doubleValue, value.Number);

        value = ExpressionValue.FromObject(doubleValue);
        Assert.Equal(doubleValue, value.ToObject());

        Assert.Equal(doubleValue.ToString(CultureInfo.InvariantCulture), value.ToString());
        Assert.Throws<NotImplementedException>(() => value.GetHashCode());
        // Assert.Equal(doubleValue.GetHashCode(), value.GetHashCode());
    }

    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void TestBool(bool boolValue)
    {
        ExpressionValue valueCast = boolValue;
        Assert.Equal(boolValue, valueCast.ToObject());
        var factoryValue = boolValue ? ExpressionValue.True : ExpressionValue.False;

        var valueFromObject = ExpressionValue.FromObject(boolValue);
        Assert.Equal(boolValue, valueFromObject.ToObject());
        Assert.Equal(boolValue, valueCast.Bool);

        Assert.Equal(boolValue ? "true" : "false", valueFromObject.ToString());
        Assert.Throws<NotImplementedException>(() => factoryValue == valueCast);
        // Assert.Equal(factoryValue, valueCast);
        Assert.Throws<NotImplementedException>(() => valueFromObject.GetHashCode());
        // Assert.Equal(boolValue.GetHashCode(), valueFromObject.GetHashCode());
    }

    [Fact]
    public void TestFromObject()
    {
        Assert.Throws<NotImplementedException>(() => ExpressionValue.FromObject(null) == ExpressionValue.Null);
        // Assert.Equal((ExpressionValue)"test", ExpressionValue.FromObject((ExpressionValue)"test"));
        //
        // Assert.Equal(ExpressionValue.Null, ExpressionValue.FromObject(null));
        //
        // Assert.Equal(true, ExpressionValue.FromObject(true));
        // Assert.Equal(ExpressionValue.True, ExpressionValue.FromObject(true));
        // Assert.Equal(false, ExpressionValue.FromObject(false));
        // Assert.Equal(ExpressionValue.False, ExpressionValue.FromObject(false));
        //
        // Assert.Equal("test", ExpressionValue.FromObject("test"));
        // Assert.Equal("test", ExpressionValue.FromObject("test").String);
        //
        // Assert.Equal((float)123.456, ExpressionValue.FromObject((float)123.456).Number);
        // Assert.Equal((float)123.456, ExpressionValue.FromObject((float)123.456));
        //
        // Assert.Equal(123.456, ExpressionValue.FromObject(123.456).Number);
        // Assert.Equal(123.456, ExpressionValue.FromObject(123.456));
        //
        // Assert.Equal(123, ExpressionValue.FromObject((byte)123).Number);
        // Assert.Equal(123, ExpressionValue.FromObject((sbyte)123).Number);
        // Assert.Equal(123, ExpressionValue.FromObject((short)123).Number);
        // Assert.Equal(123, ExpressionValue.FromObject((ushort)123).Number);
        // Assert.Equal(123, ExpressionValue.FromObject(123).Number);
        // Assert.Equal(123, ExpressionValue.FromObject((uint)123).Number);
        // Assert.Equal(123, ExpressionValue.FromObject((long)123).Number);
        // Assert.Equal(123, ExpressionValue.FromObject((ulong)123).Number);
        // Assert.Equal(123, ExpressionValue.FromObject((decimal)123).Number);
        //
        // Assert.Equal(
        //     "2020-02-03T12:34:56Z",
        //     ExpressionValue.FromObject(DateTime.Parse("2020-02-03T12:34:56Z").ToUniversalTime()).String
        // );
        // Assert.Equal(
        //     "2020-02-03T12:34:56Z",
        //     ExpressionValue.FromObject(DateTime.Parse("2020-02-03T12:34:56Z").ToUniversalTime())
        // );
        //
        // Assert.Equal(
        //     "2020-02-03T12:34:56+00:00",
        //     ExpressionValue.FromObject(DateTimeOffset.Parse("2020-02-03T12:34:56+00:00")).String
        // );
        // Assert.Equal(
        //     "2020-02-03T12:34:56+00:00",
        //     ExpressionValue.FromObject(DateTimeOffset.Parse("2020-02-03T12:34:56+00:00"))
        // );
        //
        // Assert.Equal("12:34:56", ExpressionValue.FromObject(new TimeSpan(12, 34, 56)));
        // Assert.Equal("12:34:56", ExpressionValue.FromObject(new TimeSpan(12, 34, 56)).String);
        //
        // Assert.Equal("12:34:56", ExpressionValue.FromObject(new TimeOnly(12, 34, 56)));
        // Assert.Equal("12:34:56", ExpressionValue.FromObject(new TimeOnly(12, 34, 56)).String);
        //
        // Assert.Equal("2020-02-03", ExpressionValue.FromObject(new DateOnly(2020, 2, 3)));
        // Assert.Equal("2020-02-03", ExpressionValue.FromObject(new DateOnly(2020, 2, 3)).String);
        //
        // Assert.Equal(ExpressionValue.Null, ExpressionValue.FromObject(new object()));
    }

    [Theory]
    [InlineData("123.456")]
    [InlineData("123")]
    [InlineData("null")]
    [InlineData("true")]
    [InlineData("false")]
    [InlineData("\"test\"")]
    [InlineData("[]")]
    [InlineData("[1,2,3]")]
    [InlineData("[[[1,2],[3,4]],[[5,6],[7,8]]]")]
    [InlineData("[1,\"test\",true,null,[],{}]")]
    [InlineData("{}")]
    [InlineData("{\"a\":1,\"b\":\"test\",\"c\":true,\"d\":null,\"e\":[]}")]
    [InlineData("{\"a\":{\"b\":1}}")]
    [InlineData("{\"a\":[1,2,3]}")]
    [InlineData("[{\"a\":1},{\"b\":2}]")]
    public void TestJsonParsing(string json)
    {
        ExpressionValue value = JsonSerializer.Deserialize<ExpressionValue>(json);
        var roundTripJson = JsonSerializer.Serialize(value);
        Assert.Equal(json, roundTripJson);
    }

    [Fact]
    public void TestUndefined()
    {
        ExpressionValue undefinedValue = default;
        Assert.Equal(JsonValueKind.Undefined, undefinedValue.ValueKind);
        Assert.Equal("undefined", undefinedValue.ToString());
        Assert.Throws<InvalidOperationException>(() => undefinedValue.ToObject());
        Assert.Throws<InvalidCastException>(() => undefinedValue.Bool);
        Assert.Throws<InvalidCastException>(() => undefinedValue.Number);
        Assert.Throws<InvalidCastException>(() => undefinedValue.String);
        Assert.Throws<InvalidCastException>(() => undefinedValue.JsonObject);
        Assert.Throws<InvalidCastException>(() => undefinedValue.JsonArray);

        // TryDeserialize treats undefined as null for every nullable target type, including object
        Assert.True(undefinedValue.TryDeserialize(typeof(string), out var stringResult));
        Assert.Null(stringResult);
        Assert.True(undefinedValue.TryDeserialize(typeof(object), out var objectResult));
        Assert.Null(objectResult);

        Assert.Equal("null", JsonSerializer.Serialize(undefinedValue));
        Assert.Throws<NotImplementedException>(() => undefinedValue.GetHashCode());
        Assert.Throws<NotImplementedException>(() => undefinedValue.Equals(undefinedValue));
        // Assert.Throws<InvalidOperationException>(() => undefinedValue.GetHashCode());
        // Assert.Throws<InvalidOperationException>(() => undefinedValue.Equals(undefinedValue));
    }

    [Fact]
    public void NullThrowsWhenAccessedAsDifferentType()
    {
        ExpressionValue nullValue = ExpressionValue.Null;

        Assert.Throws<InvalidCastException>(() => _ = nullValue.Bool);
        Assert.Throws<InvalidCastException>(() => _ = nullValue.Number);
        Assert.Throws<InvalidCastException>(() => _ = nullValue.String);
        Assert.Throws<InvalidCastException>(() => _ = nullValue.JsonObject);
        Assert.Throws<InvalidCastException>(() => _ = nullValue.JsonArray);
        Assert.Null(nullValue.JsonNode);
        Assert.Equal(JsonValueKind.Null, nullValue.JsonElement.ValueKind);
    }

    [Fact]
    public void TestTryDeserializeVariousTypes()
    {
        TestTryDeserialize(2, 2.0, true);
        TestTryDeserialize(2.5, 2.5, true);
        TestTryDeserialize(3.0, "3", true);
        TestTryDeserialize(3.1, "3.1", true);
        TestTryDeserialize("test", "test", true);
        TestTryDeserialize(0, false, true);
        TestTryDeserialize(1, true, true);
        TestTryDeserialize(2, false, false);
        TestTryDeserialize(-1, false, false);
        TestTryDeserialize(0.1, false, false);
        TestTryDeserialize<bool?>(0, false, true);
        TestTryDeserialize<bool?>(1, true, true);
        TestTryDeserialize<bool?>(2, null, false);
        TestTryDeserialize<bool?>(-1, null, false);
        TestTryDeserialize<bool?>(0.1, null, false);
        TestTryDeserialize("0", false, true);
        TestTryDeserialize("1", true, true);
        TestTryDeserialize("2", false, false);
        TestTryDeserialize("-1", false, false);
        TestTryDeserialize("0.1", false, false);
        TestTryDeserialize("false", false, true);
        TestTryDeserialize("true", true, true);
        TestTryDeserialize("trUe", true, true);
        TestTryDeserialize("falSe", false, true);

        TestTryDeserialize<bool?>("0", false, true);
        TestTryDeserialize<bool?>("1", true, true);
        TestTryDeserialize<bool?>("2", null, false);
        TestTryDeserialize<bool?>("-1", null, false);
        TestTryDeserialize<bool?>("0.1", null, false);
        TestTryDeserialize<bool?>("false", false, true);
        TestTryDeserialize<bool?>("true", true, true);
        TestTryDeserialize<bool?>("faLse", false, true);
        TestTryDeserialize<bool?>("trUe", true, true);
        TestTryDeserialize(true, true, true);
        TestTryDeserialize(false, false, true);
        TestTryDeserialize(ExpressionValue.Null, (string?)null, true);
        TestTryDeserialize(ExpressionValue.False, (bool?)false, true);
        TestTryDeserialize(ExpressionValue.True, (bool?)true, true);
        TestTryDeserialize("3.4", 3.4, true);
        TestTryDeserialize("not a number", 0, false);
        TestTryDeserialize<int?>("not a number", null, false);
        TestTryDeserialize<int?>(ExpressionValue.Null, null, true);
        TestTryDeserialize<int?>(ExpressionValue.False, 0, true);
        TestTryDeserialize<int?>(ExpressionValue.True, 1, true);
        // Not sure what the correct string representation should be for JsonTokenType.True and JsonTokenType.False:
        // There are many possibilites "true", "True", "sann", "ja", "ok", "1"
        TestTryDeserialize<string?>(ExpressionValue.False, null, false);
        TestTryDeserialize<string?>(ExpressionValue.True, null, false);
        TestTryDeserialize<string?>(ExpressionValue.Null, null, true);
        TestTryDeserialize("2020-02-03T12:34:56Z", DateTime.Parse("2020-02-03T12:34:56Z").ToUniversalTime(), true);
        TestTryDeserialize("2020-02-03T12:34:56Z", DateTimeOffset.Parse("2020-02-03T12:34:56Z"), true);
        TestTryDeserialize("2020-02-03T13:34:56+01:00", DateTimeOffset.Parse("2020-02-03T12:34:56Z"), true);
        TestTryDeserialize("invalid date", DateTime.MinValue, false);
        TestTryDeserialize(int.MaxValue, int.MaxValue, true);
        TestTryDeserialize(int.MinValue, int.MinValue, true);
        var biggestLongRepresentableAsDouble = long.MaxValue - 1023;
        TestTryDeserialize(biggestLongRepresentableAsDouble, biggestLongRepresentableAsDouble, true);
        TestTryDeserialize(long.MinValue, long.MinValue, true);
    }

    private void TestTryDeserialize<T>(ExpressionValue value, T? expected, bool success)
    {
        outputHelper.WriteLine($"{value} -> {typeof(T).Name} {expected}: expects {(success ? "success" : "failure")}");
        if (value.TryDeserialize(out T? result))
        {
            Assert.True(success);
            Assert.Equal(expected, result);
        }
        else
        {
            Assert.Equal(expected, result);
            Assert.False(success);
        }
    }

    [Fact]
    public void FromObject_CoversAllSupportedClrTypes()
    {
        // ExpressionValue passes through unchanged
        ExpressionValue existing = "passthrough";
        Assert.Equal(JsonValueKind.String, ExpressionValue.FromObject(existing).ValueKind);
        Assert.Equal("passthrough", ExpressionValue.FromObject(existing).String);

        // null
        Assert.Equal(JsonValueKind.Null, ExpressionValue.FromObject(null).ValueKind);

        // bool
        Assert.True(ExpressionValue.FromObject(true).Bool);
        Assert.False(ExpressionValue.FromObject(false).Bool);

        // string
        Assert.Equal("test", ExpressionValue.FromObject("test").String);

        // every numeric CLR type maps to a Number
        Assert.Equal(JsonValueKind.Number, ExpressionValue.FromObject((float)1.5).ValueKind);
        Assert.Equal(JsonValueKind.Number, ExpressionValue.FromObject(2.5d).ValueKind);
        Assert.Equal(123, ExpressionValue.FromObject((byte)123).Number);
        Assert.Equal(-12, ExpressionValue.FromObject((sbyte)-12).Number);
        Assert.Equal(1234, ExpressionValue.FromObject((short)1234).Number);
        Assert.Equal(1234, ExpressionValue.FromObject((ushort)1234).Number);
        Assert.Equal(123456, ExpressionValue.FromObject(123456).Number);
        Assert.Equal(123456, ExpressionValue.FromObject((uint)123456).Number);
        Assert.Equal(123456789, ExpressionValue.FromObject((long)123456789).Number);
        Assert.Equal(123456789, ExpressionValue.FromObject((ulong)123456789).Number);
        Assert.Equal(123.456, ExpressionValue.FromObject((decimal)123.456).Number);

        // date/time types are serialized to their unquoted string representation
        Assert.Equal(
            "2020-02-03T12:34:56Z",
            ExpressionValue.FromObject(DateTime.Parse("2020-02-03T12:34:56Z").ToUniversalTime()).String
        );
        Assert.Equal(
            "2020-02-03T12:34:56+00:00",
            ExpressionValue.FromObject(DateTimeOffset.Parse("2020-02-03T12:34:56+00:00")).String
        );
        Assert.Equal("12:34:56", ExpressionValue.FromObject(new TimeSpan(12, 34, 56)).String);
        Assert.Equal("12:34:56", ExpressionValue.FromObject(new TimeOnly(12, 34, 56)).String);
        Assert.Equal("2020-02-03", ExpressionValue.FromObject(new DateOnly(2020, 2, 3)).String);

        // BigInteger -> string
        Assert.Equal(
            "123456789012345678901234567890",
            ExpressionValue.FromObject(BigInteger.Parse("123456789012345678901234567890")).String
        );

        // JsonNode -> matching value kind
        // NB: must be a double-backed node, see comment on JsonNode constructor fragility
        JsonNode node = JsonValue.Create(42.0);
        Assert.Equal(JsonValueKind.Number, ExpressionValue.FromObject(node).ValueKind);
        Assert.Equal(42.0, ExpressionValue.FromObject(node).Number);

        // fallback: arbitrary objects go through JsonSerializer
        var fallback = ExpressionValue.FromObject(new { a = 1, b = "x" });
        Assert.Equal(JsonValueKind.Object, fallback.ValueKind);
        Assert.Equal("1", fallback.JsonObject["a"]!.ToString());
        Assert.Equal("x", fallback.JsonObject["b"]!.ToString());
    }

    [Fact]
    public void NullConstructors_ProduceNullValueKind()
    {
        bool? nullBool = null;
        double? nullDouble = null;
        string? nullString = null;
        ExpressionValue fromBool = nullBool;
        ExpressionValue fromDouble = nullDouble;
        ExpressionValue fromString = nullString;
        Assert.Equal(JsonValueKind.Null, fromBool.ValueKind);
        Assert.Equal(JsonValueKind.Null, fromDouble.ValueKind);
        Assert.Equal(JsonValueKind.Null, fromString.ValueKind);
    }

    [Fact]
    public void ParameterlessConstructor_IsUndefined()
    {
        Assert.Equal(JsonValueKind.Undefined, new ExpressionValue().ValueKind);
    }

    [Fact]
    public void ImplicitOperators_JsonNodeAndJsonElement()
    {
        JsonNode nodeObject = JsonNode.Parse("""{"a":1}""")!;
        ExpressionValue fromNode = nodeObject;
        Assert.Equal(JsonValueKind.Object, fromNode.ValueKind);

        JsonNode nodeArray = JsonNode.Parse("""[1,2,3]""")!;
        fromNode = nodeArray;
        Assert.Equal(JsonValueKind.Array, fromNode.ValueKind);

        using var docObject = JsonDocument.Parse("""{"a":1}""");
        ExpressionValue fromElement = docObject.RootElement;
        Assert.Equal(JsonValueKind.Object, fromElement.ValueKind);

        using var docArray = JsonDocument.Parse("[1,2,3]");
        fromElement = docArray.RootElement;
        Assert.Equal(JsonValueKind.Array, fromElement.ValueKind);
    }

    [Fact]
    public void JsonNodeConstructor_CoversAllValueKinds()
    {
        Assert.Equal(JsonValueKind.String, ((ExpressionValue)JsonNode.Parse("\"s\"")!).ValueKind);
        Assert.Equal(JsonValueKind.Number, ((ExpressionValue)JsonNode.Parse("42")!).ValueKind);
        Assert.Equal(JsonValueKind.True, ((ExpressionValue)JsonNode.Parse("true")!).ValueKind);
        Assert.Equal(JsonValueKind.False, ((ExpressionValue)JsonNode.Parse("false")!).ValueKind);
        Assert.Equal(JsonValueKind.Object, ((ExpressionValue)JsonNode.Parse("{}")!).ValueKind);
        Assert.Equal(JsonValueKind.Array, ((ExpressionValue)JsonNode.Parse("[]")!).ValueKind);
    }

    [Fact]
    public void FromJsonString_ParsesAllKinds()
    {
        Assert.Equal(JsonValueKind.String, ExpressionValue.FromJsonString("\"hello\"").ValueKind);
        Assert.Equal("hello", ExpressionValue.FromJsonString("\"hello\"").String);
        Assert.Equal(42, ExpressionValue.FromJsonString("42").Number);
        Assert.Equal(JsonValueKind.True, ExpressionValue.FromJsonString("true").ValueKind);
        Assert.Equal(JsonValueKind.False, ExpressionValue.FromJsonString("false").ValueKind);
        Assert.Equal(JsonValueKind.Null, ExpressionValue.FromJsonString("null").ValueKind);
        Assert.Equal(JsonValueKind.Object, ExpressionValue.FromJsonString("{\"a\":1}").ValueKind);
        Assert.Equal(JsonValueKind.Array, ExpressionValue.FromJsonString("[1,2]").ValueKind);
    }

    [Fact]
    public void JsonNodeProperty_CoversAllValueKinds()
    {
        Assert.Equal("test", ((ExpressionValue)"test").JsonNode!.GetValue<string>());
        Assert.Equal(123.0, ((ExpressionValue)(double?)123).JsonNode!.GetValue<double>());
        Assert.True(ExpressionValue.True.JsonNode!.GetValue<bool>());
        Assert.False(ExpressionValue.False.JsonNode!.GetValue<bool>());
        Assert.Null(ExpressionValue.Null.JsonNode);
        Assert.Null(ExpressionValue.Undefined.JsonNode);
        Assert.IsAssignableFrom<JsonObject>(ExpressionValue.FromJsonString("{\"a\":1}").JsonNode);
        Assert.IsAssignableFrom<JsonArray>(ExpressionValue.FromJsonString("[1,2]").JsonNode);
    }

    [Fact]
    public void JsonObjectAndJsonArray_ReturnParsedNodes()
    {
        var obj = ExpressionValue.FromJsonString("{\"a\":1,\"b\":2}").JsonObject;
        Assert.Equal(2, obj.Count);
        Assert.Equal(1, obj["a"]!.GetValue<int>());

        var arr = ExpressionValue.FromJsonString("[1,2,3]").JsonArray;
        Assert.Equal(3, arr.Count);
    }

    [Fact]
    public void JsonElementProperty_CoversAllValueKinds()
    {
        Assert.Equal(JsonValueKind.String, ((ExpressionValue)"s").JsonElement.ValueKind);
        Assert.Equal(JsonValueKind.Number, ((ExpressionValue)(double?)1).JsonElement.ValueKind);
        Assert.Equal(JsonValueKind.True, ExpressionValue.True.JsonElement.ValueKind);
        Assert.Equal(JsonValueKind.False, ExpressionValue.False.JsonElement.ValueKind);
        Assert.Equal(JsonValueKind.Null, ExpressionValue.Null.JsonElement.ValueKind);
        Assert.Equal(JsonValueKind.Undefined, ExpressionValue.Undefined.JsonElement.ValueKind);
        Assert.Equal(JsonValueKind.Object, ExpressionValue.FromJsonString("{\"a\":1}").JsonElement.ValueKind);
        Assert.Equal(JsonValueKind.Array, ExpressionValue.FromJsonString("[1,2]").JsonElement.ValueKind);
    }

    [Fact]
    public void ToString_CoversAllValueKinds()
    {
        Assert.Equal("null", ExpressionValue.Null.ToString());
        Assert.Equal("undefined", ExpressionValue.Undefined.ToString());
        Assert.Equal("true", ExpressionValue.True.ToString());
        Assert.Equal("false", ExpressionValue.False.ToString());
        Assert.Equal("\"s\"", ((ExpressionValue)"s").ToString());
        Assert.Equal("1.5", ((ExpressionValue)(double?)1.5).ToString());
        Assert.Equal("{\"a\":1}", ExpressionValue.FromJsonString("{\"a\":1}").ToString());
        Assert.Equal("[1,2]", ExpressionValue.FromJsonString("[1,2]").ToString());
    }

    [Fact]
    public void ToStringForText_CoversAllValueKinds()
    {
        Assert.Null(ExpressionValue.Null.ToStringForText());
        Assert.Equal("undefined", ExpressionValue.Undefined.ToStringForText());
        Assert.Equal("true", ExpressionValue.True.ToStringForText());
        Assert.Equal("false", ExpressionValue.False.ToStringForText());
        // String is returned unquoted (different from ToString)
        Assert.Equal("s", ((ExpressionValue)"s").ToStringForText());
        Assert.Equal("1.5", ((ExpressionValue)(double?)1.5).ToStringForText());
        Assert.Equal("{\"a\":1}", ExpressionValue.FromJsonString("{\"a\":1}").ToStringForText());
    }

    [Fact]
    public void ToStringForEquals_CoversAllValueKinds()
    {
        Assert.Null(ExpressionValue.Null.ToStringForEquals());
        Assert.Null(ExpressionValue.Undefined.ToStringForEquals());
        Assert.Equal("true", ExpressionValue.True.ToStringForEquals());
        Assert.Equal("false", ExpressionValue.False.ToStringForEquals());
        Assert.Equal("1.5", ((ExpressionValue)(double?)1.5).ToStringForEquals());
        // Strings that look like primitives are normalized (case-insensitive)
        Assert.Equal("true", ((ExpressionValue)"TruE").ToStringForEquals());
        Assert.Equal("false", ((ExpressionValue)"FALSE").ToStringForEquals());
        Assert.Null(((ExpressionValue)"NULL").ToStringForEquals());
        Assert.Equal("other", ((ExpressionValue)"other").ToStringForEquals());
        Assert.Equal("{\"a\":1}", ExpressionValue.FromJsonString("{\"a\":1}").ToStringForEquals());
        Assert.Equal("[1,2]", ExpressionValue.FromJsonString("[1,2]").ToStringForEquals());
    }

    [Fact]
    public void Equals_ReturnsFalseForNonExpressionValue()
    {
        // Equals(object) short-circuits before the throwing Equals(ExpressionValue) overload
        Assert.False(ExpressionValue.Null.Equals((object)"not an expression value"));
        Assert.False(ExpressionValue.Null.Equals((object?)null));
    }

    [Fact]
    public void ToBoolLoose_CoversAllValueKinds()
    {
        Assert.False(ExpressionValue.Null.ToBoolLoose());
        Assert.Null(ExpressionValue.Undefined.ToBoolLoose());
        Assert.True(ExpressionValue.True.ToBoolLoose());
        Assert.False(ExpressionValue.False.ToBoolLoose());
        Assert.True(((ExpressionValue)"true").ToBoolLoose());
        Assert.False(((ExpressionValue)"false").ToBoolLoose());
        Assert.True(((ExpressionValue)"1").ToBoolLoose());
        Assert.False(((ExpressionValue)"0").ToBoolLoose());
        Assert.True(((ExpressionValue)"TRUE").ToBoolLoose());
        Assert.False(((ExpressionValue)"FALSE").ToBoolLoose());
        Assert.Null(((ExpressionValue)"maybe").ToBoolLoose());
        // Strings that aren't literally "1"/"0" but parse numerically to 1/0 hit the ParseNumber fallback
        Assert.True(((ExpressionValue)"1.0").ToBoolLoose());
        Assert.False(((ExpressionValue)"0.0").ToBoolLoose());
        Assert.Null(((ExpressionValue)"7").ToBoolLoose());
        Assert.True(((ExpressionValue)(double?)1).ToBoolLoose());
        Assert.False(((ExpressionValue)(double?)0).ToBoolLoose());
        Assert.Null(((ExpressionValue)(double?)5).ToBoolLoose());
        // Object/Array are not boolean-convertible
        Assert.Null(ExpressionValue.FromJsonString("{}").ToBoolLoose());
        Assert.Null(ExpressionValue.FromJsonString("[]").ToBoolLoose());
    }

    [Fact]
    public void TryDeserialize_ArraysAndObjects()
    {
        // Array into a List<int>
        Assert.True(ExpressionValue.FromJsonString("[1,2,3]").TryDeserialize<List<int>>(out var list));
        Assert.Equal(new List<int> { 1, 2, 3 }, list);

        // Array into a non-enumerable type fails (falls through all branches)
        Assert.False(ExpressionValue.FromJsonString("[1,2,3]").TryDeserialize<int>(out _));

        // Object into a Dictionary
        Assert.True(
            ExpressionValue.FromJsonString("{\"a\":1,\"b\":2}").TryDeserialize<Dictionary<string, int>>(out var dict)
        );
        Assert.Equal(2, dict!["b"]);

        // Object into an incompatible shape fails gracefully (caught JsonException)
        Assert.False(ExpressionValue.FromJsonString("{\"a\":1}").TryDeserialize<List<int>>(out _));

        // Deserializing an object to an unsupported (abstract) type triggers the caught NotSupportedException
        Assert.False(ExpressionValue.FromJsonString("{\"a\":1}").TryDeserialize<Stream>(out _));
    }

    [Fact]
    public void TryDeserialize_NonNullableValueTypeFromNullOrUndefined_Fails()
    {
        Assert.False(ExpressionValue.Null.TryDeserialize<int>(out _));
        Assert.False(ExpressionValue.Undefined.TryDeserialize<int>(out _));
    }

    [Fact]
    public void TryDeserialize_StringToUnsupportedType_Fails()
    {
        // The string fallback path serializes the value and deserializes to the target type;
        // a target type with no supported converter (System.Type) surfaces a NotSupportedException
        // that is caught and reported as failure
        Assert.False(((ExpressionValue)"hello").TryDeserialize<Type>(out _));
    }

    [Fact]
    public void ToObject_NullReturnsNull()
    {
#pragma warning disable CS0618 // ToObject is obsolete
        Assert.Null(ExpressionValue.Null.ToObject());
#pragma warning restore CS0618
    }

    [Fact]
    public void TryDeserialize_ToObject_ReturnsClrRepresentationForAllKinds()
    {
        Assert.True(ExpressionValue.Null.TryDeserialize<object>(out var nullResult));
        Assert.Null(nullResult);
        Assert.True(ExpressionValue.True.TryDeserialize<object>(out var trueResult));
        Assert.Equal(true, trueResult);
        Assert.True(((ExpressionValue)"text").TryDeserialize<object>(out var stringResult));
        Assert.Equal("text", stringResult);
        Assert.True(((ExpressionValue)2.5).TryDeserialize<object>(out var numberResult));
        Assert.Equal(2.5, numberResult);

        Assert.True(ExpressionValue.FromJsonString("[1,2]").TryDeserialize<object>(out var arrayResult));
        var arrayElement = Assert.IsType<JsonElement>(arrayResult);
        Assert.Equal(JsonValueKind.Array, arrayElement.ValueKind);

        Assert.True(ExpressionValue.FromJsonString("{\"a\":1}").TryDeserialize<object>(out var objectResult));
        var objectElement = Assert.IsType<JsonElement>(objectResult);
        Assert.Equal(JsonValueKind.Object, objectElement.ValueKind);
    }

    [Fact]
    public void TryDeserialize_ArrayAndObject_ToJsonElementBehaveTheSame()
    {
        // Object → JsonElement works through the generic JSON round trip
        Assert.True(ExpressionValue.FromJsonString("{\"a\":1}").TryDeserialize<JsonElement>(out var objectElement));
        Assert.Equal(JsonValueKind.Object, objectElement.ValueKind);

        // Array → JsonElement should work the same way, but JsonElement is not IEnumerable
        Assert.True(ExpressionValue.FromJsonString("[1,2]").TryDeserialize<JsonElement>(out var arrayElement));
        Assert.Equal(JsonValueKind.Array, arrayElement.ValueKind);
    }

    private sealed class OrderLine
    {
        [JsonPropertyName("price")]
        public decimal? Price { get; set; }

        [JsonPropertyName("quantity")]
        public int Quantity { get; set; }

        [JsonPropertyName("tags")]
        public List<string>? Tags { get; set; }
    }

    [Fact]
    public void TryDeserialize_ObjectAndArray_ToDataModelTypes()
    {
        var orderLine = ExpressionValue.FromJsonString("""{"price":200.5,"quantity":2,"tags":["a","b"]}""");
        Assert.True(orderLine.TryDeserialize<OrderLine>(out var line));
        Assert.NotNull(line);
        Assert.Equal(200.5m, line.Price);
        Assert.Equal(2, line.Quantity);
        Assert.Equal(["a", "b"], line.Tags);

        var lines = ExpressionValue.FromJsonString("""[{"price":1,"quantity":1},{"price":2,"quantity":2}]""");
        Assert.True(lines.TryDeserialize<List<OrderLine>>(out var lineList));
        Assert.Equal(2, lineList!.Count);
        Assert.Equal(2m, lineList[1].Price);

        Assert.True(ExpressionValue.FromJsonString("[1.5,2]").TryDeserialize<decimal[]>(out var decimals));
        Assert.Equal([1.5m, 2m], decimals!);

        // Array into a string target must fail even though string implements IEnumerable
        Assert.False(ExpressionValue.FromJsonString("[1,2]").TryDeserialize<string>(out _));

        // Wrong element type must fail rather than throw
        Assert.False(ExpressionValue.FromJsonString("[\"a\"]").TryDeserialize<List<int>>(out _));
    }

    [Fact]
    public void Serialize_ObjectAndArray_PreserveRawNumbersAndEscapedStrings()
    {
        // Numbers must not be rewritten through double (precision loss, 1.10 → 1.1, big integers rounded),
        // and strings must be encoded the same way System.Text.Json encodes a JsonElement.
        const string objectJson = """{"big":12345678901234567890123,"fixed":1.10,"text":"a\"bæ"}""";
        const string arrayJson = """[12345678901234567890123,1.10,"a\"b"]""";

        var serializedObject = JsonSerializer.Serialize(ExpressionValue.FromJsonString(objectJson));
        Assert.Equal(JsonSerializer.Serialize(JsonDocument.Parse(objectJson).RootElement), serializedObject);
        Assert.Contains("12345678901234567890123", serializedObject);
        Assert.Contains("1.10", serializedObject);

        Assert.Equal(
            JsonSerializer.Serialize(JsonDocument.Parse(arrayJson).RootElement),
            JsonSerializer.Serialize(ExpressionValue.FromJsonString(arrayJson))
        );
    }

    [Fact]
    public void Serialize_ObjectAndArray_RespectIndentationOfOuterWriter()
    {
        var outer = new Dictionary<string, ExpressionValue>
        {
            ["obj"] = ExpressionValue.FromJsonString("""{"a":[1,2],"b":{"c":null}}"""),
        };

        var indented = JsonSerializer.Serialize(outer, new JsonSerializerOptions { WriteIndented = true });

        var expected = """
            {
              "obj": {
                "a": [
                  1,
                  2
                ],
                "b": {
                  "c": null
                }
              }
            }
            """.ReplaceLineEndings();
        Assert.Equal(expected, indented.ReplaceLineEndings());
        // Compact output is unchanged
        Assert.Equal("""{"obj":{"a":[1,2],"b":{"c":null}}}""", JsonSerializer.Serialize(outer));
    }
}
