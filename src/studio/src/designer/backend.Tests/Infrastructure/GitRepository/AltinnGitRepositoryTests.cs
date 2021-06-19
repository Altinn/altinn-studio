using System;
using System.IO;
using System.Linq;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
using Designer.Tests.Utils;
using Xunit;

namespace Designer.Tests.Infrastructure.GitRepository
{
    public class AltinnGitRepositoryTests
    {
        [Theory]
        [InlineData("", "", "", "", "")]
        [InlineData("orgCode", "", "", "", "")]
        [InlineData("orgCode", "repoName", "", "", "")]
        [InlineData("orgCode", "repoName", "developerName", "", "")]
        [InlineData("orgCode", "repoName", "developerName", null, null)]
        public void Constructor_EmptyParameters_ShouldFail(string org, string repository, string developer, string repositoriesRootDirectory, string repositoryDirectory)
        {
            Assert.Throws<DirectoryNotFoundException>(() => new AltinnGitRepository(org, repository, developer, repositoriesRootDirectory, repositoryDirectory));
        }

        [Theory]
        [InlineData("orgCode", "repoName", "developerName", "nothing here", "nothing here either")]
        [InlineData("orgCode", "repoName", "developerName", @"c:\there should not be anything here either", "")]
        [InlineData("orgCode", "repoName", "developerName", @"c:\there\should\not\be\anything\here\either", "")]
        public void Constructor_InvalidBasePath_ShouldFail(string org, string repository, string developer, string repositoriesRootDirectory, string repositoryDirectory)
        {
            Assert.Throws<DirectoryNotFoundException>(() => new AltinnGitRepository(org, repository, developer, repositoriesRootDirectory, repositoryDirectory));
        }

        [Theory]
        [InlineData("", "", "")]
        [InlineData("", "", "testUser")]
        [InlineData("ttd", "", "")]
        [InlineData("", "apps-test", "")]
        public void Constructor_InValidParametersCorrectPath_ShouldFail(string org, string repository, string developer)
        {
            string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            string repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory("ttd", "apps-test", "testUser");
            
            Assert.Throws<ArgumentException>(() => new AltinnGitRepository(org, repository, developer, repositoriesRootDirectory, repositoryDirectory));            
        }

        [Theory]
        [InlineData("ttd", "apps-test", "testUser")]
        public void Constructor_ValidParameters_ShouldInstantiate(string org, string repository, string developer)
        {
            string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            string repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, repository, developer);            

            var altinnGitRepository = new AltinnGitRepository(org, repository, developer, repositoriesRootDirectory, repositoryDirectory);

            Assert.Equal(org, altinnGitRepository.Org);
            Assert.Equal(repository, altinnGitRepository.Repository);
            Assert.Equal(developer, altinnGitRepository.Developer);
            Assert.Contains(repositoriesRootDirectory, altinnGitRepository.RepositoriesRootDirectory);
        }

        [Theory]
        [InlineData("ttd", "apps-test", "testUser", 0)]
        [InlineData("ttd", "ttd-datamodels", "testUser", 4)]
        public void GetSchemaFiles_FilesExist_ShouldReturnFiles(string org, string repository, string developer, int expectedSchemaFiles)
        {
            var repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(repositoriesRootDirectory);
            
            var altinnGitRepository = altinnGitRepositoryFactory.GetRepository(org, repository, developer);
            var files = altinnGitRepository.GetSchemaFiles();

            Assert.Equal(expectedSchemaFiles, files.Count);
        }

        [Fact]        
        public void GetSchemaFiles_FilesExist_ShouldReturnFilesWithCorrectProperties()
        {
            var org = "ttd";
            var repository = "ttd-datamodels";
            var developer = "testUser";

            var repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            string repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, repository, developer);

            var altinnGitRepository = new AltinnGitRepository(org, repository, developer, repositoriesRootDirectory, repositoryDirectory);
            var file = altinnGitRepository.GetSchemaFiles().First(f => f.FileName == "0678.xsd");

            Assert.Equal(".xsd", file.FileType);
            Assert.Equal(@"/App/models/0678.xsd", file.RepositoryRelativeUrl);
        }
    }
}
