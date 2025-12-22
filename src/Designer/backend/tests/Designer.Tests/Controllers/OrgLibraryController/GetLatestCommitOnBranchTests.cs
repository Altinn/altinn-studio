using System.Net;
using System.Net.Http;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.Services.Interfaces.Organisation;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.OrgLibraryController;

public class GetLatestCommitOnBranchTests(WebApplicationFactory<Program> factory) : DesignerEndpointsTestsBase<GetLatestCommitOnBranchTests>(factory), IClassFixture<WebApplicationFactory<Program>>
{

    private readonly Mock<IOrgLibraryService> _orgLibraryServiceMock = new();
    private readonly Mock<IUserOrganizationService> _userOrganizationServiceMock = new();
    private const string Org = "ttd";

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        services.AddSingleton<IGiteaClient, IGiteaClientMock>();
        services.AddSingleton(_ => _userOrganizationServiceMock.Object);
        services.AddSingleton(_ => _orgLibraryServiceMock.Object);
    }


    [Fact]
    public async Task GetLatestCommitOnBranch_ValidRequest_ReturnsOk()
    {
        // Arrange
        string branchName = "main";
        string expectedCommitId = "abc123def456";
        string url = ApiUrl(branchName);

        _orgLibraryServiceMock
            .Setup(s => s.GetLatestCommitOnBranch(Org, branchName, It.IsAny<CancellationToken>()))
            .ReturnsAsync(expectedCommitId);

        _userOrganizationServiceMock
            .Setup(s => s.UserIsMemberOfOrganization(Org))
            .ReturnsAsync(true);

        // Act
        HttpResponseMessage response = await HttpClient.GetAsync(url);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        LatestCommitShaResponse latestCommit = await response.Content.ReadAsAsync<LatestCommitShaResponse>();
        Assert.Equal(expectedCommitId, latestCommit.LatestCommitSha);
        _orgLibraryServiceMock.VerifyAll();
        _userOrganizationServiceMock.VerifyAll();
    }

    [Fact]
    public async Task GetLatestCommitOnBranch_UserNotMember_ReturnsForbidden()
    {
        // Arrange
        string branchName = "main";
        string url = ApiUrl(branchName);
        _userOrganizationServiceMock
            .Setup(s => s.UserIsMemberOfOrganization(Org))
            .ReturnsAsync(false);
        // Act
        HttpResponseMessage response = await HttpClient.GetAsync(url);
        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        _userOrganizationServiceMock.VerifyAll();
    }

    [Fact]
    public async Task GetLatestCommitOnBranch_BranchNotSupplied_UsesDefaultBranch()
    {
        // Arrange
        string expectedBranchName = General.DefaultBranch;

        string url = $"/designer/api/{Org}/shared-resources/latest-commit";

        _orgLibraryServiceMock
            .Setup(s => s.GetLatestCommitOnBranch(Org, expectedBranchName, It.IsAny<CancellationToken>()))
            // Capture the branch name to verify default is used
            .Callback<string, string, CancellationToken>((_, branchName, _) =>
            {
                Assert.Equal(expectedBranchName, branchName);
            })
            .ReturnsAsync("irrelevant");

        _userOrganizationServiceMock
            .Setup(s => s.UserIsMemberOfOrganization(Org))
            .ReturnsAsync(true);

        // Act
        HttpResponseMessage response = await HttpClient.GetAsync(url);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        _orgLibraryServiceMock.VerifyAll();
        _userOrganizationServiceMock.VerifyAll();
    }
    private static string ApiUrl(string branchName) => $"/designer/api/{Org}/shared-resources/latest-commit?branchName={branchName}";
}
