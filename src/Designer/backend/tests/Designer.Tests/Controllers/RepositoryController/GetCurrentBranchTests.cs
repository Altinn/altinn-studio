using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Configuration;
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
    public class GetCurrentBranchTests : DesignerEndpointsTestsBase<GetCurrentBranchTests>, IClassFixture<WebApplicationFactory<Program>>
    {
        private readonly Mock<ISourceControl> _sourceControlMock = new Mock<ISourceControl>();
        private static string VersionPrefix => "/designer/api/repos";
        public GetCurrentBranchTests(WebApplicationFactory<Program> factory) : base(factory)
        {
        }

        protected override void ConfigureTestServices(IServiceCollection services)
        {
            services.Configure<ServiceRepositorySettings>(c =>
                c.RepositoryLocation = TestRepositoriesLocation);
            services.AddSingleton<IGitea, IGiteaMock>();
            services.AddSingleton(_sourceControlMock.Object);
        }

        [Theory]
        [InlineData("ttd", "apps-test", "master")]
        [InlineData("ttd", "apps-test", "main")]
        [InlineData("ttd", "apps-test", "feature/new-feature")]
        public async Task GetCurrentBranch_ValidRepository_ReturnsCurrentBranchInfo(string org, string repo, string branchName)
        {
            // Arrange
            string uri = $"{VersionPrefix}/repo/{org}/{repo}/current-branch";
            var expectedBranchInfo = new CurrentBranchInfo { BranchName = branchName };

            _sourceControlMock
                .Setup(x => x.GetCurrentBranch(org, repo))
                .Returns(expectedBranchInfo);

            // Act
            using HttpResponseMessage response = await HttpClient.GetAsync(uri);
            var responseContent = await response.Content.ReadAsAsync<CurrentBranchInfo>();

            // Assert
            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.NotNull(responseContent);
            Assert.Equal(branchName, responseContent.BranchName);
            _sourceControlMock.Verify(x => x.GetCurrentBranch(org, repo), Times.Once);
        }

        [Fact]
        public async Task GetCurrentBranch_RepositoryNotFound_ReturnsNotFound()
        {
            // Arrange
            string org = "ttd";
            string repo = "non-existing-repo";
            string uri = $"{VersionPrefix}/repo/{org}/{repo}/current-branch";

            _sourceControlMock
                .Setup(x => x.GetCurrentBranch(org, repo))
                .Throws(new LibGit2Sharp.RepositoryNotFoundException("Repository not found"));

            // Act
            using HttpResponseMessage response = await HttpClient.GetAsync(uri);

            // Assert
            // RepositoryNotFoundException is handled by global exception handler and returns NotFound
            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            _sourceControlMock.Verify(x => x.GetCurrentBranch(org, repo), Times.Once);
        }
    }
}
