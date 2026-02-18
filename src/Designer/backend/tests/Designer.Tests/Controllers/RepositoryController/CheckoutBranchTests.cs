using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.RepositoryController
{
    public class CheckoutBranchTests : DesignerEndpointsTestsBase<CheckoutBranchTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly Mock<ISourceControl> _sourceControlMock = new Mock<ISourceControl>();
        private readonly Mock<IRepository> _repositoryMock = new Mock<IRepository>();
        private static string VersionPrefix => "/designer/api/repos";
        private const string TestUser = "testUser";
        private const string TestAuthHandlerTokenValue = "test-access-token-for-git-operations";
        public CheckoutBranchTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGiteaClient, IGiteaClientMock>();
            services.AddSingleton(_sourceControlMock.Object);
            services.AddSingleton(_repositoryMock.Object);
        }

        [Theory]
        [InlineData("ttd", "apps-test", "feature/new-branch")]
        [InlineData("ttd", "apps-test", "main")]
        [InlineData("ttd", "apps-test", "develop")]
        public async Task CheckoutBranch_ValidBranch_ReturnsRepoStatus(string org, string repo, string branchName)
        {
            // Arrange
            string uri = $"{VersionPrefix}/repo/{org}/{repo}/checkout";
            var expectedRepoStatus = new RepoStatus
            {
                RepositoryStatus = RepositoryStatus.Ok,
                CurrentBranch = branchName
            };
            AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, TestUser);

            _sourceControlMock
                .Setup(x => x.GetUncommittedChanges(editingContext, branchName))
                .Returns((UncommittedChangesError)null);

            _repositoryMock
                .Setup(x => x.ResetLocalRepository(editingContext))
                .ReturnsAsync(true);

            _sourceControlMock
                .Setup(x => x.CheckoutRepoOnBranch(editingContext, branchName));

            _sourceControlMock
                .Setup(x => x.RepositoryStatus(editingContext))
                .Returns(expectedRepoStatus);

            var request = new CheckoutBranchRequest { BranchName = branchName };
            using var content = new StringContent(
                JsonSerializer.Serialize(request, JsonSerializerOptions),
                Encoding.UTF8,
                "application/json");

            // Act
            using HttpResponseMessage response = await HttpClient.PostAsync(uri, content);
            var responseContent = await response.Content.ReadAsAsync<RepoStatus>();

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.NotNull(responseContent);
            Assert.Equal(branchName, responseContent.CurrentBranch);
            Assert.Equal(RepositoryStatus.Ok, responseContent.RepositoryStatus);
            _sourceControlMock.Verify(x => x.GetUncommittedChanges(editingContext, branchName), Times.Once);
            _repositoryMock.Verify(x => x.ResetLocalRepository(editingContext), Times.Once);
            _sourceControlMock.Verify(x => x.CheckoutRepoOnBranch(editingContext, branchName), Times.Once);
            _sourceControlMock.Verify(x => x.RepositoryStatus(editingContext), Times.Once);
        }

        [Theory]
        [InlineData("ttd", "apps-test", "feature/branch-with-changes")]
        public async Task CheckoutBranch_WithUncommittedChanges_ReturnsConflict(string org, string repo, string targetBranch)
        {
            // Arrange
            string uri = $"{VersionPrefix}/repo/{org}/{repo}/checkout";
            string currentBranch = "main";
            AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, TestUser);

            var uncommittedFiles = new List<UncommittedFile>
            {
                new UncommittedFile { FilePath = "src/file1.cs", Status = "Modified" },
                new UncommittedFile { FilePath = "src/file2.cs", Status = "Added" }
            };

            var errorDetails = new UncommittedChangesError
            {
                Error = "Cannot switch branches with uncommitted changes",
                Message = "You have uncommitted changes. Please commit and push your changes, or discard them before switching branches.",
                CurrentBranch = currentBranch,
                TargetBranch = targetBranch,
                UncommittedFiles = uncommittedFiles
            };

            _sourceControlMock
                .Setup(x => x.GetUncommittedChanges(editingContext, targetBranch))
                .Returns(errorDetails);

            var request = new CheckoutBranchRequest { BranchName = targetBranch };
            using var content = new StringContent(
                JsonSerializer.Serialize(request, JsonSerializerOptions),
                Encoding.UTF8,
                "application/json");

            // Act
            using HttpResponseMessage response = await HttpClient.PostAsync(uri, content);

            // Assert
            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);

            var responseContent = await response.Content.ReadAsAsync<UncommittedChangesError>();
            Assert.NotNull(responseContent);
            Assert.Equal(currentBranch, responseContent.CurrentBranch);
            Assert.Equal(targetBranch, responseContent.TargetBranch);
            Assert.Equal(2, responseContent.UncommittedFiles.Count);
            _sourceControlMock.Verify(x => x.GetUncommittedChanges(editingContext, targetBranch), Times.Once);
            _repositoryMock.Verify(x => x.ResetLocalRepository(It.IsAny<AltinnRepoEditingContext>()), Times.Never);
            _sourceControlMock.Verify(x => x.CheckoutRepoOnBranch(It.IsAny<AltinnRepoEditingContext>(), It.IsAny<string>()), Times.Never);
        }

        [Theory]
        [InlineData("ttd", "apps-test", null)]
        [InlineData("ttd", "apps-test", "")]
        [InlineData("ttd", "apps-test", "   ")]
        public async Task CheckoutBranch_EmptyBranchName_ReturnsBadRequest(string org, string repo, string branchName)
        {
            // Arrange
            string uri = $"{VersionPrefix}/repo/{org}/{repo}/checkout";

            var request = new CheckoutBranchRequest { BranchName = branchName };
            using var content = new StringContent(
                JsonSerializer.Serialize(request, JsonSerializerOptions),
                Encoding.UTF8,
                "application/json");

            // Act
            using HttpResponseMessage response = await HttpClient.PostAsync(uri, content);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            _sourceControlMock.Verify(x => x.GetUncommittedChanges(It.IsAny<AltinnRepoEditingContext>(), It.IsAny<string>()), Times.Never);
        }

        [Fact]
        public async Task CheckoutBranch_BranchNotFound_ReturnsError()
        {
            // Arrange
            string org = "ttd";
            string repo = "apps-test";
            string branchName = "non-existing-branch";
            string uri = $"{VersionPrefix}/repo/{org}/{repo}/checkout";
            AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, TestUser);

            _sourceControlMock
                .Setup(x => x.GetUncommittedChanges(editingContext, branchName))
                .Returns((UncommittedChangesError)null);

            _repositoryMock
                .Setup(x => x.ResetLocalRepository(editingContext))
                .ReturnsAsync(true);

            _sourceControlMock
                .Setup(x => x.CheckoutRepoOnBranch(editingContext, branchName))
                .Throws(new LibGit2Sharp.NotFoundException("Branch not found"));

            var request = new CheckoutBranchRequest { BranchName = branchName };
            using var content = new StringContent(
                JsonSerializer.Serialize(request, JsonSerializerOptions),
                Encoding.UTF8,
                "application/json");

            // Act
            using HttpResponseMessage response = await HttpClient.PostAsync(uri, content);

            // Assert
            Assert.Equal(HttpStatusCode.InternalServerError, response.StatusCode);
            _sourceControlMock.Verify(x => x.GetUncommittedChanges(editingContext, branchName), Times.Once);
            _repositoryMock.Verify(x => x.ResetLocalRepository(editingContext), Times.Once);
            _sourceControlMock.Verify(x => x.CheckoutRepoOnBranch(editingContext, branchName), Times.Once);
        }
    }
}
