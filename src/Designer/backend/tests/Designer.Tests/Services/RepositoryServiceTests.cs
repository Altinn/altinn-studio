using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Security.Claims;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AltinnStorage;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

using Moq;

using Xunit;

namespace Designer.Tests.Services
{
    public class RepositoryServiceTests
    {
        [Fact]
        public void GetContents_FindsFolder_ReturnsListOfFileSystemObjects()
        {
            // Arrange
            List<FileSystemObject> expected = new()
            {
                new ()
                {
                    Name = "App",
                    Type = FileSystemObjectType.Dir.ToString(),
                    Path = "App"
                },
                new ()
                {
                    Name = "App.sln",
                    Type = FileSystemObjectType.File.ToString(),
                    Path = "App.sln",
                    Encoding = "Unicode (UTF-8)"
                },
            };

            int expectedCount = 2;

            RepositoryService sut = GetServiceForTest("testUser");

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
            List<FileSystemObject> expected = new()
            {
               new ()
                {
                    Name = "appsettings.json",
                    Type = FileSystemObjectType.File.ToString(),
                    Path = "App/appsettings.json",
                    Encoding = "Unicode (UTF-8)"
                },
            };

            int expectedCount = 1;

            RepositoryService sut = GetServiceForTest("testUser");

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
            RepositoryService sut = GetServiceForTest("testUser");

            // Act
            List<FileSystemObject> actual = sut.GetContents("ttd", "test-apps");

            // Assert
            Assert.Null(actual);
        }

        [Fact]
        public async Task CreateRepository_DoesNotExists_ShouldCreate()
        {
            string org = "ttd";
            string repositoryName = TestDataHelper.GenerateTestRepoName();
            string developer = "testUser";

            var repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            var repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, repositoryName, developer);
            var repositoryRemoteDirectory = TestDataHelper.GetTestDataRemoteRepository(org, repositoryName);

            var repositoryService = GetServiceForTest(developer);

            try
            {
                await repositoryService.CreateService(org, new ServiceConfiguration() { RepositoryName = repositoryName, ServiceName = repositoryName }, []);
                var altinnStudioSettings = await new AltinnGitRepositoryFactory(repositoriesRootDirectory).GetAltinnGitRepository(org, repositoryName, developer).GetAltinnStudioSettings();
                Assert.Equal(AltinnRepositoryType.App, altinnStudioSettings.RepoType);
                Assert.True(altinnStudioSettings.UseNullableReferenceTypes);
            }
            finally
            {
                // We do a sleep here because the creation process holds a lock on the files
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

            RepositoryService sut = GetServiceForTest(developer);

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
            string origRemoteRepo = "apps-test";
            string origRepo = "apps-test-2021";
            string workingRemoteRepositoryName = TestDataHelper.GenerateTestRepoName(origRemoteRepo);
            string targetRepositoryName = TestDataHelper.GenerateTestRepoName(origRepo);
            var workingRemoteDirPath = string.Empty;
            var createdTargetRepoPath = string.Empty;
            try
            {
                workingRemoteDirPath = await TestDataHelper.CopyRemoteRepositoryForTest(org, origRemoteRepo, workingRemoteRepositoryName);
                createdTargetRepoPath = await TestDataHelper.CopyRepositoryForTest(org, origRepo, developer, targetRepositoryName);
                PrepareRemoteTestData(org, workingRemoteRepositoryName);
                TestDataHelper.CleanUpRemoteRepository(org, targetRepositoryName);

                RepositoryService sut = GetServiceForTest(developer);

                // Act
                await sut.CopyRepository(org, workingRemoteRepositoryName, targetRepositoryName, developer);

                // Assert
                string developerClonePath = Path.Combine(TestDataHelper.GetTestDataRepositoriesRootDirectory(), developer, org);
                int actualCloneCount = Directory.GetDirectories(developerClonePath).Count(d => d.Contains(targetRepositoryName));
                Assert.Equal(1, actualCloneCount);
            }
            finally
            {
                TestDataHelper.CleanUpRemoteRepository(org, targetRepositoryName);
                CleanUpRemoteTestData(org, workingRemoteRepositoryName);
                TestDataHelper.DeleteDirectory(createdTargetRepoPath);
                TestDataHelper.DeleteDirectory(workingRemoteDirPath);
            }
        }

        [Fact]
        public async Task CopyRepository_TargetDoesNotExistsLocally()
        {
            // Arrange
            string developer = "testUser";
            string org = "ttd";
            string origRemoteRepo = "apps-test";
            string workingSourceRepoName = TestDataHelper.GenerateTestRepoName(origRemoteRepo);
            string targetRepository = TestDataHelper.GenerateTestRepoName("apps-test-clone");
            string expectedRepoPath = TestDataHelper.GetTestDataRepositoryDirectory(org, targetRepository, developer);
            var workingRemoteDirPath = string.Empty;

            try
            {
                workingRemoteDirPath = await TestDataHelper.CopyRemoteRepositoryForTest(org, origRemoteRepo, workingSourceRepoName);
                PrepareRemoteTestData(org, workingSourceRepoName);

                RepositoryService sut = GetServiceForTest(developer);

                // Act
                await sut.CopyRepository(org, workingSourceRepoName, targetRepository, developer);

                // Assert
                string appMetadataString = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, "App/config/applicationmetadata.json");
                string gitConfigString = TestDataHelper.GetFileFromRepo(org, targetRepository, developer, ".git/config");
                string developerClonePath = Path.Combine(TestDataHelper.GetTestDataRepositoriesRootDirectory(), developer, org);

                Assert.True(Directory.Exists(expectedRepoPath));
                Assert.Contains($"\"id\": \"ttd/{targetRepository}\"", appMetadataString);
                Assert.Contains($"https://dev.altinn.studio/repos/{org}/{origRemoteRepo}.git", gitConfigString);
                Assert.DoesNotContain(Directory.GetDirectories(developerClonePath), a => a.Contains("_COPY_OF_ORIGIN_"));
            }
            finally
            {
                string path = TestDataHelper.GetTestDataRepositoryDirectory(org, targetRepository, developer);
                TestDataHelper.CleanUpRemoteRepository(org, targetRepository);
                if (Directory.Exists(path))
                {
                    Directory.Delete(path, true);
                }

                CleanUpRemoteTestData(org, workingSourceRepoName);
                TestDataHelper.DeleteDirectory(workingRemoteDirPath);
            }
        }

        [Fact]
        public async Task CopyRepository_WithConfigJson_InRoot_UpdatesServiceConfiguration()
        {
            // Arrange
            string developer = "testUser";
            string org = "ttd";
            string sourceWithConfig = TestDataHelper.GenerateTestRepoName("cfg");
            string targetRepository = TestDataHelper.GenerateTestRepoName("clone");
            string workingRemoteDirPath = string.Empty;

            try
            {
                workingRemoteDirPath = await TestDataHelper.CopyRemoteRepositoryForTest(org, "apps-test", sourceWithConfig);
                PrepareRemoteTestData(org, sourceWithConfig);


                string configPath = Path.Combine(workingRemoteDirPath, "config.json");
                File.WriteAllText(configPath, """
        {
            "RepositoryName": "should-be-overwritten",
            "ServiceName": "should-be-overwritten"
        }
        """);

                Assert.True(File.Exists(configPath), $"Før kopiering: config.json mangler i root: {configPath}");

                RepositoryService sut = GetServiceForTest(developer);

                // Act
                await sut.CopyRepository(org, sourceWithConfig, targetRepository, developer);

                string destRepoPath = TestDataHelper.GetTestDataRepositoryDirectory(org, targetRepository, developer);
                string destConfigPath = Path.Combine(destRepoPath, "config.json");
                Assert.True(File.Exists(destConfigPath), $"Etter kopiering: config.json ble ikke funnet i target root: {destConfigPath}");

                string configJson = File.ReadAllText(destConfigPath);

                var options = new JsonSerializerOptions
                {
                    PropertyNameCaseInsensitive = true
                };

                ServiceConfiguration config = System.Text.Json.JsonSerializer.Deserialize<ServiceConfiguration>(configJson, options);

                Assert.NotNull(config);
                Assert.Equal(targetRepository, config.RepositoryName);
                Assert.Equal(targetRepository, config.ServiceName);
            }
            finally
            {
                // Cleanup
                string cloneDir = TestDataHelper.GetTestDataRepositoryDirectory(org, targetRepository, developer);
                TestDataHelper.CleanUpRemoteRepository(org, targetRepository);
                if (Directory.Exists(cloneDir))
                {
                    Directory.Delete(cloneDir, true);
                }

                CleanUpRemoteTestData(org, sourceWithConfig);
                TestDataHelper.DeleteDirectory(workingRemoteDirPath);
            }
        }

        [Fact]
        public async Task DeleteRepository_SourceControlServiceIsCalled()
        {
            // Arrange
            string developer = "testUser";
            string org = "ttd";
            string repository = "apps-test";

            Mock<ISourceControl> mock = new();
            mock.Setup(m => m.DeleteRepository(It.IsAny<AltinnRepoEditingContext>()))
                .Returns(Task.CompletedTask);

            RepositoryService sut = GetServiceForTest(developer, mock.Object);

            // Act
            await sut.DeleteRepository(org, repository);

            // Assert
            mock.VerifyAll();
        }

        [Fact]
        public async Task CreateRepository_WithOneTemplate_AppliesTemplateOnce()
        {
            // Arrange
            string org = "ttd";
            string repositoryName = TestDataHelper.GenerateTestRepoName();
            string developer = "testUser";
            string templateOwner = "als";
            string templateId = "test-template";

            var repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, repositoryName, developer);
            var repositoryRemoteDirectory = TestDataHelper.GetTestDataRemoteRepository(org, repositoryName);

            Mock<ICustomTemplateService> customTemplateServiceMock = new();
            customTemplateServiceMock
                .Setup(m => m.ApplyTemplateToRepository(templateOwner, templateId, org, repositoryName, developer))
                .Returns(Task.CompletedTask);

            var repositoryService = GetServiceForTest(developer, customTemplateServiceMock: customTemplateServiceMock.Object);

            try
            {
                var serviceConfig = new ServiceConfiguration
                {
                    RepositoryName = repositoryName,
                    ServiceName = repositoryName
                };

                var templates = new List<CustomTemplateReference>
                {
                    new() { Owner = templateOwner, Id = templateId }
                };

                // Act
                await repositoryService.CreateService(org, serviceConfig, templates);

                // Assert
                customTemplateServiceMock.Verify(
                    m => m.ApplyTemplateToRepository(templateOwner, templateId, org, repositoryName, developer),
                    Times.Once);
            }
            finally
            {
                Thread.Sleep(400);
                TestDataHelper.DeleteDirectory(repositoryDirectory);
                TestDataHelper.DeleteDirectory(repositoryRemoteDirectory);
            }
        }

        [Fact]
        public async Task CreateRepository_WithMultipleTemplates_AppliesEachTemplateOnce()
        {
            // Arrange
            string org = "ttd";
            string repositoryName = TestDataHelper.GenerateTestRepoName();
            string developer = "testUser";

            var repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, repositoryName, developer);
            var repositoryRemoteDirectory = TestDataHelper.GetTestDataRemoteRepository(org, repositoryName);

            Mock<ICustomTemplateService> customTemplateServiceMock = new();
            customTemplateServiceMock
                .Setup(m => m.ApplyTemplateToRepository(It.IsAny<string>(), It.IsAny<string>(), org, repositoryName, developer))
                .Returns(Task.CompletedTask);

            var repositoryService = GetServiceForTest(developer, customTemplateServiceMock: customTemplateServiceMock.Object);

            try
            {
                var serviceConfig = new ServiceConfiguration
                {
                    RepositoryName = repositoryName,
                    ServiceName = repositoryName
                };

                var templates = new List<CustomTemplateReference>
                {
                    new() { Owner = "als", Id = "template-1" },
                    new() { Owner = "als", Id = "template-2" },
                    new() { Owner = "custom-org", Id = "template-3" }
                };

                // Act
                await repositoryService.CreateService(org, serviceConfig, templates);

                // Assert
                customTemplateServiceMock.Verify(
                    m => m.ApplyTemplateToRepository("als", "template-1", org, repositoryName, developer),
                    Times.Once);
                customTemplateServiceMock.Verify(
                    m => m.ApplyTemplateToRepository("als", "template-2", org, repositoryName, developer),
                    Times.Once);
                customTemplateServiceMock.Verify(
                    m => m.ApplyTemplateToRepository("custom-org", "template-3", org, repositoryName, developer),
                    Times.Once);
                customTemplateServiceMock.Verify(
                    m => m.ApplyTemplateToRepository(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()),
                    Times.Exactly(3));
            }
            finally
            {
                Thread.Sleep(400);
                TestDataHelper.DeleteDirectory(repositoryDirectory);
                TestDataHelper.DeleteDirectory(repositoryRemoteDirectory);
            }
        }

        [Fact]
        public async Task CreateRepository_WithNoTemplates_DoesNotApplyTemplates()
        {
            // Arrange
            string org = "ttd";
            string repositoryName = TestDataHelper.GenerateTestRepoName();
            string developer = "testUser";

            var repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, repositoryName, developer);
            var repositoryRemoteDirectory = TestDataHelper.GetTestDataRemoteRepository(org, repositoryName);

            Mock<ICustomTemplateService> customTemplateServiceMock = new();

            var repositoryService = GetServiceForTest(developer, customTemplateServiceMock: customTemplateServiceMock.Object);

            try
            {
                var serviceConfig = new ServiceConfiguration
                {
                    RepositoryName = repositoryName,
                    ServiceName = repositoryName
                };

                // Act
                await repositoryService.CreateService(org, serviceConfig, []);

                // Assert
                customTemplateServiceMock.Verify(
                    m => m.ApplyTemplateToRepository(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>()),
                    Times.Never);
            }
            finally
            {
                Thread.Sleep(400);
                TestDataHelper.DeleteDirectory(repositoryDirectory);
                TestDataHelper.DeleteDirectory(repositoryRemoteDirectory);
            }
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

            // Setup for the access token retrieval - TODO: remove when httpContextAccessor is removed from the service
            var authTicket = new AuthenticationTicket(principal, "TestScheme");
            authTicket.Properties.StoreTokens(
            [
                new AuthenticationToken { Name = "access_token", Value = "test-access-token" }
            ]);

            var authResult = AuthenticateResult.Success(authTicket);

            var authServiceMock = new Mock<IAuthenticationService>();
            authServiceMock
                .Setup(x => x.AuthenticateAsync(It.IsAny<HttpContext>(), It.IsAny<string>()))
                .ReturnsAsync(authResult);

            var serviceProviderMock = new Mock<IServiceProvider>();
            serviceProviderMock
                .Setup(x => x.GetService(typeof(IAuthenticationService)))
                .Returns(authServiceMock.Object);

            c.RequestServices = serviceProviderMock.Object;

            return c;
        }

        private static void PrepareRemoteTestData(string org, string app)
        {
            string remoteRepoPath = TestDataHelper.GetTestDataRemoteRepository(org, app);
            string configPath = Path.Combine(remoteRepoPath, "gitconfig");
            string newPath = Path.Combine(remoteRepoPath, ".git");

            if (!File.Exists(newPath))
            {
                Directory.CreateDirectory(Path.Combine(remoteRepoPath, ".git"));
                if (File.Exists(configPath))
                {
                    File.Copy(configPath, newPath + Path.DirectorySeparatorChar + "config");
                }
            }
        }

        private static void CleanUpRemoteTestData(string org, string app)
        {
            string remoteRepoPath = TestDataHelper.GetTestDataRemoteRepository(org, app);
            string gitFolder = Path.Combine(remoteRepoPath, ".git");
            if (Directory.Exists(gitFolder))
            {
                Directory.Delete(gitFolder, true);
            }
        }

        private static RepositoryService GetServiceForTest(string developer, ISourceControl sourceControlMock = null, ICustomTemplateService customTemplateServiceMock = null)
        {
            HttpContext ctx = GetHttpContextForTestUser(developer);

            Mock<IHttpContextAccessor> httpContextAccessorMock = new();
            httpContextAccessorMock.Setup(s => s.HttpContext).Returns(ctx);

            sourceControlMock ??= new ISourceControlMock();
            customTemplateServiceMock ??= new Mock<ICustomTemplateService>().Object;
            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(RepositoryServiceTests).Assembly.Location).LocalPath);
            ServiceRepositorySettings repoSettings = new()
            {
                RepositoryLocation = Path.Combine(unitTestFolder, "..", "..", "..", "_TestData", "Repositories") + Path.DirectorySeparatorChar
            };


            AltinnGitRepositoryFactory altinnGitRepositoryFactory = new(TestDataHelper.GetTestDataRepositoriesRootDirectory());

            GeneralSettings generalSettings = new()
            {
                TemplateLocation = @"../../../../../../../App/template/src",
                DeploymentLocation = @"../../../../../../../App/template/src/deployment",
                AppLocation = @"../../../../../../../App/template/src/App"
            };

            PlatformSettings platformSettings = new()
            {
                AppClusterUrlPattern = "https://{org}.{appPrefix}.{hostName}",
            };

            EnvironmentsService environmentsService = new(new HttpClient(), generalSettings, platformSettings, new Mock<IMemoryCache>().Object, new Mock<ILogger<EnvironmentsService>>().Object);

            AltinnStorageAppMetadataClient altinnStorageAppMetadataClient = new(new HttpClient(), environmentsService, new PlatformSettings(), new Mock<ILogger<AltinnStorageAppMetadataClient>>().Object);

            IGiteaClient giteaClientMock = new IGiteaClientMock();
            ApplicationMetadataService applicationInformationService = new(new Mock<ILogger<ApplicationMetadataService>>().Object, altinnStorageAppMetadataClient, altinnGitRepositoryFactory, httpContextAccessorMock.Object, giteaClientMock);

            ISchemaModelService schemaModelServiceMock = new Mock<ISchemaModelService>().Object;
            Mock<ILogger<GiteaContentLibraryService>> loggerMock = new();
            IOptionsService optionsService = new OptionsService(altinnGitRepositoryFactory, new GiteaContentLibraryService(giteaClientMock, loggerMock.Object));

            TextsService textsService = new(altinnGitRepositoryFactory, applicationInformationService, optionsService);

            ResourceRegistryService resourceRegistryService = new();

            RepositoryService service = new(
                repoSettings,
                generalSettings,
                httpContextAccessorMock.Object,
                giteaClientMock,
                sourceControlMock,
                new Mock<ILogger<RepositoryService>>().Object,
                altinnGitRepositoryFactory,
                applicationInformationService,
                textsService,
                resourceRegistryService,
                customTemplateServiceMock);

            return service;
        }
    }
}
