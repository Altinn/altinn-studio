using System.Text.RegularExpressions;
using Altinn.Studio.Common.App;
using Xunit;

namespace Altinn.Studio.Common.Tests.App;

// Altinn.Studio.Common has an Assert of its own, which the enclosing namespace would find first.
using Assert = Xunit.Assert;

public sealed partial class AppNameTests
{
    [Theory]
    [InlineData("apps-test", true)]
    [InlineData("ra0040-01", true)]
    [InlineData("abc", true)]
    [InlineData("a23456789012345678901234567890", true)]
    [InlineData("a234567890123456789012345678901", false)]
    [InlineData("ab", false)]
    [InlineData("datamodels", false)]
    [InlineData("datamodels2", true)]
    [InlineData("App-test", false)]
    [InlineData("1app", false)]
    [InlineData("app-", false)]
    [InlineData("app_x", false)]
    [InlineData("app.x", false)]
    [InlineData("", false)]
    public void TryParse_FollowsDesignersRouteRule(string value, bool valid)
    {
        Assert.Equal(valid, AppName.TryParse(value, out AppName app));
        Assert.Equal(valid ? value : string.Empty, app.ToString());
        Assert.Equal(DesignersRouteRule().IsMatch(value), valid);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("apps-test\n")]
    public void TryParse_RejectsWhatTheRegularExpressionWouldLetThrough(string? value)
    {
        Assert.False(AppName.TryParse(value, out _));
    }

    [Fact]
    public void Value_ThrowsForTheDefaultValue()
    {
        Assert.Throws<System.InvalidOperationException>(() => default(AppName).Value);
        Assert.Equal(default(AppName), default(AppName));
        Assert.NotEqual(default, AppName.Parse("apps-test"));
    }

    [Fact]
    public void Parse_ThrowsOnAnInvalidName()
    {
        Assert.Equal("apps-test", AppName.Parse("apps-test").ToString());
        Assert.Throws<System.ArgumentException>(() => AppName.Parse("App"));
    }

    [GeneratedRegex("^(?!datamodels$)[a-z][a-z0-9-]{1,28}[a-z0-9]$")]
    private static partial Regex DesignersRouteRule();
}
