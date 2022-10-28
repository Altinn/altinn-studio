using System.Text.RegularExpressions;
using Altinn.Studio.DataModeling.Utils;
using Xunit;

namespace DataModeling.Tests.Utils;

public class RestrictionHelperTests
{
    [Theory]
    [InlineData("11111", 8)]
    [InlineData("123.22", 6)]
    [InlineData("2344.2", 5)]
    [InlineData("1.0001", 10)]
    [InlineData("12.333", 5)]
    public void TotalDigitsDecimalRegexString_ShouldMatch(string input, uint totalDigits)
    {
        var regex = new Regex(RestrictionsHelper.TotalDigitsDecimalRegexString(totalDigits));

        Assert.Matches(regex, input);
    }

    [Theory]
    [InlineData("111111", 3)]
    [InlineData("123.223", 4)]
    [InlineData("2344.22", 4)]
    [InlineData("1.011", 3)]
    [InlineData("12.33", 3)]
    public void TotalDigitsDecimalRegexString_ShouldNotMatch_Too_Long(string input, uint totalDigits)
    {
        var regex = new Regex(RestrictionsHelper.TotalDigitsDecimalRegexString(totalDigits));

        Assert.DoesNotMatch(regex, input);
    }

    [Theory]
    [InlineData("11111", 5)]
    [InlineData("12341234", 8)]
    [InlineData("1234", 4)]
    public void TotalDigitsRegexInteger_ShouldMatch(string input, uint totalDigits)
    {
        var regex = new Regex(RestrictionsHelper.TotalDigitsIntegerRegexString(totalDigits));

        Assert.Matches(regex, input);
    }

    [Theory]
    [InlineData("1111123", 5)]
    [InlineData("12374628964", 8)]
    [InlineData("123.1", 4)]
    public void TotalDigitsRegexInteger_ShouldNotMatch_Too_Long_Or_Decimal(string input, uint totalDigits)
    {
        var regex = new Regex(RestrictionsHelper.TotalDigitsIntegerRegexString(totalDigits));

        Assert.DoesNotMatch(regex, input);
    }
}
