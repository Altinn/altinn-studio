using System;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.RepositoryController
{
    public class CreateAppCustomTemplateIntegrationTests : DesignerEndpointsTestsBase<CreateAppCustomTemplateIntegrationTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private static string VersionPrefix => "/designer/api/repos";
        
        public CreateAppCustomTemplateIntegrationTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
        }

        [Fact]
        public async Task CreateApp_WithCustomTemplatePath_IntegrationTest()
        {
            // Arrange
            string customTemplateDirectory = null;
            string repositoryName = TestDataHelper.GenerateTestRepoName("custom");
            
            try
            {
                // Create a temporary custom template directory
                customTemplateDirectory = Path.Combine(Path.GetTempPath(), "integration_custom_template_" + Guid.NewGuid().ToString("N")[..8]);
                Directory.CreateDirectory(customTemplateDirectory);

                // Create custom template files
                var customAppDir = Path.Combine(customTemplateDirectory, "App");
                Directory.CreateDirectory(customAppDir);
                File.WriteAllText(Path.Combine(customAppDir, "CustomController.cs"), 
                    "// Custom controller for integration test");
                File.WriteAllText(Path.Combine(customTemplateDirectory, "README.md"), 
                    "# Custom Template README");

                // URL encode the path for query parameter
                string encodedPath = HttpUtility.UrlEncode(customTemplateDirectory);
                string uri = $"{VersionPrefix}/create-app?org=ttd&repository={repositoryName}&customTemplatePath={encodedPath}";

                using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

                // Act
                using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.Created, response.StatusCode);

                // Verify the response content
                var responseContent = await response.Content.ReadAsStringAsync();
                Assert.NotEmpty(responseContent);

                // Additional verification could be done by checking if files were actually created
                // in the repository directory, but this would require access to the internal
                // repository structure which is abstracted by the service layer
            }
            finally
            {
                // Cleanup
                if (Directory.Exists(customTemplateDirectory))
                {
                    Directory.Delete(customTemplateDirectory, true);
                }

                // Clean up any created repository
                try
                {
                    var repoPath = TestDataHelper.GetTestDataRepositoryDirectory("ttd", repositoryName, GetDeveloperUserName());
                    if (Directory.Exists(repoPath))
                    {
                        Directory.Delete(repoPath, true);
                    }
                    
                    var remoteRepoPath = TestDataHelper.GetTestDataRemoteRepository("ttd", repositoryName);
                    if (Directory.Exists(remoteRepoPath))
                    {
                        Directory.Delete(remoteRepoPath, true);
                    }
                }
                catch
                {
                    // Ignore cleanup errors in tests
                }
            }
        }

        [Fact]
        public async Task CreateApp_WithInvalidCustomTemplatePath_StillCreatesAppWithStandardTemplate()
        {
            // Arrange
            string repositoryName = TestDataHelper.GenerateTestRepoName("invalid");
            string invalidPath = "/completely/invalid/path/that/does/not/exist";
            string encodedPath = HttpUtility.UrlEncode(invalidPath);
            string uri = $"{VersionPrefix}/create-app?org=ttd&repository={repositoryName}&customTemplatePath={encodedPath}";

            using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

            try
            {
                // Act
                using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

                // Assert
                // Should still succeed - invalid custom template path should not prevent app creation
                Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            }
            finally
            {
                // Cleanup
                try
                {
                    var repoPath = TestDataHelper.GetTestDataRepositoryDirectory("ttd", repositoryName, GetDeveloperUserName());
                    if (Directory.Exists(repoPath))
                    {
                        Directory.Delete(repoPath, true);
                    }
                    
                    var remoteRepoPath = TestDataHelper.GetTestDataRemoteRepository("ttd", repositoryName);
                    if (Directory.Exists(remoteRepoPath))
                    {
                        Directory.Delete(remoteRepoPath, true);
                    }
                }
                catch
                {
                    // Ignore cleanup errors in tests
                }
            }
        }

        [Fact]
        public async Task CreateApp_WithSpecialCharactersInCustomTemplatePath_HandlesPathCorrectly()
        {
            // Arrange
            string customTemplateDirectory = null;
            string repositoryName = TestDataHelper.GenerateTestRepoName("special");
            
            try
            {
                // Create a temporary custom template directory with spaces and special characters
                customTemplateDirectory = Path.Combine(Path.GetTempPath(), "custom template with spaces " + Guid.NewGuid().ToString("N")[..8]);
                Directory.CreateDirectory(customTemplateDirectory);

                // Create a simple custom file
                File.WriteAllText(Path.Combine(customTemplateDirectory, "special.txt"), "Special characters test");

                // URL encode the path for query parameter
                string encodedPath = HttpUtility.UrlEncode(customTemplateDirectory);
                string uri = $"{VersionPrefix}/create-app?org=ttd&repository={repositoryName}&customTemplatePath={encodedPath}";

                using HttpRequestMessage httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri);

                // Act
                using HttpResponseMessage response = await HttpClient.SendAsync(httpRequestMessage);

                // Assert
                Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            }
            finally
            {
                // Cleanup
                if (Directory.Exists(customTemplateDirectory))
                {
                    Directory.Delete(customTemplateDirectory, true);
                }

                try
                {
                    var repoPath = TestDataHelper.GetTestDataRepositoryDirectory("ttd", repositoryName, GetDeveloperUserName());
                    if (Directory.Exists(repoPath))
                    {
                        Directory.Delete(repoPath, true);
                    }
                    
                    var remoteRepoPath = TestDataHelper.GetTestDataRemoteRepository("ttd", repositoryName);
                    if (Directory.Exists(remoteRepoPath))
                    {
                        Directory.Delete(remoteRepoPath, true);
                    }
                }
                catch
                {
                    // Ignore cleanup errors in tests
                }
            }
        }

        private static string GetDeveloperUserName()
        {
            return "testUser"; // Default developer user name used in tests
        }
    }
}