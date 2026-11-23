using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.ViewModels.Request;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.ReleasesController;

public class CreateTests
    : DbDesignerEndpointsTestsBase<CreateTests>,
        IClassFixture<WebApplicationFactory<Program>>,
        IClassFixture<DesignerDbFixture>
{
    private readonly Mock<IReleaseService> _releaseServiceMock;
    private readonly Mock<IUserOrganizationService> _userOrganizationServiceMock = new();
    private readonly Mock<IGiteaClient> _giteaClientMock = new();
    private readonly string _org = "ttd";
    private readonly string _app = "test-app";

    public CreateTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture)
        : base(factory, designerDbFixture)
    {
        _releaseServiceMock = new Mock<IReleaseService>();
        _releaseServiceMock
            .Setup(rs => rs.CreateAsync(It.IsAny<ReleaseEntity>()))
            .ReturnsAsync((ReleaseEntity release) => release);
        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfOrganization(_org)).ReturnsAsync(true);
        _giteaClientMock.Setup(g => g.GetTeams()).ReturnsAsync([CreateTeam("Deploy-tt02", _org)]);
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_giteaClientMock.Object);
        services.AddSingleton(_releaseServiceMock.Object);
        services.AddSingleton(_userOrganizationServiceMock.Object);
    }

    [Theory]
    [InlineData("feature/new-layout")]
    [InlineData(null)]
    public async Task Create_PassesBranchToReleaseService(string branch)
    {
        CreateReleaseRequestViewModel createRelease = CreateValidRequest(branch);

        using HttpResponseMessage response = await PostRelease(createRelease);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        _releaseServiceMock.Verify(
            rs =>
                rs.CreateAsync(
                    It.Is<ReleaseEntity>(r => r.Branch == branch && r.TargetCommitish == createRelease.TargetCommitish)
                ),
            Times.Once
        );
    }

    [Fact]
    public async Task Create_WithInvalidBranchName_ReturnsBadRequest()
    {
        CreateReleaseRequestViewModel createRelease = CreateValidRequest("-invalid branch");

        using HttpResponseMessage response = await PostRelease(createRelease);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        _releaseServiceMock.Verify(rs => rs.CreateAsync(It.IsAny<ReleaseEntity>()), Times.Never);
    }

    [Fact]
    public async Task Create_UserNotMemberOfOrg_ReturnsForbidden()
    {
        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfAnyOrganization()).ReturnsAsync(true);
        _userOrganizationServiceMock.Setup(s => s.UserIsMemberOfOrganization(_org)).ReturnsAsync(false);

        using HttpResponseMessage response = await PostRelease(CreateValidRequest(null));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        _releaseServiceMock.Verify(rs => rs.CreateAsync(It.IsAny<ReleaseEntity>()), Times.Never);
    }

    [Fact]
    public async Task Create_UserInOwnersTeam_ReturnsCreated()
    {
        _giteaClientMock.Setup(g => g.GetTeams()).ReturnsAsync([CreateTeam("Owners", _org)]);

        using HttpResponseMessage response = await PostRelease(CreateValidRequest(null));

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
    }

    [Fact]
    public async Task Create_UserWithoutDeployOrOwnersTeamInOrg_ReturnsForbidden()
    {
        _giteaClientMock
            .Setup(g => g.GetTeams())
            .ReturnsAsync([CreateTeam("Devs", _org), CreateTeam("Deploy-tt02", "skd")]);

        using HttpResponseMessage response = await PostRelease(CreateValidRequest(null));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        _releaseServiceMock.Verify(rs => rs.CreateAsync(It.IsAny<ReleaseEntity>()), Times.Never);
    }

    private async Task<HttpResponseMessage> PostRelease(CreateReleaseRequestViewModel createRelease)
    {
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, $"/designer/api/{_org}/{_app}/releases")
        {
            Content = JsonContent.Create(createRelease),
        };
        return await HttpClient.SendAsync(httpRequestMessage);
    }

    private static CreateReleaseRequestViewModel CreateValidRequest(string branch) =>
        new()
        {
            TagName = "1.0.0",
            Name = "1.0.0",
            Body = "Release from branch",
            TargetCommitish = "0123456789abcdef0123456789abcdef01234567",
            Branch = branch,
        };

    private static Team CreateTeam(string name, string org) =>
        new()
        {
            Name = name,
            Organization = new Organization { Username = org },
        };
}
