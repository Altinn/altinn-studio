using Altinn.Studio.Common.Domain.App;
using Xunit;

namespace Altinn.Studio.Common.Tests.Domain.App;

// Altinn.Studio.Common has an Assert of its own, which the enclosing namespace would find first.
using Assert = Xunit.Assert;

public sealed class AltinnAppLibrariesTests
{
    [Theory]
    [InlineData("Altinn.App.Core", true)]
    [InlineData("Altinn.App.PlatformServices", true)]
    [InlineData("Altinn.App.Core.Experimental", false)]
    [InlineData("altinn.app.core", false)]
    [InlineData("Altinn.App.Extra", false)]
    [InlineData(null, false)]
    public void IsAssembly_KnowsTheAssembliesOfEveryVersion(string? name, bool expected)
    {
        Assert.Equal(expected, AltinnAppLibraries.IsAssembly(name));
    }

    [Fact]
    public void PublishedPackageNames_StartWithTheApiPackage_AndAreAllAssemblies()
    {
        Assert.Equal("Altinn.App.Api", AltinnAppLibraries.PublishedPackageNames[0]);
        Assert.All(AltinnAppLibraries.PublishedPackageNames, name => Assert.True(AltinnAppLibraries.IsAssembly(name)));
    }
}
