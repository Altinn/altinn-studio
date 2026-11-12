using Altinn.Studio.Common.Domain;
using Xunit;

namespace Altinn.Studio.Common.Tests.Domain;

// Altinn.Studio.Common has an Assert of its own, which the enclosing namespace would find first.
using Assert = Xunit.Assert;

public sealed class ServiceOwnerCodeTests
{
    [Theory]
    [InlineData("ttd", true)]
    [InlineData("a", true)]
    [InlineData("1org", true)]
    [InlineData("nav2", true)]
    [InlineData("TTD", false)]
    [InlineData("Ttd", false)]
    [InlineData("org-1", false)]
    [InlineData("org_x", false)]
    [InlineData("org.y", false)]
    [InlineData("org/x", false)]
    [InlineData("org x", false)]
    [InlineData("ørg", false)]
    [InlineData("ttd\n", false)]
    [InlineData("", false)]
    [InlineData(null, false)]
    public void TryParse_AcceptsLowerCaseLettersAndDigits(string? value, bool valid)
    {
        Assert.Equal(valid, ServiceOwnerCode.TryParse(value, out ServiceOwnerCode code));
        Assert.Equal(valid ? value : string.Empty, code.ToString());
        if (valid)
        {
            Assert.Equal(value, code.Value);
        }
    }

    [Fact]
    public void TryParse_AllowsUpTo40Characters()
    {
        Assert.True(ServiceOwnerCode.TryParse(new string('a', 40), out _));
        Assert.False(ServiceOwnerCode.TryParse(new string('a', 41), out _));
    }

    [Fact]
    public void Parse_ThrowsOnAnInvalidCode()
    {
        Assert.Equal("ttd", ServiceOwnerCode.Parse("ttd").ToString());
        Assert.Throws<System.ArgumentException>(() => ServiceOwnerCode.Parse("TTD"));
    }

    [Fact]
    public void Value_ThrowsForTheDefaultValue()
    {
        Assert.Throws<System.InvalidOperationException>(() => default(ServiceOwnerCode).Value);
        Assert.Equal(default(ServiceOwnerCode), default(ServiceOwnerCode));
        Assert.NotEqual(default, ServiceOwnerCode.Parse("ttd"));
    }
}
