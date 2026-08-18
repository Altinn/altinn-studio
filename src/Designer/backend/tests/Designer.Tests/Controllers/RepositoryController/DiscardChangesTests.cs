using System.Collections.Generic;
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

public class DiscardChangesTests
    : DesignerEndpointsTestsBase<DiscardChangesTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IBranchService> _branchServiceMock = new Mock<IBranchService>();
    private static string VersionPrefix => "/designer/api";

    public DiscardChangesTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.Configure<ServiceRepositorySettings>(c => c.RepositoryLocation = TestRepositoriesLocation);
        services.AddSingleton<IGiteaClient, IGiteaClientMock>();
        services.AddSingleton(_branchServiceMock.Object);
    }

    [Theory]
    [InlineData("ttd", "apps-test")]
    [InlineData("ttd", "repo-with-changes")]
    public async Task DiscardLocalChanges_WithUncommittedChanges_ReturnsCleanRepoStatus(string org, string repo)
    {
        // Arrange
        string uri = $"{VersionPrefix}/{org}/{repo}/branches/discard-changes";
        var expectedRepoStatus = new RepoStatus
        {
            RepositoryStatus = RepositoryStatus.Ok,
            CurrentBranch = "main",
            ContentStatus = new List<RepositoryContent>(),
        };
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, "testUser");

        _branchServiceMock.Setup(x => x.DiscardLocalChanges(editingContext)).Returns(expectedRepoStatus);

        // Act
        using HttpResponseMessage response = await HttpClient.PostAsync(uri, null);
        var responseContent = await response.Content.ReadAsAsync<RepoStatus>();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(responseContent);
        Assert.Equal(RepositoryStatus.Ok, responseContent.RepositoryStatus);
        Assert.Empty(responseContent.ContentStatus);
        _branchServiceMock.Verify(x => x.DiscardLocalChanges(editingContext), Times.Once);
    }

    [Theory]
    [InlineData("ttd", "apps-test")]
    public async Task DiscardLocalChanges_NoChanges_ReturnsRepoStatus(string org, string repo)
    {
        // Arrange
        string uri = $"{VersionPrefix}/{org}/{repo}/branches/discard-changes";
        var expectedRepoStatus = new RepoStatus
        {
            RepositoryStatus = RepositoryStatus.Ok,
            CurrentBranch = "main",
            ContentStatus = new List<RepositoryContent>(),
        };
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, "testUser");

        _branchServiceMock.Setup(x => x.DiscardLocalChanges(editingContext)).Returns(expectedRepoStatus);

        // Act
        using HttpResponseMessage response = await HttpClient.PostAsync(uri, null);
        var responseContent = await response.Content.ReadAsAsync<RepoStatus>();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(responseContent);
        Assert.Equal(RepositoryStatus.Ok, responseContent.RepositoryStatus);
        _branchServiceMock.Verify(x => x.DiscardLocalChanges(editingContext), Times.Once);
    }

    [Fact]
    public async Task DiscardLocalChanges_RepositoryNotFound_ReturnsNotFound()
    {
        // Arrange
        string org = "ttd";
        string repo = "non-existing-repo";
        string uri = $"{VersionPrefix}/{org}/{repo}/branches/discard-changes";
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, "testUser");

        _branchServiceMock
            .Setup(x => x.DiscardLocalChanges(editingContext))
            .Throws(new LibGit2Sharp.RepositoryNotFoundException("Repository not found"));

        // Act
        using HttpResponseMessage response = await HttpClient.PostAsync(uri, null);

        // Assert
        // RepositoryNotFoundException is handled by global exception handler and returns NotFound
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        _branchServiceMock.Verify(x => x.DiscardLocalChanges(editingContext), Times.Once);
    }

    [Theory]
    [InlineData("ttd", "apps-test", "main")]
    [InlineData("ttd", "apps-test", "feature/test")]
    public async Task DiscardLocalChanges_MultipleFiles_DiscardsAll(string org, string repo, string branchName)
    {
        // Arrange
        string uri = $"{VersionPrefix}/{org}/{repo}/branches/discard-changes";

        // Repo status after discarding should be clean
        var expectedRepoStatus = new RepoStatus
        {
            RepositoryStatus = RepositoryStatus.Ok,
            CurrentBranch = branchName,
            ContentStatus = new List<RepositoryContent>(),
        };
        AltinnRepoEditingContext editingContext = AltinnRepoEditingContext.FromOrgRepoDeveloper(org, repo, "testUser");

        _branchServiceMock.Setup(x => x.DiscardLocalChanges(editingContext)).Returns(expectedRepoStatus);

        // Act
        using HttpResponseMessage response = await HttpClient.PostAsync(uri, null);
        var responseContent = await response.Content.ReadAsAsync<RepoStatus>();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(responseContent);
        Assert.Equal(branchName, responseContent.CurrentBranch);
        Assert.Empty(responseContent.ContentStatus);
        _branchServiceMock.Verify(x => x.DiscardLocalChanges(editingContext), Times.Once);
    }
}
