#nullable enable
using System;
using Altinn.Studio.Designer.Models;
using Xunit;

namespace Designer.Tests.Models;

public class AltinnRepoEditingContextTests
{
    [Fact]
    public void FromOrgRepoDeveloper_ValidArguments_SetsProperties()
    {
        AltinnRepoEditingContext context = AltinnRepoEditingContext.FromOrgRepoDeveloper(
            "ttd",
            "apps-test",
            "testUser"
        );

        Assert.Equal("ttd", context.Org);
        Assert.Equal("apps-test", context.Repo);
        Assert.Equal("testUser", context.Developer);
    }

    [Theory]
    [InlineData("")]
    [InlineData("invalid/developer")]
    [InlineData("..")]
    public void FromOrgRepoDeveloper_InvalidDeveloper_Throws(string invalidDeveloper)
    {
        Assert.Throws<ArgumentException>(() =>
            AltinnRepoEditingContext.FromOrgRepoDeveloper("ttd", "apps-test", invalidDeveloper)
        );
    }
}
