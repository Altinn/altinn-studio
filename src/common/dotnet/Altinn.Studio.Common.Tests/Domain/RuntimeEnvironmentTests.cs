using Altinn.Studio.Common.Domain;
using Xunit;

namespace Altinn.Studio.Common.Tests.Domain;

// Altinn.Studio.Common has an Assert of its own, which the enclosing namespace would find first.
using Assert = Xunit.Assert;

public sealed class RuntimeEnvironmentTests
{
    [Theory]
    [InlineData("prod")]
    [InlineData("production")]
    public void TryParse_TreatsProductionAliasesAsOne(string name)
    {
        Assert.True(RuntimeEnvironment.TryParse(name, out RuntimeEnvironment environment));
        Assert.Equal(RuntimeEnvironment.Production, environment);
        Assert.Equal("prod", environment.Name);
        Assert.Equal("production", environment.RegistryName);
        Assert.True(environment.IsProduction);
    }

    [Theory]
    [InlineData("tt02")]
    [InlineData("at22")]
    [InlineData("yt01")]
    public void TryParse_AcceptsTestEnvironments(string name)
    {
        Assert.True(RuntimeEnvironment.TryParse(name, out RuntimeEnvironment environment));
        Assert.Equal(name, environment.Name);
        Assert.Equal(name, environment.RegistryName);
        Assert.False(environment.IsProduction);
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("Prod")]
    [InlineData("tt")]
    [InlineData("02")]
    [InlineData("tt02x")]
    [InlineData("../tt02")]
    public void TryParse_RejectsOtherNames(string? name)
    {
        Assert.False(RuntimeEnvironment.TryParse(name, out RuntimeEnvironment environment));
        Assert.Equal(default, environment);
    }

    [Fact]
    public void Parse_GivesEqualValuesForTheSameName()
    {
        Assert.Equal(RuntimeEnvironment.TT02, RuntimeEnvironment.Parse("tt02"));
        Assert.Equal(RuntimeEnvironment.Parse("at22"), RuntimeEnvironment.Parse("at22"));
        Assert.NotEqual(RuntimeEnvironment.TT02, RuntimeEnvironment.Production);
    }

    [Fact]
    public void Name_ThrowsForTheDefaultValue()
    {
        Assert.Throws<System.InvalidOperationException>(() => default(RuntimeEnvironment).Name);
        Assert.Throws<System.InvalidOperationException>(() => default(RuntimeEnvironment).RegistryName);
        Assert.False(default(RuntimeEnvironment).IsProduction);
        Assert.Equal(string.Empty, default(RuntimeEnvironment).ToString());
    }
}
