#nullable enable
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Helpers;
using DotNet.Testcontainers.Builders;
using VerifyXunit;
using Xunit;

namespace Designer.Tests.Helpers
{
    public class PackageVersionHelperTests
    {
        [Theory]
        [InlineData("Altinn.App.Api")]
        [InlineData("NonExistingNuget")]
        public async Task TryGetPackageVersionFromCsprojFile_GivenValidCsprojFile_ReturnsTrue(string packageName)
        {
            string testTemplateCsProjPath = Path.Join(CommonDirectoryPath.GetSolutionDirectory().DirectoryPath, "..", "testdata", "App", "App.csproj");


            string[] packages = [packageName, $"{packageName}.Experimental"];
            string[][] inputs = [packages, packages.Reverse().ToArray()];
            var outputs = new List<(bool, string?)>();
            foreach (var input in inputs)
            {
                bool result = PackageVersionHelper.TryGetPackageVersionFromCsprojFile(testTemplateCsProjPath, input, out var version);

                outputs.Add((result, version?.ToString()));
            }

            var snapshot = new
            {
                Inputs = inputs,
                Outputs = outputs
            };
            await Verifier.Verify(snapshot).UseParameters(packageName);
        }

        [Theory]
        [InlineData("Altinn.App.Api")]
        public async Task TryGetPackageVersionFromCsprojFile_GivenValidCsprojFileWithPinnedVersions_ReturnsTrue(string packageName)
        {
            // In this directory, the csproj file has versions pinned with [ and ]
            string testTemplateCsProjPath = Path.Join(CommonDirectoryPath.GetSolutionDirectory().DirectoryPath, "..", "testdata", "App", "App.csproj");

            string[] packages = [packageName, $"{packageName}.Experimental"];
            string[][] inputs = [packages, packages.Reverse().ToArray()];
            var outputs = new List<(bool, string?)>();
            foreach (var input in inputs)
            {
                bool result = PackageVersionHelper.TryGetPackageVersionFromCsprojFile(testTemplateCsProjPath, input, out var version);

                outputs.Add((result, version?.ToString()));
            }

            var snapshot = new
            {
                Inputs = inputs,
                Outputs = outputs
            };
            await Verifier.Verify(snapshot).UseParameters(packageName);
        }
    }
}
