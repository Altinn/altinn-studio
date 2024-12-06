using System.IO;
using Altinn.Studio.Designer.Helpers;
using DotNet.Testcontainers.Builders;
using FluentAssertions;
using Xunit;

namespace Designer.Tests.Helpers
{
    public class PackageVersionHelperTests
    {
        [Theory]
        [InlineData("Altinn.App.Api", true, "8.3.5")]
        [InlineData("NonExistingNuget", false)]
        public void TryGetPackageVersionFromCsprojFile_GivenValidCsprojFile_ReturnsTrue(string packageName, bool expectedResult, string expectedVersion = "")
        {
            string testTemplateCsProjPath = Path.Combine(CommonDirectoryPath.GetSolutionDirectory().DirectoryPath, "..", "testdata", "AppTemplates", "AspNet", "App", "App.csproj");

            var packages = [packageName, $"{packageName}.Experimental"];
            string[][] inputs = [packages, packages.Reverse().ToArray()];
            foreach (var input in inputs)
            {
                bool result = PackageVersionHelper.TryGetPackageVersionFromCsprojFile(testTemplateCsProjPath, input, out var version);

                result.Should().Be(expectedResult);

                if (result)
                {
                    version.ToString().Should().Be(expectedVersion);
                }
            }
        }
    }
}
