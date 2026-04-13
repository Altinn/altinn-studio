using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Constants;
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
    public class DeleteBranchTests
        : DesignerEndpointsTestsBase<DeleteBranchTests>,
            IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly Mock<ISourceControl> _sourceControlMock = new Mock<ISourceControl>();
        private static string VersionPrefix => "/designer/api/repos";
        private const string TestUser = "testUser";
        private const string TestAuthHandlerTokenValue = "test-access-token-for-git-operations";

        public DeleteBranchTests(WebApplicationFactory<Program> factory)
            : base(factory) { }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c => c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGiteaClient, IGiteaClientMock>();
            services.AddSingleton(_sourceControlMock.Object);
        }

        [Theory]
        [InlineData("ttd", "apps-test", "feature/new-branch")]
        [InlineData("ttd", "apps-test", "bugfix/issue-123")]
        public async Task DeleteBranch_ValidBranchName_ReturnsNoContent(string org, string repo, string branchName)
        {
            // Arrange
            string uri = $"{VersionPrefix}/repo/{org}/{repo}/branches/{branchName}";
            AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
                org,
                repo,
                TestUser
            );
            AltinnAuthenticatedRepoEditingContext authenticatedContext =
                AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(
                    org,
                    repo,
                    TestUser,
                    TestAuthHandlerTokenValue
                );

            _sourceControlMock
                .Setup(x => x.GetCurrentBranch(editingContext))
                .Returns(new CurrentBranchInfo { BranchName = General.DefaultBranch });

            // Act
            using HttpResponseMessage response = await HttpClient.DeleteAsync(uri);

            // Assert
            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
            _sourceControlMock.Verify(x => x.DeleteRemoteBranchIfExists(authenticatedContext, branchName), Times.Once);
            _sourceControlMock.Verify(x => x.DeleteLocalBranchIfExists(editingContext, branchName), Times.Once);
        }

        [Theory]
        [InlineData("ttd", "apps-test")]
        public async Task DeleteBranch_DefaultBranch_ReturnsBadRequest(string org, string repo)
        {
            // Arrange
            string uri = $"{VersionPrefix}/repo/{org}/{repo}/branches/{General.DefaultBranch}";

            // Act
            using HttpResponseMessage response = await HttpClient.DeleteAsync(uri);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            _sourceControlMock.Verify(
                x =>
                    x.DeleteRemoteBranchIfExists(It.IsAny<AltinnAuthenticatedRepoEditingContext>(), It.IsAny<string>()),
                Times.Never
            );
            _sourceControlMock.Verify(
                x => x.DeleteLocalBranchIfExists(It.IsAny<AltinnRepoEditingContext>(), It.IsAny<string>()),
                Times.Never
            );
        }

        [Theory]
        [InlineData("ttd", "apps-test", "current-branch")]
        public async Task DeleteBranch_CurrentBranch_ReturnsBadRequest(string org, string repo, string branchName)
        {
            // Arrange
            string uri = $"{VersionPrefix}/repo/{org}/{repo}/branches/{branchName}";
            AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(
                org,
                repo,
                TestUser
            );

            _sourceControlMock
                .Setup(x => x.GetCurrentBranch(editingContext))
                .Returns(new CurrentBranchInfo { BranchName = branchName });

            // Act
            using HttpResponseMessage response = await HttpClient.DeleteAsync(uri);

            // Assert
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
            _sourceControlMock.Verify(
                x =>
                    x.DeleteRemoteBranchIfExists(It.IsAny<AltinnAuthenticatedRepoEditingContext>(), It.IsAny<string>()),
                Times.Never
            );
            _sourceControlMock.Verify(
                x => x.DeleteLocalBranchIfExists(It.IsAny<AltinnRepoEditingContext>(), It.IsAny<string>()),
                Times.Never
            );
        }
    }
}
