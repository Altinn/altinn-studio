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
            string repositoryDirectory = Path.Combine(new string[] { repositoriesRootDirectory, $"..\\Model" });

            Assert.Throws<ArgumentException>(() => new AltinnGitRepository("ttd", "hvem-er-hvem", "testUser", repositoriesRootDirectory, repositoryDirectory));
        }

        [Theory]
        [InlineData("ttd", "apps-test", "testUser", 0)]
        [InlineData("ttd", "ttd-datamodels", "testUser", 0)]
        [InlineData("ttd", "hvem-er-hvem", "testUser", 7)]
        public void GetSchemaFiles_FilesExist_ShouldReturnFiles(string org, string repository, string developer, int expectedSchemaFiles)
        {
            var repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(repositoriesRootDirectory);
            
            var altinnGitRepository = altinnGitRepositoryFactory.GetAltinnGitRepository(org, repository, developer);
            var files = altinnGitRepository.GetSchemaFiles();

            Assert.Equal(expectedSchemaFiles, files.Count);
        }

        [Fact]        
        public void GetSchemaFiles_FilesExist_ShouldReturnFilesWithCorrectProperties()
        {            
            var altinnGitRepository = GetTestRepository("ttd", "hvem-er-hvem", "testuser");
            var file = altinnGitRepository.GetSchemaFiles().First(f => f.FileName == "HvemErHvem_ExternalTypes.schema.json");

            Assert.Equal(".json", file.FileType);
            Assert.Equal(@"/App/models/HvemErHvem_ExternalTypes.schema.json", file.RepositoryRelativeUrl);
        }

        [Fact]
        public void RepositoryType_SettingsExists_ShouldUseThat()
        {            
            var altinnGitRepository = GetTestRepository("ttd", "ttd-datamodels", "testUser");

            Assert.Equal(AltinnRepositoryType.Datamodels, altinnGitRepository.GetRepositoryType().Result);
        }

        [Fact]
        public async Task RepositoryType_SettingsDontExists_ShouldUseAppAsDefault()
        {
            var org = "ttd";
            var sourceRepository = "hvem-er-hvem";
            var developer = "testUser";
            var targetRepository = Guid.NewGuid().ToString();

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);

            try
            {
                var altinnGitRepository = GetTestRepository(org, targetRepository, developer);
                Assert.Equal(AltinnRepositoryType.App, altinnGitRepository.GetRepositoryType().Result);
                Assert.True(altinnGitRepository.FileExistsByRelativePath(@".altinnstudio\settings.json"));
            }
            finally
            {
                TestDataHelper.DeleteAppRepository(org, targetRepository, developer);
            }
        }

        [Fact]
        public void ModelPreference_SettingsExists_ShouldUseThat()
        {
            var altinnGitRepository = GetTestRepository("ttd", "ttd-datamodels", "testUser");

            Assert.Equal(DatamodellingPreference.JsonSchema, altinnGitRepository.GetDatamodellingPreference().Result);
        }

        [Fact]
        public async Task ModelPreference_SettingsFileExistsButNotDatamodellingPreference_ShouldUseCorrectDefault()
        {
            var org = "ttd";
            var sourceRepository = "xyz-datamodels";
            var developer = "testUser";
            var targetRepository = $"{Guid.NewGuid()}-datamodels";

            await TestDataHelper.CopyRepositoryForTest(org, sourceRepository, developer, targetRepository);

            try
            {
                var altinnGitRepository = GetTestRepository(org, targetRepository, developer);
                Assert.Equal(DatamodellingPreference.JsonSchema, altinnGitRepository.GetDatamodellingPreference().Result);
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
