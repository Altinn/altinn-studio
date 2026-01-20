using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.RepositoryController
{
    public class CreateBranchTests : DesignerEndpointsTestsBase<CreateBranchTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly Mock<ISourceControl> _sourceControlMock = new Mock<ISourceControl>();
        private static string VersionPrefix => "/designer/api/repos";
        public CreateBranchTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGiteaClient, IGiteaClientMock>();
            services.AddSingleton(_sourceControlMock.Object);
        }

        [Theory]
        [InlineData("ttd", "apps-test", "feature/new-branch")]
        [InlineData("ttd", "apps-test", "bugfix/issue-123")]
        [InlineData("ttd", "apps-test", "release/v1.0")]
        public async Task CreateBranch_ValidBranchName_ReturnsCreatedBranch(string org, string repo, string branchName)
        {
            // Arrange
            string uri = $"{VersionPrefix}/repo/{org}/{repo}/branches";
            var expectedBranch = new Branch { Name = branchName };
            AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, "testUser");

            _sourceControlMock
                .Setup(x => x.CreateBranch(editingContext, branchName))
                .ReturnsAsync(expectedBranch);

            var request = new CreateBranchRequest { BranchName = branchName };
            using var content = new StringContent(
                JsonSerializer.Serialize(request, JsonSerializerOptions),
                Encoding.UTF8,
                "application/json");

            // Act
            using HttpResponseMessage response = await HttpClient.PostAsync(uri, content);
            var responseContent = await response.Content.ReadAsAsync<Branch>();

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.NotNull(responseContent);
            Assert.Equal(branchName, responseContent.Name);
            _sourceControlMock.Verify(x => x.CreateBranch(editingContext, branchName), Times.Once);
        }

        [Theory]
        [InlineData("ttd", "apps-test", "existing-branch")]
        public async Task CreateBranch_BranchAlreadyExists_ReturnsError(string org, string repo, string branchName)
        {
            // Arrange
            string uri = $"{VersionPrefix}/repo/{org}/{repo}/branches";
            AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, "testUser");

            _sourceControlMock
                .Setup(x => x.CreateBranch(editingContext, branchName))
                .ThrowsAsync(new LibGit2Sharp.NameConflictException("Branch already exists"));

            var request = new CreateBranchRequest { BranchName = branchName };
            using var content = new StringContent(
                JsonSerializer.Serialize(request, JsonSerializerOptions),
                Encoding.UTF8,
                "application/json");

            // Act
            using HttpResponseMessage response = await HttpClient.PostAsync(uri, content);

            // Assert
            // NameConflictException is handled by global exception handler and returns InternalServerError
            Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
            _sourceControlMock.Verify(x => x.CreateBranch(editingContext, branchName), Times.Once);
        }

        [Fact]
        public async Task CreateBranch_EmptyRequest_ReturnsBadRequest()
        {
            // Arrange
            string uri = $"{VersionPrefix}/repo/ttd/apps-test/branches";
            using var content = new StringContent("{}", Encoding.UTF8, "application/json");

            // Act
            using HttpResponseMessage response = await HttpClient.PostAsync(uri, content);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
    }
}
