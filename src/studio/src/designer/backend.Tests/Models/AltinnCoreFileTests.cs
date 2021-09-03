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
            var fileName = "0678.xsd";
            var directory = $"{repositoryRootPath}\\App\\models";
            var filePath = $"{directory}\\0678.xsd";

            var altinnCoreFile = AltinnCoreFile.CreateFromPath(filePath, repositoryRootPath);

            Assert.Equal(fileName, altinnCoreFile.FileName);
            Assert.Equal(@".xsd", altinnCoreFile.FileType);
            Assert.Equal(@"/App/models/0678.xsd", altinnCoreFile.RepositoryRelativeUrl);
            Assert.Equal(directory, altinnCoreFile.Directory);
            Assert.Equal(filePath, altinnCoreFile.FilePath);
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
