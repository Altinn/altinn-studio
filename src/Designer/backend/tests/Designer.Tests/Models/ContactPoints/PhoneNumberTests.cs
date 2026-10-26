using Altinn.Studio.Designer.Models.ContactPoints;
using Xunit;

namespace Designer.Tests.Models.ContactPoints;

public class PhoneNumberTests
{
    [Theory]
    [InlineData("+4798765432", "+4798765432")]
    [InlineData("+47 987 65 432", "+4798765432")]
    [InlineData("+47-987-65-432", "+4798765432")]
    [InlineData("004798765432", "+4798765432")]
    [InlineData("98765432", "+4798765432")]
    [InlineData("41234567", "+4741234567")]
    [InlineData("+46701234567", "+46701234567")]
    public void TryNormalize_WhenNumberHasOrImpliesACountryCode_ReturnsE164Number(string value, string expected)
    {
        Assert.True(PhoneNumber.TryNormalize(value, out string normalized));
        Assert.Equal(expected, normalized);
    }

    [Theory]
    [InlineData("")]
    [InlineData("abc")]
    [InlineData("12345678")]
    [InlineData("987654321")]
    [InlineData("++4798765432")]
    [InlineData("+0798765432")]
    [InlineData("+1234567890123456")]
    public void TryNormalize_WhenNumberLacksACountryCode_ReturnsFalse(string value)
    {
        Assert.False(PhoneNumber.TryNormalize(value, out string normalized));
        Assert.Null(normalized);
    }
}
