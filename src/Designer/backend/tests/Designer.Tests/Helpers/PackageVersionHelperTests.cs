using System.IO;
using System.Linq;
using Altinn.Studio.Designer.Helpers;
using DotNet.Testcontainers.Builders;
using Xunit;

namespace Designer.Tests.Helpers
{
    public class PackageVersionHelperTests
    {
        [Theory]
        [InlineData("Altinn.App.Api", true, "8.6.4")]
        [InlineData("NonExistingNuget", false)]
        public void TryGetPackageVersionFromCsprojFile_GivenValidCsprojFile_ReturnsTrue(string packageName, bool expectedResult, string expectedVersion = "")
        {
            string testTemplateCsProjPath = Path.Combine(CommonDirectoryPath.GetSolutionDirectory().DirectoryPath, "..", "src", "App", "app-template-dotnet", "src", "App", "App.csproj");

            string[] packages = [packageName, $"{packageName}.Experimental"];
            string[][] inputs = [packages, packages.Reverse().ToArray()];
            foreach (var input in inputs)
            {
                bool result = PackageVersionHelper.TryGetPackageVersionFromCsprojFile(testTemplateCsProjPath, input, out var version);

                Assert.Equal(expectedResult, result);

                if (result)
                {
                    Assert.Equal(expectedVersion, version.ToString());
                }
            }
        }
    }
}
