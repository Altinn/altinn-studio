using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Configuration;
using Altinn.Studio.Designer.Enums;
using Altinn.Studio.Designer.Exceptions;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.RepositoryController;

public class DiscardAndCheckoutBranchTests
    : DesignerEndpointsTestsBase<DiscardAndCheckoutBranchTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IBranchService> _branchServiceMock = new Mock<IBranchService>();
    private static string VersionPrefix => "/designer/api";
    private const string TestUser = "testUser";
    private const string TestAuthHandlerTokenValue = "test-access-token-for-git-operations";

    public DiscardAndCheckoutBranchTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.Configure<ServiceRepositorySettings>(c => c.RepositoryLocation = TestRepositoriesLocation);
        services.AddSingleton<IGiteaClient, IGiteaClientMock>();
        services.AddSingleton(_branchServiceMock.Object);
    }

    [Theory]
    [InlineData("ttd", "apps-test", "master")]
    public async Task DiscardAndCheckoutBranch_ValidBranch_ReturnsRepoStatus(string org, string repo, string branchName)
    {
        // Arrange
        string uri = $"{VersionPrefix}/{org}/{repo}/branches/discard-and-checkout";
        var expectedRepoStatus = new RepoStatus { RepositoryStatus = RepositoryStatus.Ok, CurrentBranch = branchName };
        AltinnAuthenticatedRepoEditingContext authenticatedContext =
            AltinnAuthenticatedRepoEditingContext.FromOrgRepoDeveloperToken(
                org,
                repo,
                TestUser,
                TestAuthHandlerTokenValue
            );

        _branchServiceMock
            .Setup(x => x.DiscardChangesAndCheckout(authenticatedContext, branchName))
            .Returns(expectedRepoStatus);

        var request = new CheckoutBranchRequest { BranchName = branchName };
        using var content = new StringContent(
            JsonSerializer.Serialize(request, JsonSerializerOptions),
            Encoding.UTF8,
            "application/json"
        );

        // Act
        using HttpResponseMessage response = await HttpClient.PostAsync(uri, content);
        var responseContent = await response.Content.ReadAsAsync<RepoStatus>();

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.NotNull(responseContent);
        Assert.Equal(branchName, responseContent.CurrentBranch);
        _branchServiceMock.Verify(x => x.DiscardChangesAndCheckout(authenticatedContext, branchName), Times.Once);
    }

    [Theory]
    [InlineData("ttd", "apps-test", "feature/target")]
    public async Task DiscardAndCheckoutBranch_WithUncommittedChanges_ReturnsConflict(
        string org,
        string repo,
        string branchName
    )
    {
        // Arrange
        string uri = $"{VersionPrefix}/{org}/{repo}/branches/discard-and-checkout";
        var errorDetails = new UncommittedChangesError
        {
            Message = "You have uncommitted changes",
            CurrentBranch = "main",
            TargetBranch = branchName,
            UncommittedFiles = new List<UncommittedFile>
            {
                new UncommittedFile { FilePath = "src/file1.cs", Status = "Modified" },
            },
        };

        _branchServiceMock
            .Setup(x => x.DiscardChangesAndCheckout(It.IsAny<AltinnAuthenticatedRepoEditingContext>(), branchName))
            .Throws(new UncommittedChangesException(errorDetails));

        var request = new CheckoutBranchRequest { BranchName = branchName };
        using var content = new StringContent(
            JsonSerializer.Serialize(request, JsonSerializerOptions),
            Encoding.UTF8,
            "application/json"
        );

        // Act
        using HttpResponseMessage response = await HttpClient.PostAsync(uri, content);

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var responseContent = await response.Content.ReadAsAsync<UncommittedChangesError>();
        Assert.NotNull(responseContent);
        Assert.Equal(branchName, responseContent.TargetBranch);
    }

    [Theory]
    [InlineData("ttd", "apps-test", null)]
    [InlineData("ttd", "apps-test", "")]
    public async Task DiscardAndCheckoutBranch_EmptyBranchName_ReturnsBadRequest(
        string org,
        string repo,
        string branchName
    )
    {
        // Arrange
        string uri = $"{VersionPrefix}/{org}/{repo}/branches/discard-and-checkout";
        var request = new CheckoutBranchRequest { BranchName = branchName };
        using var content = new StringContent(
            JsonSerializer.Serialize(request, JsonSerializerOptions),
            Encoding.UTF8,
            "application/json"
        );

        // Act
        using HttpResponseMessage response = await HttpClient.PostAsync(uri, content);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        _branchServiceMock.Verify(
            x => x.DiscardChangesAndCheckout(It.IsAny<AltinnAuthenticatedRepoEditingContext>(), It.IsAny<string>()),
            Times.Never
        );
    }
}
