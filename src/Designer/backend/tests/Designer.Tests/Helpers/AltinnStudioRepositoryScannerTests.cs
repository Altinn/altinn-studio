using System.IO;
using Altinn.Studio.Designer.Helpers;
using Xunit;

namespace Designer.Tests.Helpers;

public class AltinnStudioRepositoryScannerTests
{
    [Fact]
    public void ShouldBeAbleToFindRootDirectoryOfRepository()
    {
        string actual = AltinnStudioRepositoryScanner.FindDotEnvFilePath();
        Assert.EndsWith("Designer/.env", actual.Replace(Path.DirectorySeparatorChar, '/'));
    }
}
