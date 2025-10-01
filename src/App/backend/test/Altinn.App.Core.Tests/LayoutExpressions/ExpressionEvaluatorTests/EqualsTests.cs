using System.Numerics;
using System.Text.Json;
using Altinn.App.Core.Internal.Expressions;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.LayoutExpressions.ExpressionEvaluatorTests;

public class EqualTests(ITestOutputHelper outputHelper)
{
    private static readonly JsonSerializerOptions? _unsafeSerializerOptions = new()
    {
        Encoder = System.Text.Encodings.Web.JavaScriptEncoder.UnsafeRelaxedJsonEscaping,
    };

    private static void AddIfEqual(TheoryData<object> data, object value, double origValue)
    {
        double newValue = Convert.ToDouble(value);
        if (origValue.Equals(newValue))
        {
            data.Add(value);
        }
    }

    public static TheoryData<object> GetNumericTestData(double value)
    {
        var data = new TheoryData<object>();
        AddIfEqual(data, (byte)value, value);
        AddIfEqual(data, (sbyte)value, value);
        AddIfEqual(data, (short)value, value);
        AddIfEqual(data, (ushort)value, value);
        AddIfEqual(data, (int)value, value);
        AddIfEqual(data, (uint)value, value);
        AddIfEqual(data, (long)value, value);
        AddIfEqual(data, (ulong)value, value);
        AddIfEqual(data, (float)value, value);
        AddIfEqual(data, (decimal)value, value);

        return data;
    }

    public static TheoryData<object> GetExoticTypes =>
        new()
        {
            "hello \"world\"",
            "123",
            true,
            false,
            "",
            DateTime.Parse("2025-02-04T13:13:15.84473533+01:00"),
            DateTimeOffset.Parse("2025-02-04T13:13:15.84473533+01:00"),
            DateOnly.FromDateTime(DateTime.Parse("2025-02-04T13:13:15.8447353+01:00")),
            TimeOnly.FromDateTime(DateTime.Parse("2025-02-04T13:13:15.8447353+01:00")),
            ((long)int.MaxValue) + 1,
            ((ulong)uint.MaxValue) + 1,
            ((decimal)int.MaxValue) + 1,
            ((decimal)uint.MaxValue) + 1,
            (double)((decimal)long.MaxValue + 1),
            (double)((decimal)ulong.MaxValue + 1),
        };

    [Theory]
    [MemberData(nameof(GetNumericTestData), 123.0)]
    [MemberData(nameof(GetNumericTestData), 0.5)]
    [MemberData(nameof(GetNumericTestData), -123.0)]
    [MemberData(nameof(GetExoticTypes))]
    public void ToStringForEquals_AgreesWithJsonSerializer(object? value)
    {
        // Verify that the EqualsToString method returns the same value as the JsonSerializer.
        var json = JsonSerializer.Serialize(value, _unsafeSerializerOptions);

        outputHelper.WriteLine($"Object of type {value?.GetType().FullName ?? "null"}:");
        outputHelper.WriteLine($"   value:{value}");
        outputHelper.WriteLine($"   json: {json}");

        var expressionValue = ExpressionValue.FromObject(value);
        outputHelper.WriteLine($"   expressionValue: {expressionValue}");
        // Verify that the EqualsToString method returns the same value as the JsonSerializer.
        var toStringForEquals = expressionValue.ToStringForEquals();

        if (expressionValue.ValueKind == JsonValueKind.String && json[0] == '"' && json[^1] == '"')
        {
            // If the value is a string, we need to remove the quotes from the JsonSerializer output
            json = json[1..^1].Replace("\\\"", "\"");
        }

        Assert.Equal(json, toStringForEquals);
    }

    public static TheoryData<object> GetNonsenseValues =>
        new()
        {
            new BigInteger(123), // Not supported by JsonSerializer, but might make sense to support
            new object[] { 1, 2, 3 },
            new object(),
            new
            {
                A = 1,
                B = 2,
                C = 3,
            },
            new byte[] { 0x01, 0x02, 0x03 },
        };

    [Theory]
    [MemberData(nameof(GetNonsenseValues))]
    public void ToStringForEquals_NonsenseTypes_ThrowsException(object? value)
    {
        outputHelper.WriteLine($"Object of type {value?.GetType().FullName ?? "null"}:");
        outputHelper.WriteLine($"   value:{value}");
        outputHelper.WriteLine($"   json: {JsonSerializer.Serialize(value)}");

        var union = ExpressionValue.FromObject(value);
        outputHelper.WriteLine($"   union: {union}");
        // Verify that the EqualsToString method throws an exception for unsupported types.
        Assert.Null(ExpressionValue.FromObject(value).ToStringForEquals());
    }

    [Theory]
    [InlineData(null, null)]
    [InlineData("null", null)]
    [InlineData("Null", null)]
    [InlineData("true", "true")]
    [InlineData("trUe", "true")]
    [InlineData("True", "true")]
    [InlineData(true, "true")]
    [InlineData("false", "false")]
    [InlineData("False", "false")]
    [InlineData("falSe", "false")]
    [InlineData(false, "false")]
    public void ToStringForEquals_SpecialCases(object? value, string? expected)
    {
        // Verify that the EqualsToString method returns the expected value for special cases.
        var toStringForEquals = ExpressionValue.FromObject(value).ToStringForEquals();
        Assert.Equal(expected, toStringForEquals);
    }
}
