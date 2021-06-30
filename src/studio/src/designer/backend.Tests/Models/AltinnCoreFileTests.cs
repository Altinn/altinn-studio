using System;
using System.IO;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Utils;
using FluentAssertions;
using Xunit;

namespace Designer.Tests
{
    public class AltinnCoreFileTests
    {
        [Fact]
        public void CreateFromPath_ValidPath_ShouldCreateInstanse()
        {
            var org = "ttd";
            var repository = "ttd-datamodels";
            var userName = "testUser";
            var repositoryRootPath = TestDataHelper.GetTestDataRepositoryDirectory(org, repository, userName);
            var filePath = $"{repositoryRootPath}\\App\\models\\0678.xsd";

            var altinnCoreFile = AltinnCoreFile.CreateFromPath(filePath, repositoryRootPath);

            Assert.Equal(@"0678.xsd", altinnCoreFile.FileName);
            Assert.Equal(@".xsd", altinnCoreFile.FileType);
            Assert.Equal(@"/App/models/0678.xsd", altinnCoreFile.RepositoryRelativeUrl);
            altinnCoreFile.LastChanged.Should().BeOnOrBefore(DateTime.Now);
        }

        [Theory]
        [InlineData("")]
        [InlineData(@"c:\this\does\not\exists")]
        public void CreateFromPath_InvalidPath_ShouldThrowFileNotFoundException(string repositoryRootPath)
        {            
            var filePath = $"{repositoryRootPath}\\myimaginary.schema.json";

            Assert.Throws<FileNotFoundException>(() => AltinnCoreFile.CreateFromPath(filePath, repositoryRootPath));
        }
    }
}
