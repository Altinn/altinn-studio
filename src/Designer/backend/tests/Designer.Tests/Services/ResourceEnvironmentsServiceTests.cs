using System.Collections.Generic;
using Altinn.Studio.Designer.Services.Implementation;
using Xunit;

namespace Designer.Tests.Services;

public class ResourceEnvironmentsServiceTests
{
    [Theory]
    [InlineData("nav", new[] { "tt02", "prod" })]
    [InlineData("ttd", new[] { "tt02", "prod", "yt01", "at22", "at23", "at24" })]
    [InlineData("digdir", new[] { "tt02", "prod", "yt01", "at22", "at23", "at24" })]
    [InlineData("skd", new[] { "tt02", "prod", "yt01" })]
    public void GetEnvironmentsForOrg_ReturnsEnvironmentsForOrg(string org, string[] expected)
    {
        var sut = new ResourceEnvironmentsService();

        IReadOnlyList<string> actual = sut.GetEnvironmentsForOrg(org);

        Assert.Equal(expected, actual);
    }

    [Theory]
    [InlineData("TTD")]
    [InlineData("Ttd")]
    [InlineData("ttd")]
    public void GetEnvironmentsForOrg_IgnoresCasingOfOrg(string org)
    {
        var sut = new ResourceEnvironmentsService();

        IReadOnlyList<string> actual = sut.GetEnvironmentsForOrg(org);

        Assert.Equal(["tt02", "prod", "yt01", "at22", "at23", "at24"], actual);
    }

    [Fact]
    public void GetEnvironmentsForOrg_ReturnsTestAndProductionForUnknownOrg()
    {
        var sut = new ResourceEnvironmentsService();

        IReadOnlyList<string> actual = sut.GetEnvironmentsForOrg("someunknownorg");

        Assert.Equal(["tt02", "prod"], actual);
    }
}
