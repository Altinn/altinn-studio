using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Security.Claims;
using System.Threading;
using System.Threading.Tasks;

using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;

using AltinnCore.Authentication.Constants;

using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

using Moq;

using Xunit;

namespace Designer.Tests.Services
{
    public class RepositorySITests
    {
        [Fact]
        public void GetContents_FindsFolder_ReturnsListOfFileSystemObjects()
        {
            // Arrange
            List<FileSystemObject> expected = new List<FileSystemObject>
            {
                new FileSystemObject
                {
                    Name = "App",
                    Type = FileSystemObjectType.Dir.ToString(),
                    Path = "App"
                },
                new FileSystemObject
                {
                    Name = "App.sln",
                    Type = FileSystemObjectType.File.ToString(),
                    Path = "App.sln",
                    Encoding = "Unicode (UTF-8)"
                },
            };

            int expectedCount = 2;

            RepositorySI sut = GetServiceForTest("testUser");

            // Act
            List<FileSystemObject> actual = sut.GetContents("ttd", "apps-test");

            // Assert
            Assert.Equal(expected.First().Type, actual.First().Type);
            Assert.Equal(expectedCount, actual.Count);
        }

        [Fact]
        public void GetContents_FindsFile_ReturnsOneFileSystemObject()
        {
            // Arrange
            List<FileSystemObject> expected = new List<FileSystemObject>
            {
               new FileSystemObject
                {
                    Name = "appsettings.json",
                    Type = FileSystemObjectType.File.ToString(),
                    Path = "App/appsettings.json",
                    Encoding = "Unicode (UTF-8)"
                },
            };

            int expectedCount = 1;

            RepositorySI sut = GetServiceForTest("testUser");

            // Act
            List<FileSystemObject> actual = sut.GetContents("ttd", "apps-test", "App/appsettings.json");

            // Assert
            Assert.Equal(expected.First().Type, actual.First().Type);
            Assert.Equal(expectedCount, actual.Count);
        }

        [Fact]
        public void GetContents_LocalCloneOfRepositoryNotAvailable_ReturnsNull()
        {
            // Arrange
            RepositorySI sut = GetServiceForTest("testUser");

            // Act
            List<FileSystemObject> actual = sut.GetContents("ttd", "test-apps");

            // Assert
            Assert.Null(actual);
        }

        [Fact]
        public async Task CreateRepository_DoesNotExists_ShouldCreate()
        {
            string org = "ttd";
            string repositoryName = Guid.NewGuid().ToString();
            string developer = "testUser";

            var repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            var repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, repositoryName, developer);
            var repositoryRemoteDirectory = TestDataHelper.GetTestDataRemoteRepository(org, repositoryName);

            var repositoryService = GetServiceForTest(developer);

            try
            {
                var repository = await repositoryService.CreateService(org, new ServiceConfiguration() { RepositoryName = repositoryName, ServiceName = repositoryName, DatamodellingPreference = DatamodellingPreference.JsonSchema });
                var altinnStudioSettings = await new AltinnGitRepositoryFactory(repositoriesRootDirectory).GetAltinnGitRepository(org, repositoryName, developer).GetAltinnStudioSettings();
                altinnStudioSettings.DatamodellingPreference.Should().Be(DatamodellingPreference.JsonSchema);
            }
            finally
            {
                // We do a sleep here beacuse the creation process holds a lock on the files
                // it modifies. 400ms is the magic number as a result by trial and error.
                Thread.Sleep(400);
                Directory.Delete(repositoryDirectory, true);
                Directory.Delete(repositoryRemoteDirectory, true);
            }
        }

        [Fact]
        public async Task CopyRepository_TargetExistsRemotely_Conflict()
        {
            // Arrange
            string developer = "testUser";
            string org = "ttd";
            string sourceRepository = "apps-test";
            string targetRepository = "existing-repo";

            RepositorySI sut = GetServiceForTest(developer);

            // Act
            Repository actual = await sut.CopyRepository(org, sourceRepository, targetRepository, developer);

            // Assert
            Assert.Equal(HttpStatusCode.Conflict, actual.RepositoryCreatedStatus);
        }

        [Fact]
        public async Task CopyRepository_TargetExistsLocally_InitialCloneMoved()
        {
            // Arrange
            string developer = "testUser";
            string org = "ttd";
            string sourceRepository = "apps-test";
            string targetRepository = "apps-test-2021";

            PrepareRemoteTestData(org, sourceRepository);
            TestDataHelper.CleanUpRemoteRepository("ttd", "apps-test-2021");
            await TestDataHelper.CleanUpReplacedRepositories(org, targetRepository, developer);

            RepositorySI sut = GetServiceForTest(developer);

            // Act
            await sut.CopyRepository(org, sourceRepository, targetRepository, developer);

            // Assert
            string developerClonePath = $"{TestDataHelper.GetTestDataRepositoriesRootDirectory()}\\{developer}\\{org}";
            int actualCloneCount = Directory.GetDirectories(developerClonePath).Count(d => d.Contains("apps-test-2021"));

            TestDataHelper.CleanUpRemoteRepository("ttd", "apps-test-2021");
            await TestDataHelper.CleanUpReplacedRepositories("ttd", "apps-test-2021", "testUser");

            Assert.Equal(2, actualCloneCount);
        }

        [Fact]
        public async Task CopyRepository_TargetDoesNotExistsLocally()
        {
            // Arrange
            string developer = "testUser";
            string org = "ttd";
            string sourceRepository = "apps-test";
            string targetRepository = "apps-test-clone";
            string expectedRepoPath = TestDataHelper.GetTestDataRepositoryDirectory(org, targetRepository, developer);

            PrepareRemoteTestData(org, sourceRepository);
            TestDataHelper.CleanUpRemoteRepository(org, targetRepository);
            if (Directory.Exists(expectedRepoPath))
            {
                TestDataHelper.DeleteDirectory(expectedRepoPath, true);
            }

            RepositorySI sut = GetServiceForTest(developer);

            // Act
            await sut.CopyRepository(org, sourceRepository, targetRepository, developer);

            // Assert
            string appMetadataString = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/applicationmetadata.json");
            string gitConfigString = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, ".git/config");
            string developerClonePath = $"{TestDataHelper.GetTestDataRepositoriesRootDirectory()}\\{developer}\\{org}";

            try
            {
                Assert.True(Directory.Exists(expectedRepoPath));
                Assert.Contains("\"id\": \"ttd/apps-test-clone\"", appMetadataString);
                Assert.Contains("https://dev.altinn.studio/repos/ttd/apps-test-clone.git", gitConfigString);
                Assert.DoesNotContain(Directory.GetDirectories(developerClonePath), a => a.Contains("_COPY_OF_ORIGIN_"));
            }
            finally
            {
                string path = TestDataHelper.GetTestDataRepositoryDirectory("ttd", "apps-test-clone", "testUser");
                if (Directory.Exists(path))
                {
                    Directory.Delete(path, true);
                }

                TestDataHelper.CleanUpRemoteRepository(org, targetRepository);
            }
        }

        [Fact]
        public async Task DeleteRepository_SourceControlServiceIsCalled()
        {
            // Arrange
            string developer = "testUser";
            string org = "ttd";
            string repository = "apps-test";

            Mock<ISourceControl> mock = new Mock<ISourceControl>();
            mock.Setup(m => m.DeleteRepository(It.IsAny<string>(), It.IsAny<string>()))
                .Returns(Task.CompletedTask);

            RepositorySI sut = GetServiceForTest(developer, mock.Object);

            // Act
            await sut.DeleteRepository(org, repository);

            // Assert
            mock.VerifyAll();
        }

        private static HttpContext GetHttpContextForTestUser(string userName)
        {
            List<Claim> claims = new List<Claim>();
            claims.Add(new Claim(AltinnCoreClaimTypes.Developer, userName, ClaimValueTypes.String, "altinn.no"));
            ClaimsIdentity identity = new ClaimsIdentity("TestUserLogin");
            identity.AddClaims(claims);

            ClaimsPrincipal principal = new ClaimsPrincipal(identity);
            HttpContext c = new DefaultHttpContext();
            c.Request.HttpContext.User = principal;

            return c;
        }

        private static void PrepareRemoteTestData(string org, string app)
        {
            string remoteRepoPath = TestDataHelper.GetTestDataRemoteRepository(org, app);
            string configPath = Path.Combine(remoteRepoPath, "gitconfig");
            string newPath = Path.Combine(remoteRepoPath, ".git\\config");

            if (!File.Exists(newPath))
            {
                Directory.CreateDirectory(Path.Combine(remoteRepoPath, ".git"));
                if (File.Exists(configPath))
                {
                    File.Copy(configPath, newPath);
                }
            }
        }

        private static RepositorySI GetServiceForTest(string developer, ISourceControl sourceControlMock = null)
        {
            HttpContext ctx = GetHttpContextForTestUser(developer);

            Mock<IHttpContextAccessor> httpContextAccessorMock = new Mock<IHttpContextAccessor>();
            httpContextAccessorMock.Setup(s => s.HttpContext).Returns(ctx);

            sourceControlMock ??= new ISourceControlMock();
            IOptions<ServiceRepositorySettings> repoSettings = Options.Create(new ServiceRepositorySettings());
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(RepositorySITests).Assembly.Location).LocalPath);
            repoSettings.Value.RepositoryLocation = Path.Combine(unitTestFolder, @"..\..\..\_TestData\Repositories\");

            var altinnGitRepositoryFactory = new AltinnGitRepositoryFactory(TestDataHelper.GetTestDataRepositoriesRootDirectory());

            IOptions<GeneralSettings> generalSettings = Options.Create(
                new GeneralSettings()
                {
                    TemplateLocation = @"../../../../../../AppTemplates/AspNet",
                    DeploymentLocation = @"../../../../../../AppTemplates/AspNet/deployment",
                    AppLocation = @"../../../../../../AppTemplates/AspNet/App"
                });
            
            RepositorySI service = new RepositorySI(
                repoSettings,
                generalSettings,
                new Mock<IDefaultFileFactory>().Object,
                httpContextAccessorMock.Object,
                new IGiteaMock(),
                sourceControlMock,
                new Mock<ILoggerFactory>().Object,
                new Mock<ILogger<RepositorySI>>().Object,
                altinnGitRepositoryFactory);

            return service;
        }
    }
}
