using System;
using System.Collections.Generic;
using System.IO;
using System.Security.Claims;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Utils;
using LibGit2Sharp;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Designer.Tests.Services
{
    public class SourceControlSITest : IDisposable
    {

        private Mock<IHttpContextAccessor> _httpContextAccessorMock;
        private Mock<IGitea> _giteaMock;
        private Mock<ILogger<SourceControlSI>> _loggerMock;
        private ServiceRepositorySettings _settings;
        private Mock<HttpContext> _httpContextMock;
        private SourceControlSI _sourceControlService;

        private readonly string _org = "ttd";
        private readonly string _developer = "testUser";
        private string _repoDir;
        private void Setup()
        {
            // Setup mocks
            _httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            _giteaMock = new Mock<IGitea>();
            _loggerMock = new Mock<ILogger<SourceControlSI>>();
            _httpContextMock = new Mock<HttpContext>();
            _httpContextMock.Setup(x => x.User).Returns(new ClaimsPrincipal(new ClaimsIdentity(
            [
                new Claim(ClaimTypes.Name, "testUser")
            ], "mock")));

            // Setup settings with a test repository location
            _settings = new ServiceRepositorySettings
            {
                RepositoryLocation = TestDataHelper.GetTestDataRepositoriesRootDirectory(),
                RepositoryBaseURL = "https://test.gitea.com"
            };

            // Setup HttpContextAccessor to return mock HttpContext
            _httpContextAccessorMock
                .Setup(x => x.HttpContext)
                .Returns(_httpContextMock.Object);

            // Create the service under test
            _sourceControlService = new SourceControlSI(
                _settings,
                _httpContextAccessorMock.Object,
                _giteaMock.Object,
                _loggerMock.Object
            );
        }


        [Fact]
        public void DeleteLocalBranch()
        {
            // Arrange
            Setup();
            string repoName = TestDataHelper.GenerateTestRepoName();
            string branchName = "feature-branch-to-delete";
            AltinnRepoEditingContext context = CreateTestRepository(repoName, branchName);

            // Act
            using (Repository repo = new(_repoDir))
            {
                Assert.Contains(repo.Branches, b => b.FriendlyName == branchName);
            }

            _sourceControlService.DeleteLocalBranch(context, branchName);

            // Assert
            using Repository finalRepoState = new(_repoDir);
            Assert.NotNull(finalRepoState);
            Assert.NotEmpty(finalRepoState.Branches);
            Assert.DoesNotContain(finalRepoState.Branches, b => b.FriendlyName == branchName);
        }

        [Fact]
        public async Task DeleteRepository_GiteaServiceIsCalled()
        {
            // Arrange
            string org = "ttd";
            string origApp = "hvem-er-hvem";
            string app = TestDataHelper.GenerateTestRepoName(origApp);
            string developer = "testUser";

            await TestDataHelper.CopyRepositoryForTest(org, origApp, developer, app);

            Mock<IGitea> mock = new();
            mock.Setup(m => m.DeleteRepository(org, app))
                .ReturnsAsync(true);

            SourceControlSI sut = GetServiceForTest(developer, mock);

            // Act
            await sut.DeleteRepository(org, app);
            string expectedPath = TestDataHelper.GetTestDataRepositoryDirectory(org, app, developer);

            // Assert
            mock.VerifyAll();
            Assert.False(Directory.Exists(expectedPath));
        }

        [Fact]
        public async Task CreatePullRequest_InputMappedCorectlyToCreatePullRequestOption()
        {
            // Arrange
            string target = "master";
            string source = "branch";

            Mock<IGitea> mock = new();
            mock.Setup(m => m.CreatePullRequest(
                "ttd",
                "apps-test",
                It.Is<CreatePullRequestOption>(o => o.Base == target && o.Head == source)))
                .ReturnsAsync(true);

            SourceControlSI sut = GetServiceForTest("testUser", mock);

            // Act
            await sut.CreatePullRequest("ttd", "apps-test", target, source, "title");

            // Assert
            mock.VerifyAll();
        }

        private static HttpContext GetHttpContextForTestUser(string userName)
        {
            List<Claim> claims = new();
            claims.Add(new Claim(ClaimTypes.Name, userName));
            ClaimsIdentity identity = new("TestUserLogin");
            identity.AddClaims(claims);

            ClaimsPrincipal principal = new(identity);
            HttpContext c = new DefaultHttpContext();
            c.Request.HttpContext.User = principal;

            return c;
        }

        private static SourceControlSI GetServiceForTest(string developer, Mock<IGitea> giteaMock = null)
        {
            HttpContext ctx = GetHttpContextForTestUser(developer);

            Mock<IHttpContextAccessor> httpContextAccessorMock = new();
            httpContextAccessorMock.Setup(s => s.HttpContext).Returns(ctx);

            giteaMock ??= new Mock<IGitea>();

            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(RepositorySITests).Assembly.Location).LocalPath);
            var repoSettings = new ServiceRepositorySettings()
            {
                RepositoryLocation = Path.Combine(unitTestFolder, "..", "..", "..", "_TestData", "Repositories") + Path.DirectorySeparatorChar
            };

            SourceControlSI service = new(
                repoSettings,
                httpContextAccessorMock.Object,
                giteaMock.Object,
                new Mock<ILogger<SourceControlSI>>().Object);

            return service;
        }

        private AltinnRepoEditingContext CreateTestRepository(string repoName, string additionalBranch = null)
        {
            var editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
                _org,
                repoName,
                _developer
            );
            _repoDir = TestDataHelper.GetTestDataRepositoryDirectory(_org, repoName, _developer);
            Directory.CreateDirectory(_repoDir);

            // Initialize a new git repository
            Repository.Init(_repoDir);

            using var repo = new Repository(_repoDir);

            // Create initial commit
            string testFile = Path.Combine(_repoDir, "test.txt");
            File.WriteAllText(testFile, "Initial content");

            Commands.Stage(repo, "test.txt");
            var signature = new LibGit2Sharp.Signature(_developer, $"{_developer}@test.com", DateTimeOffset.Now);
            repo.Commit("Initial commit", signature, signature);

            // Create additional branch if specified
            if (!string.IsNullOrEmpty(additionalBranch))
            {
                repo.CreateBranch(additionalBranch);
            }

            return editingContext;
        }

        public void Dispose()
        {
            // Clean up test repositories
            try
            {
                if (Directory.Exists(_repoDir))
                {
                    // Force delete all files including read-only git files
                    DirectoryInfo di = new(_repoDir);
                    SetAttributesNormal(di);
                    Directory.Delete(_repoDir, true);
                }
            }
            catch (Exception ex)
            {
                // Log but don't fail the test if cleanup fails
                Console.WriteLine($"Failed to clean up test directory: {ex.Message}");
            }
        }

        private void SetAttributesNormal(DirectoryInfo dir)
        {
            foreach (var subDir in dir.GetDirectories())
            {
                SetAttributesNormal(subDir);
            }
            foreach (var file in dir.GetFiles())
            {
                file.Attributes = FileAttributes.Normal;
            }
        }
    }
}
