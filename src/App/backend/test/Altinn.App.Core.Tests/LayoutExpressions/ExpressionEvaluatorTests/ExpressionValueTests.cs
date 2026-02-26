using System.Globalization;
using System.Text.Json;
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
    }

    [Fact]
    public void TestArraysFail()
    {
        // This is probably temporary
        Assert.Throws<JsonException>(() =>
        {
            JsonSerializer.Deserialize<ExpressionValue>("[1, 2, 3]");
        });

        Assert.Throws<JsonException>(() =>
        {
            JsonSerializer.Deserialize<ExpressionValue>("[\"test\"]");
        });
    }

    [Fact]
    public void TestObjectsFail()
    {
        // This is probably temporary
        Assert.Throws<JsonException>(() =>
        {
            JsonSerializer.Deserialize<ExpressionValue>("{\"key\": \"value\"}");
        });

        Assert.Throws<JsonException>(() =>
        {
            JsonSerializer.Deserialize<ExpressionValue>("{\"key\": 123}");
        });
    }

    [Fact]
    public void TestTryDeserializeVariousTypes()
    {
        TestTryDeserialize(2, 2.0, true);
        TestTryDeserialize(2.5, 2.5, true);
        TestTryDeserialize("test", "test", true);
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
        outputHelper.WriteLine(value.ToString());
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
}
