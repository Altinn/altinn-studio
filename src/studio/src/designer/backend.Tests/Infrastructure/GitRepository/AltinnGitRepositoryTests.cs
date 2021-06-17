using System;
using System.IO;
using System.Linq;
using System.Reflection;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Altinn.Studio.Designer.Models;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.Infrastructure.GitRepository
{
    public class AltinnGitRepositoryTests
    {
        [Theory]
        [InlineData("", "", "", "")]
        [InlineData("orgCode", "", "", "")]
        [InlineData("orgCode", "repoName", "", "")]
        [InlineData("orgCode", "repoName", "developerName", "")]
        [InlineData("orgCode", "repoName", "developerName", null)]
        public void Constructor_EmptyParameters_ShouldFail(string org, string repository, string developer, string repositoriesRootPath)
        {
            Assert.Throws<ArgumentException>(() => new AltinGitRepository(org, repository, developer, repositoriesRootPath));
        }

        [Theory]
        [InlineData("orgCode", "repoName", "developerName", "nothing here")]
        [InlineData("orgCode", "repoName", "developerName", @"c:\there should not be anything here either")]
        [InlineData("orgCode", "repoName", "developerName", @"c:\there\should\not\be\anything\here\either")]
        public void Constructor_InvalidBasePath_ShouldFail(string org, string repository, string developer, string repositoriesRootPath)
        {
            Assert.Throws<DirectoryNotFoundException>(() => new AltinGitRepository(org, repository, developer, repositoriesRootPath));
        }

        [Theory]
        [InlineData("ttd", "apps-test", "testUser")]
        public void Constructor_ValidParameters_ShouldInstantiate(string org, string repository, string developer)
        {
            string repositoriesRootPath = TestDataHelper.GetTestDataRepositoriesRootDirectory();

            var altinnGitRepository = new AltinGitRepository(org, repository, developer, repositoriesRootPath);

            Assert.Equal(org, altinnGitRepository.Org);
            Assert.Equal(repository, altinnGitRepository.Repository);
            Assert.Equal(developer, altinnGitRepository.Developer);
            Assert.Contains(repositoriesRootPath, altinnGitRepository.RepositoriesRootPath);
        }

        [Theory]
        [InlineData("ttd", "apps-test", "testUser", 0)]
        [InlineData("ttd", "ttd-datamodels", "testUser", 4)]
        public void GetSchemaFiles_FilesExist_ShouldReturnFiles(string org, string repository, string developer, int expectedSchemaFiles)
        {
            var repositoriesRootPath = TestDataHelper.GetTestDataRepositoriesRootDirectory();

            var altinnGitRepository = new AltinGitRepository(org, repository, developer, repositoriesRootPath);
            var files = altinnGitRepository.GetSchemaFiles();

            Assert.Equal(expectedSchemaFiles, files.Count);
        }

        [Fact]        
        public void GetSchemaFiles_FilesExist_ShouldReturnFilesWithCorrectProperties()
        {
            var repositoriesRootPath = TestDataHelper.GetTestDataRepositoriesRootDirectory();

            var altinnGitRepository = new AltinGitRepository("ttd", "ttd-datamodels", "testUser", repositoriesRootPath);
            var file = altinnGitRepository.GetSchemaFiles().First(f => f.FileName == "0678.xsd");

            Assert.Equal(".xsd", file.FileType);
            Assert.Equal(@"/App/models/0678.xsd", file.RepositoryRelativeUrl);
        }
    }
}
