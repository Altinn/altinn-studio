using System.Net;
using System.Net.Http;
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

namespace Designer.Tests.Controllers.RepositoryController;

public class DeleteBranchTests
    : DesignerEndpointsTestsBase<DeleteBranchTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IBranchService> _branchServiceMock = new Mock<IBranchService>();
    private static string VersionPrefix => "/designer/api/repos";

    public DeleteBranchTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.Configure<ServiceRepositorySettings>(c => c.RepositoryLocation = TestRepositoriesLocation);
        services.AddSingleton<IGiteaClient, IGiteaClientMock>();
        services.AddSingleton(_branchServiceMock.Object);
    }

    [Theory]
    [InlineData("ttd", "apps-test", "feature/new-branch")]
    [InlineData("ttd", "apps-test", "bugfix/issue-123")]
    public async Task DeleteBranch_Success_ReturnsNoContent(string org, string repo, string branchName)
    {
        // Arrange
        string uri = $"{VersionPrefix}/repo/{org}/{repo}/branches/{branchName}";
        _branchServiceMock
            .Setup(x => x.DeleteBranch(It.IsAny<AltinnAuthenticatedRepoEditingContext>(), branchName))
            .Returns(DeleteBranchResult.Success);

        // Act
        using HttpResponseMessage response = await HttpClient.DeleteAsync(uri);

        // Assert
        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        _branchServiceMock.Verify(
            x => x.DeleteBranch(It.IsAny<AltinnAuthenticatedRepoEditingContext>(), branchName),
            Times.Once
        );
    }

    [Theory]
    [InlineData("ttd", "apps-test", "master", DeleteBranchResult.DefaultBranchProtected)]
    [InlineData("ttd", "apps-test", "current-branch", DeleteBranchResult.CheckedOutBranchProtected)]
    [InlineData("ttd", "apps-test", "invalid-branch", DeleteBranchResult.InvalidBranchName)]
    public async Task DeleteBranch_ProtectedOrInvalid_ReturnsBadRequest(
        string org,
        string repo,
        string branchName,
        DeleteBranchResult result
    )
    {
        // Arrange
        string uri = $"{VersionPrefix}/repo/{org}/{repo}/branches/{branchName}";
        _branchServiceMock
            .Setup(x => x.DeleteBranch(It.IsAny<AltinnAuthenticatedRepoEditingContext>(), branchName))
            .Returns(result);

        // Act
        using HttpResponseMessage response = await HttpClient.DeleteAsync(uri);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
