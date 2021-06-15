using System;
using System.IO;
using System.Reflection;
using Altinn.Studio.Designer.Infrastructure.GitRepository;
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
            string unitTestFolder = Path.GetDirectoryName(new Uri(Assembly.GetExecutingAssembly().Location).LocalPath);
            string repositoriesRootPath = Path.Combine(unitTestFolder, @"..\..\..\_TestData\Repositories\");

            var altinnGitRepository = new AltinGitRepository(org, repository, developer, repositoriesRootPath);

            Assert.Equal(org, altinnGitRepository.Org);
            Assert.Equal(repository, altinnGitRepository.Repository);
            Assert.Equal(developer, altinnGitRepository.Developer);
            Assert.Contains(repositoriesRootPath, altinnGitRepository.RepositoriesRootPath);
        }
    }
}
