using System.Numerics;
using System.Text.Json;
using Altinn.App.Core.Internal.Expressions;
using Xunit.Abstractions;

namespace Altinn.App.Core.Tests.LayoutExpressions.ExpressionEvaluatorTests;

public class EqualTests(ITestOutputHelper outputHelper)
{
    public static IEnumerable<object[]> GetNumericTestData(double value) =>
        [
            [value],
            [(byte)value],
            [(sbyte)value],
            [(short)value],
            [(ushort)value],
            [(int)value],
            [(uint)value],
            [(long)value],
            [(ulong)value],
            [(float)value],
            [(decimal)value],
            // [(BigInteger)value] // Not supported by JsonSerializer
        ];

    public static IEnumerable<object[]> GetExoticTypes =>
        [
            ["123"],
            [true],
            [false],
            [""],
            [DateTime.Now],
            [DateOnly.FromDateTime(DateTime.Now)],
            [TimeOnly.FromDateTime(DateTime.Now)],
        ];

    [Theory]
    [MemberData(nameof(GetNumericTestData), 123.0)]
    [MemberData(nameof(GetNumericTestData), 0.5)]
    [MemberData(nameof(GetNumericTestData), -123.0)]
    [MemberData(nameof(GetExoticTypes))]
    public void ToStringForEquals_AgreesWithJsonSerializer(object? value)
    {
        outputHelper.WriteLine($"Object of type {value?.GetType().FullName ?? "null"}:");
        outputHelper.WriteLine($"   value:{value}");
        outputHelper.WriteLine($"   json: {JsonSerializer.Serialize(value)}");
        // Verify that the EqualsToString method returns the same value as the JsonSerializer.
        var json = value is string ? value : JsonSerializer.Serialize(value);
        var toStringForEquals = ExpressionEvaluator.ToStringForEquals(value);
        Assert.Equal(json, toStringForEquals);
    }

    public static IEnumerable<object[]> GetNonsenseValues =>
        [
            [new BigInteger(123)], // Not supported by JsonSerializer, but might make sense to support
            [new object[] { 1, 2, 3 }],
            [new object()],
            [
                new
                {
                    A = 1,
                    B = 2,
                    C = 3
                }
            ],
            [new byte[] { 0x01, 0x02, 0x03 }],
        ];

    [Theory]
    [MemberData(nameof(GetNonsenseValues))]
    public void ToStringForEquals_NonsenseTypes_ThrowsException(object? value)
    {
        outputHelper.WriteLine($"Object of type {value?.GetType().FullName ?? "null"}:");
        outputHelper.WriteLine($"   value:{value}");
        outputHelper.WriteLine($"   json: {JsonSerializer.Serialize(value)}");
        // Verify that the EqualsToString method throws an exception for unsupported types.
        Assert.Throws<NotImplementedException>(() => ExpressionEvaluator.ToStringForEquals(value));
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
        var toStringForEquals = ExpressionEvaluator.ToStringForEquals(value);
        Assert.Equal(expected, toStringForEquals);
    }
}
