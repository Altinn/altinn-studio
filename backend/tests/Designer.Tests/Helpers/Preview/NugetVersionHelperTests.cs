using Altinn.Studio.Designer.Helpers.Preview;
using Xunit;

namespace Designer.Tests.Helpers.Preview
{

    public class NugetVersionHelperTests
    {
        [Fact]
        public void GetMockedAltinnNugetBuildFromVersion_ShouldReturnEmptyStringForVersionsBelowBreakpoint()
        {
            Assert.Equal("", NugetVersionHelper.GetMockedAltinnNugetBuildFromVersion("1.1.1"));
            Assert.Equal("", NugetVersionHelper.GetMockedAltinnNugetBuildFromVersion("1.1.1-preview.150"));
            Assert.Equal("", NugetVersionHelper.GetMockedAltinnNugetBuildFromVersion("1.1.1-preview.0"));
            Assert.Equal("8.0.0.0", NugetVersionHelper.GetMockedAltinnNugetBuildFromVersion("8.1.1-preview.14"));
            Assert.Equal("8.0.0.0", NugetVersionHelper.GetMockedAltinnNugetBuildFromVersion("8.8.8-preview.0"));
            Assert.Equal("8.0.0.0", NugetVersionHelper.GetMockedAltinnNugetBuildFromVersion("8.18.1238"));
            Assert.Equal("8.0.0.0", NugetVersionHelper.GetMockedAltinnNugetBuildFromVersion("8.18.1238"));
            Assert.Equal("8.0.0.0", NugetVersionHelper.GetMockedAltinnNugetBuildFromVersion("8.8.8-preview.342"));
            Assert.Equal("8.0.0.0", NugetVersionHelper.GetMockedAltinnNugetBuildFromVersion("8.0.0-preview.15"));
            Assert.Equal("", NugetVersionHelper.GetMockedAltinnNugetBuildFromVersion("8.0.0-preview.14"));
        }
    }
}
