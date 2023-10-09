using System;
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
        [InlineData("Altinn.App.Api", true, "7.4.0")]
        [InlineData("NonExistingNuget", false)]
        public void TryGetPackageVersionFromCsprojFile_GivenValidCsprojFile_ReturnsTrue(string packageName, bool expectedResult, string expectedVersion = "")
        {
            string testTemplateCsProjPath = Path.Combine(CommonDirectoryPath.GetSolutionDirectory().DirectoryPath, "..", "testdata", "AppTemplates", "AspNet", "App", "App.csproj");

            bool result = PackageVersionHelper.TryGetPackageVersionFromCsprojFile(testTemplateCsProjPath, packageName, out Version version);

            result.Should().Be(expectedResult);

            if (result)
            {
                version.ToString().Should().Be(expectedVersion);
            }
        }
    }
}
