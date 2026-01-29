using System;
using System.Collections.Generic;
using System.IO;
using System.Reflection;
using System.Security.Claims;
using System.Threading;
using Altinn.Studio.DataModeling.Metamodel;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Factories;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Implementation;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Mocks;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Moq;
using Xunit;

namespace Designer.Tests.Services
{
    public class RepositorySICustomTemplateTests
    {
        [Fact]
        public void CreateServiceMetadata_WithCustomTemplatePath_AppliesCustomTemplateOverlay()
        {
            // Arrange
            string developer = "testUser";
            string org = "ttd";
            string app = "test-app";
            
            var repositoriesRootDirectory = TestDataHelper.GetTestDataRepositoriesRootDirectory();
            var repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, app, developer);
            
            // Create a temporary custom template directory
            var customTemplateDirectory = Path.Combine(Path.GetTempPath(), "custom_template_test_" + Guid.NewGuid().ToString("N")[..8]);
            Directory.CreateDirectory(customTemplateDirectory);

            // Create custom template files
            var customAppDir = Path.Combine(customTemplateDirectory, "App");
            Directory.CreateDirectory(customAppDir);
            File.WriteAllText(Path.Combine(customAppDir, "CustomApp.cs"), "// Custom app file");
            File.WriteAllText(Path.Combine(customTemplateDirectory, "CustomRoot.txt"), "Custom root file");
            File.WriteAllText(Path.Combine(customTemplateDirectory, "Dockerfile"), "# Custom Dockerfile content");

            var repositoryService = GetServiceForTest(developer);

            try
            {
                // Ensure target directory exists
                Directory.CreateDirectory(repositoryDirectory);

                var metadata = new ModelMetadata
                {
                    Org = org,
                    ServiceName = app,
                    RepositoryName = app,
                };

                // Act
                bool result = repositoryService.CreateServiceMetadata(metadata, customTemplateDirectory);

                // Assert
                Assert.True(result, "CreateServiceMetadata should return true");

                var customAppFile = Path.Combine(repositoryDirectory, "App", "CustomApp.cs");
                var customRootFile = Path.Combine(repositoryDirectory, "CustomRoot.txt");
                var customDockerfile = Path.Combine(repositoryDirectory, "Dockerfile");

                Assert.True(File.Exists(customAppFile), "Custom app file should exist in repository");
                Assert.True(File.Exists(customRootFile), "Custom root file should exist in repository");
                Assert.True(File.Exists(customDockerfile), "Custom Dockerfile should override standard Dockerfile");
                
                Assert.Equal("// Custom app file", File.ReadAllText(customAppFile));
                Assert.Equal("Custom root file", File.ReadAllText(customRootFile));
                Assert.Equal("# Custom Dockerfile content", File.ReadAllText(customDockerfile));
            }
            finally
            {
                // Cleanup
                if (Directory.Exists(repositoryDirectory))
                {
                    Directory.Delete(repositoryDirectory, true);
                }
                if (Directory.Exists(customTemplateDirectory))
                {
                    Directory.Delete(customTemplateDirectory, true);
                }
            }
        }

        [Fact]
        public void CreateServiceMetadata_WithoutCustomTemplatePath_UsesStandardTemplateOnly()
        {
            // Arrange
            string developer = "testUser";
            string org = "ttd";
            string app = "test-app";
            
            var repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, app, developer);
            var repositoryService = GetServiceForTest(developer);

            try
            {
                // Ensure target directory exists
                Directory.CreateDirectory(repositoryDirectory);

                var metadata = new ModelMetadata
                {
                    Org = org,
                    ServiceName = app,
                    RepositoryName = app,
                };

                // Act
                bool result = repositoryService.CreateServiceMetadata(metadata, null);

                // Assert
                Assert.True(result, "CreateServiceMetadata should return true");

                // Verify standard files exist but no custom files
                var dockerFile = Path.Combine(repositoryDirectory, "Dockerfile");
                var customFile = Path.Combine(repositoryDirectory, "CustomRoot.txt");

                Assert.True(File.Exists(dockerFile), "Standard Dockerfile should exist");
                Assert.False(File.Exists(customFile), "No custom files should exist");
            }
            finally
            {
                // Cleanup
                if (Directory.Exists(repositoryDirectory))
                {
                    Directory.Delete(repositoryDirectory, true);
                }
            }
        }

        [Fact]
        public void ApplyCustomTemplateOverlay_WithNestedDirectories_CopiesAllFilesRecursively()
        {
            // Arrange
            string developer = "testUser";
            string org = "ttd";
            string app = "test-app";
            
            var repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, app, developer);
            
            // Create a temporary custom template directory with nested structure
            var customTemplateDirectory = Path.Combine(Path.GetTempPath(), "nested_template_test_" + Guid.NewGuid().ToString("N")[..8]);
            Directory.CreateDirectory(customTemplateDirectory);

            // Create nested structure
            var level1Dir = Path.Combine(customTemplateDirectory, "Level1");
            var level2Dir = Path.Combine(level1Dir, "Level2");
            Directory.CreateDirectory(level2Dir);

            File.WriteAllText(Path.Combine(customTemplateDirectory, "Root.txt"), "Root file");
            File.WriteAllText(Path.Combine(level1Dir, "Level1.txt"), "Level 1 file");
            File.WriteAllText(Path.Combine(level2Dir, "Level2.txt"), "Level 2 file");

            var repositoryService = GetServiceForTest(developer);

            try
            {
                // Ensure target directory exists  
                Directory.CreateDirectory(repositoryDirectory);

                // Use reflection to call the private method
                var method = typeof(RepositorySI).GetMethod("ApplyCustomTemplateOverlay", BindingFlags.NonPublic | BindingFlags.Instance);

                // Act
                method?.Invoke(repositoryService, new object[] { org, app, customTemplateDirectory });

                // Assert
                var rootFile = Path.Combine(repositoryDirectory, "Root.txt");
                var level1File = Path.Combine(repositoryDirectory, "Level1", "Level1.txt");
                var level2File = Path.Combine(repositoryDirectory, "Level1", "Level2", "Level2.txt");

                Assert.True(File.Exists(rootFile), "Root file should exist");
                Assert.True(File.Exists(level1File), "Level 1 file should exist");
                Assert.True(File.Exists(level2File), "Level 2 file should exist");
                
                Assert.Equal("Root file", File.ReadAllText(rootFile));
                Assert.Equal("Level 1 file", File.ReadAllText(level1File));
                Assert.Equal("Level 2 file", File.ReadAllText(level2File));
            }
            finally
            {
                // Cleanup
                if (Directory.Exists(repositoryDirectory))
                {
                    Directory.Delete(repositoryDirectory, true);
                }
                if (Directory.Exists(customTemplateDirectory))
                {
                    Directory.Delete(customTemplateDirectory, true);
                }
            }
        }

        [Fact]
        public void CopyDirectoryRecursively_WithOverrideExisting_OverwritesExistingFiles()
        {
            // Arrange
            var sourceDir = Path.Combine(Path.GetTempPath(), "source_" + Guid.NewGuid().ToString("N")[..8]);
            var targetDir = Path.Combine(Path.GetTempPath(), "target_" + Guid.NewGuid().ToString("N")[..8]);
            
            Directory.CreateDirectory(sourceDir);
            Directory.CreateDirectory(targetDir);

            // Create source files
            File.WriteAllText(Path.Combine(sourceDir, "File1.txt"), "Source content");
            
            // Create existing target file with different content
            File.WriteAllText(Path.Combine(targetDir, "File1.txt"), "Original content");

            var repositoryService = GetServiceForTest("testUser");

            try
            {
                // Use reflection to call the private method
                var method = typeof(RepositorySI).GetMethod("CopyDirectoryRecursively", BindingFlags.NonPublic | BindingFlags.Instance);

                // Act
                method?.Invoke(repositoryService, new object[] { sourceDir, targetDir, true });

                // Assert
                var targetFile = Path.Combine(targetDir, "File1.txt");
                Assert.True(File.Exists(targetFile), "Target file should exist");
                Assert.Equal("Source content", File.ReadAllText(targetFile));
            }
            finally
            {
                // Cleanup
                if (Directory.Exists(sourceDir))
                {
                    Directory.Delete(sourceDir, true);
                }
                if (Directory.Exists(targetDir))
                {
                    Directory.Delete(targetDir, true);
                }
            }
        }

        [Fact]
        public void CopyDirectoryRecursively_WithoutOverrideExisting_DoesNotOverwriteExistingFiles()
        {
            // Arrange
            var sourceDir = Path.Combine(Path.GetTempPath(), "source_" + Guid.NewGuid().ToString("N")[..8]);
            var targetDir = Path.Combine(Path.GetTempPath(), "target_" + Guid.NewGuid().ToString("N")[..8]);
            
            Directory.CreateDirectory(sourceDir);
            Directory.CreateDirectory(targetDir);

            // Create source files
            File.WriteAllText(Path.Combine(sourceDir, "File1.txt"), "Source content");
            
            // Create existing target file with different content
            File.WriteAllText(Path.Combine(targetDir, "File1.txt"), "Original content");

            var repositoryService = GetServiceForTest("testUser");

            try
            {
                // Use reflection to call the private method
                var method = typeof(RepositorySI).GetMethod("CopyDirectoryRecursively", BindingFlags.NonPublic | BindingFlags.Instance);

                // Act & Assert - Should throw exception when trying to copy without overriding
                var exception = Assert.Throws<TargetInvocationException>(() =>
                    method?.Invoke(repositoryService, new object[] { sourceDir, targetDir, false }));
                
                Assert.IsType<IOException>(exception.InnerException);
            }
            finally
            {
                // Cleanup
                if (Directory.Exists(sourceDir))
                {
                    Directory.Delete(sourceDir, true);
                }
                if (Directory.Exists(targetDir))
                {
                    Directory.Delete(targetDir, true);
                }
            }
        }

        [Fact]
        public void CreateServiceMetadata_WithEmptyCustomTemplatePath_DoesNotApplyCustomTemplate()
        {
            // Arrange
            string developer = "testUser";
            string org = "ttd";
            string app = "test-app";
            
            var repositoryDirectory = TestDataHelper.GetTestDataRepositoryDirectory(org, app, developer);
            var repositoryService = GetServiceForTest(developer);

            try
            {
                // Ensure target directory exists
                Directory.CreateDirectory(repositoryDirectory);

                var metadata = new ModelMetadata
                {
                    Org = org,
                    ServiceName = app,
                    RepositoryName = app,
                };

                // Act
                bool result = repositoryService.CreateServiceMetadata(metadata, "");

                // Assert
                Assert.True(result, "CreateServiceMetadata should return true");
                
                // Should work the same as no custom template path
                var dockerFile = Path.Combine(repositoryDirectory, "Dockerfile");
                Assert.True(File.Exists(dockerFile), "Standard Dockerfile should exist");
            }
            finally
            {
                // Cleanup
                if (Directory.Exists(repositoryDirectory))
                {
                    Directory.Delete(repositoryDirectory, true);
                }
            }
        }

        private static RepositorySI GetServiceForTest(string developer)
        {
            HttpContext ctx = GetHttpContextForTestUser(developer);

            Mock<IHttpContextAccessor> httpContextAccessorMock = new();
            httpContextAccessorMock.Setup(s => s.HttpContext).Returns(ctx);

            ISourceControl sourceControlMock = new ISourceControlMock();

            string unitTestFolder = Path.GetDirectoryName(new Uri(typeof(RepositorySICustomTemplateTests).Assembly.Location).LocalPath);
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

            IGiteaClient giteaClientMock = new IGiteaClientMock();
            ApplicationMetadataService applicationInformationService = new(
                new Mock<ILogger<ApplicationMetadataService>>().Object, 
                null, 
                altinnGitRepositoryFactory, 
                httpContextAccessorMock.Object, 
                giteaClientMock);

            ISchemaModelService schemaModelServiceMock = new Mock<ISchemaModelService>().Object;
            AppDevelopmentService appDevelopmentService = new(altinnGitRepositoryFactory, schemaModelServiceMock);
            Mock<ILogger<GiteaContentLibraryService>> loggerMock = new();
            IOptionsService optionsService = new OptionsService(altinnGitRepositoryFactory, new GiteaContentLibraryService(giteaClientMock, loggerMock.Object));

            TextsService textsService = new(altinnGitRepositoryFactory, applicationInformationService, optionsService);
            ResourceRegistryService resourceRegistryService = new();

            RepositorySI service = new(
                repoSettings,
                generalSettings,
                httpContextAccessorMock.Object,
                new IGiteaClientMock(),
                sourceControlMock,
                new Mock<ILogger<RepositorySI>>().Object,
                altinnGitRepositoryFactory,
                applicationInformationService,
                appDevelopmentService,
                textsService,
                resourceRegistryService);

            return service;
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
    }
}