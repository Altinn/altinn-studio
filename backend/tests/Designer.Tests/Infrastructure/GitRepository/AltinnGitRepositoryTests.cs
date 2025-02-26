using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Enums;
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
        [InlineData("", "hvem-er-hvem", "")]
        public void Constructor_InValidParametersCorrectPath_ShouldFail(string org, string repository, string developer)
        {
            string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            string repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory("ttd", "hvem-er-hvem", "testUser");

            Assert.Throws<ArgumentException>(() => new AltinnGitRepository(org, repository, developer, repositoriesRootDirectory, repositoryDirectory));
        }

        [Theory]
        [InlineData("ttd", "hvem-er-hvem", "testUser")]
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

        [Fact]
        public void Constructor_InvalidPathParameters_ShouldThrowException()
        {
            string repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            string repositoryDirectory = Path.Combine(repositoriesRootDirectory, "..", "Deployments");

            Assert.Throws<ArgumentException>(() => new AltinnGitRepository("ttd", "hvem-er-hvem", "testUser", repositoriesRootDirectory, repositoryDirectory));
        }

        [Fact]
        public async Task RepositoryType_SettingsExists_ShouldUseThat()
        {
            var altinnGitRepository = GetTestRepository("ttd", "ttd-datamodels", "testUser");

            Assert.Equal(AltinnRepositoryType.Datamodels, await altinnGitRepository.GetRepositoryType());
        }

        [Fact]
        public async Task RepositoryType_SettingsDontExists_ShouldUseAppAsDefault()
        {
            var org = "ttd";
            var sourceRepository = "hvem-er-hvem";
            var developer = "testUser";
            var targetRepository = TestDataHelper.GenerateTestRepoName();

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);

            try
            {
                var altinnGitRepository = GetTestRepository(org, targetRepository, developer);
                Assert.Equal(AltinnRepositoryType.App, await altinnGitRepository.GetRepositoryType());
                Assert.True(altinnGitRepository.FileExistsByRelativePath(Path.Combine(".altinnstudio", "settings.json")));
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        private static AltinnGitRepository GetTestRepository(string org, string repository, string developer)
        {
            var repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            string repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, repository, developer);

            var altinnGitRepository = new AltinnGitRepository(org, repository, developer, repositoriesRootDirectory, repositoryDirectory);

            return altinnGitRepository;
        }
    }
}
