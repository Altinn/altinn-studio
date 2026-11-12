using Altinn.Studio.Common.App;
using Xunit;

namespace Altinn.Studio.Common.Tests.App;

// Altinn.Studio.Common has an Assert of its own, which the enclosing namespace would find first.
using Assert = Xunit.Assert;

public sealed class AppVersionTests
{
    [Theory]
    [InlineData("1.8.5", true)]
    [InlineData("v14.26.0", true)]
    [InlineData("65c3afc151047909c51e324585762e2f13cbd98a-tag", true)]
    [InlineData("0", true)]
    [InlineData("V1", true)]
    [InlineData("1_0", true)]
    [InlineData("_1", true)]
    [InlineData("", false)]
    [InlineData(".1", false)]
    [InlineData("-1", false)]
    [InlineData("1/0", false)]
    [InlineData("1 0", false)]
    [InlineData("1.0\n", false)]
    [InlineData("1\00", false)]
    [InlineData("1.é", false)]
    [InlineData(null, false)]
    public void TryParse_FollowsTheRuleForImageTags(string? value, bool valid)
    {
        Assert.Equal(valid, AppVersion.TryParse(value, out AppVersion version));
        Assert.Equal(valid ? value : string.Empty, version.ToString());
    }

    [Fact]
    public void TryParse_AllowsUpTo128Characters()
    {
        Assert.True(AppVersion.TryParse(new string('1', 128), out _));
        Assert.False(AppVersion.TryParse(new string('1', 129), out _));
    }

    [Fact]
    public void Parse_ThrowsOnAnInvalidTag()
    {
        Assert.Equal("1.8.5", AppVersion.Parse("1.8.5").ToString());
        Assert.Throws<System.ArgumentException>(() => AppVersion.Parse(".1"));
    }
}
