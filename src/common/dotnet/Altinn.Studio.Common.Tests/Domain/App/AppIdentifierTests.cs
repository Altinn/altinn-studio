using Altinn.Studio.Common.Domain;
using Altinn.Studio.Common.Domain.App;
using Xunit;

namespace Altinn.Studio.Common.Tests.Domain.App;

// Altinn.Studio.Common has an Assert of its own, which the enclosing namespace would find first.
using Assert = Xunit.Assert;

public sealed class AppIdentifierTests
{
    [Theory]
    [InlineData("ttd", "apps-test", true)]
    [InlineData("ttd", "App", false)]
    [InlineData("TTD", "apps-test", false)]
    [InlineData("", "apps-test", false)]
    [InlineData(null, "apps-test", false)]
    [InlineData("ttd", null, false)]
    public void TryParse_NeedsAServiceOwnerCodeAndAnAppName(string? org, string? app, bool valid)
    {
        Assert.Equal(valid, AppIdentifier.TryParse(org, app, out AppIdentifier id));
        Assert.Equal(valid ? $"{org}/{app}" : "/", id.ToString());
        if (!valid)
        {
            Assert.Equal(default, id);
        }
    }

    [Fact]
    public void Parse_ThrowsOnInvalidNames()
    {
        Assert.Throws<System.ArgumentException>(() => AppIdentifier.Parse("ttd", "App"));
        Assert.Throws<System.ArgumentException>(() => AppIdentifier.Parse("", "app"));
    }

    [Fact]
    public void Parts_ThrowForTheDefaultValue()
    {
        Assert.Throws<System.InvalidOperationException>(() => default(AppIdentifier).Org.Value);
        Assert.Throws<System.InvalidOperationException>(() => default(AppIdentifier).App.Value);
    }

    [Fact]
    public void Identifiers_WithTheSameNames_AreEqual()
    {
        var id = new AppIdentifier(ServiceOwnerCode.Parse("ssb"), AppName.Parse("ra0040-01"));

        Assert.Equal(id, AppIdentifier.Parse("ssb", "ra0040-01"));
        Assert.Equal(id.GetHashCode(), AppIdentifier.Parse("ssb", "ra0040-01").GetHashCode());
        Assert.NotEqual(id, AppIdentifier.Parse("ttd", "ra0040-01"));
    }

    [Fact]
    public void ToString_AndTryParse_RoundTrip()
    {
        AppIdentifier id = AppIdentifier.Parse("ssb", "ra0040-01");

        Assert.Equal("ssb/ra0040-01", id.ToString());
        Assert.True(AppIdentifier.TryParse(id.ToString(), out AppIdentifier parsed));
        Assert.Equal(id, parsed);
        Assert.False(AppIdentifier.TryParse("ssb", out _));
        Assert.False(AppIdentifier.TryParse("ssb/ra0040-01/x", out _));
        Assert.False(AppIdentifier.TryParse(null, out _));
    }
}
