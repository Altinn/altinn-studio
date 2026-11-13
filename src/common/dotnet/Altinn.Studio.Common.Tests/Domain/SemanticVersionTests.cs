using System;
using System.Linq;
using System.Text.RegularExpressions;
using Altinn.Studio.Common.Domain;
using Xunit;

namespace Altinn.Studio.Common.Tests.Domain;

// Altinn.Studio.Common has an Assert of its own, which the enclosing namespace would find first.
using Assert = Xunit.Assert;

public sealed partial class SemanticVersionTests
{
    [Theory]
    [InlineData("8.5.0", 8, 5, 0, "", "")]
    [InlineData("0.0.0", 0, 0, 0, "", "")]
    [InlineData("9.0.0-preview.10", 9, 0, 0, "preview.10", "")]
    [InlineData("8.0.0-rc2", 8, 0, 0, "rc2", "")]
    [InlineData("4.0.0+build.5", 4, 0, 0, "", "build.5")]
    [InlineData("1.2.3-rc.1+build", 1, 2, 3, "rc.1", "build")]
    [InlineData("1.2.3-x-y-z.--", 1, 2, 3, "x-y-z.--", "")]
    // Pull request builds of Altinn.App and the app frontend, as apps in production reference them.
    [InlineData(
        "8.10.0-pr.4153.instance-contextual-layout-fetching.bffb1113",
        8,
        10,
        0,
        "pr.4153.instance-contextual-layout-fetching.bffb1113",
        ""
    )]
    [InlineData("8.10.0-pr.4458.email-user.03057bd3", 8, 10, 0, "pr.4458.email-user.03057bd3", "")]
    public void TryParse_ReadsTheParts(string value, int major, int minor, int patch, string preRelease, string build)
    {
        Assert.True(SemanticVersion.TryParse(value, out SemanticVersion? version));
        Assert.Equal((major, minor, patch), (version.Major, version.Minor, version.Patch));
        Assert.Equal((preRelease, build), (version.PreRelease, version.Build));
        Assert.Equal(preRelease.Length > 0, version.IsPreRelease);
        Assert.Equal(value, version.Value);
        Assert.Equal(value, version.ToString());
    }

    [Theory]
    [InlineData("1.2.3")]
    [InlineData("01.2.3")]
    [InlineData("1.02.3")]
    [InlineData("1.2")]
    [InlineData("1")]
    [InlineData("1.2.3.4")]
    [InlineData("1.2.x")]
    [InlineData("v1.2.3")]
    [InlineData("1.2.3-alpha")]
    [InlineData("1.2.3-0.3.7")]
    [InlineData("1.2.3-0a")]
    [InlineData("1.2.3-")]
    [InlineData("1.2.3-a..b")]
    [InlineData("1.2.3-a_b")]
    [InlineData("1.2.3+build.01")]
    [InlineData("1.2.3+")]
    [InlineData("1.2.3+a+b")]
    [InlineData("1.2.3 ")]
    [InlineData("")]
    public void TryParse_FollowsSemanticVersioning(string value)
    {
        Assert.Equal(Official().IsMatch(value), SemanticVersion.TryParse(value, out _));
    }

    // A number is an int, so the limit is the largest int and not a count of digits.
    [Theory]
    [InlineData("4.11.2026111212", true)]
    [InlineData("2147483647.0.0", true)]
    [InlineData("2147483648.0.0", false)]
    [InlineData("0.0.99999999999", false)]
    public void TryParse_AcceptsTheNumbersAnIntHolds(string value, bool expected)
    {
        Assert.Equal(expected, SemanticVersion.TryParse(value, out SemanticVersion? version));
        Assert.Equal(expected ? value : null, version?.Value);
    }

    // The exception to semantic versioning: a hash of only digits can start with a zero.
    [Theory]
    [InlineData("1.2.3-01")]
    [InlineData("8.6.0-pr.1198.cleanDataAccessor.01234567")]
    public void TryParse_AcceptsAPreReleaseNumberWithALeadingZero(string value)
    {
        Assert.DoesNotMatch(Official(), value);
        Assert.True(SemanticVersion.TryParse(value, out _));
    }

    [Fact]
    public void TryParse_RefusesNullAndNumbersThatDoNotFit()
    {
        Assert.False(SemanticVersion.TryParse(null, out SemanticVersion? version));
        Assert.Null(version);
        Assert.False(SemanticVersion.TryParse("1.2.9999999999", out _));
        Assert.Throws<ArgumentException>(() => SemanticVersion.Parse("8"));
    }

    // The order semantic versioning gives as its example, with a build that does not count.
    [Fact]
    public void CompareTo_OrdersByPrecedence()
    {
        string[] ordered =
        [
            "0.9.9",
            "1.0.0-alpha",
            "1.0.0-alpha.1",
            "1.0.0-alpha.beta",
            "1.0.0-beta",
            "1.0.0-beta.2",
            "1.0.0-beta.11",
            "1.0.0-rc.1",
            "1.0.0",
            "1.0.1",
            "1.1.0",
            "2.0.0",
            "10.0.0",
        ];
        SemanticVersion[] versions = [.. ordered.Select(SemanticVersion.Parse)];

        Assert.Equal(ordered, versions.Reverse().Order().Select(v => v.Value));
        for (int i = 1; i < versions.Length; i++)
        {
            Assert.True(versions[i - 1] < versions[i]);
            Assert.True(versions[i] > versions[i - 1]);
            Assert.True(versions[i - 1] <= versions[i]);
            Assert.False(versions[i - 1] >= versions[i]);
        }
    }

    [Fact]
    public void CompareTo_IgnoresTheBuildAndLeadingZeros()
    {
        SemanticVersion plain = SemanticVersion.Parse("1.0.0");
        SemanticVersion built = SemanticVersion.Parse("1.0.0+build.5");

        Assert.Equal(0, plain.CompareTo(built));
        Assert.NotEqual(plain, built);
        Assert.Equal(plain, SemanticVersion.Parse("1.0.0"));
        Assert.Equal(0, SemanticVersion.Parse("1.0.0-pr.007").CompareTo(SemanticVersion.Parse("1.0.0-pr.7")));
        Assert.True(SemanticVersion.Parse("1.0.0-pr.9") < SemanticVersion.Parse("1.0.0-pr.010"));
        Assert.True(plain.CompareTo(null) > 0);
    }

    // The regular expression that semantic versioning suggests.
    [GeneratedRegex(
        @"^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$"
    )]
    private static partial Regex Official();
}
