using System.Text.RegularExpressions;
using Altinn.Studio.DataModeling.Utils;
using Xunit;

namespace DataModeling.Tests.Utils;

public class RestrictionHelperTests
{
    [Theory]
    [InlineData("11111", 5)]
    [InlineData("123.22", 5)]
    [InlineData("2344.2", 5)]
    [InlineData("1.0001", 5)]
    [InlineData("12.333", 5)]
    public void TotalDigitsRegexString_ShouldMatch(string input, uint totalDigits)
    {
        var regex = new Regex(RestrictionsHelper.TotalDigitsRegexString(totalDigits));

        Assert.Matches(regex, input);
    }
}
