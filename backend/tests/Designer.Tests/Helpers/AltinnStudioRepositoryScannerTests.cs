using Altinn.Studio.Designer.Helpers;
using FluentAssertions;
using Xunit;

namespace Designer.Tests.Helpers;

public class AltinnStudioRepositoryScannerTests
{
    [Fact]
    public void ShouldBeAbleToFindRootDirectoryOfRepository()
    {
        string actual = AltinnStudioRepositoryScanner.FindRootDotEnvFilePath();
        actual.Should().EndWith("altinn-studio/.env");
    }
}
