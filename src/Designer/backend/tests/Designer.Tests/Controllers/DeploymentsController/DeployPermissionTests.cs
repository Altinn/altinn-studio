using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.DeploymentsController;

public class DeployPermissionTests
    : DesignerEndpointsTestsBase<DeployPermissionTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string UndeployUri = $"/designer/api/{Org}/some-app/deployments/undeploy";

    private readonly Mock<IGiteaClient> _giteaClientMock = new();
    private readonly Mock<IDeploymentService> _deploymentServiceMock = new();

    public DeployPermissionTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddSingleton(_giteaClientMock.Object);
        services.RemoveAll<IDeploymentService>();
        services.AddSingleton(_deploymentServiceMock.Object);
    }

    [Fact]
    public async Task Undeploy_WithDeployTeam_ChecksThePermissionOnce()
    {
        UserIsInTeam("Deploy-at22");

        using HttpResponseMessage response = await HttpClient.PostAsJsonAsync(
            UndeployUri,
            new UndeployRequest { Environment = "at22" }
        );

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        _giteaClientMock.Verify(client => client.GetTeams(), Times.Once);
    }

    [Fact]
    public async Task Undeploy_WithoutDeployTeam_ReturnsForbidden()
    {
        UserIsInTeam("Deploy-tt02");

        using HttpResponseMessage response = await HttpClient.PostAsJsonAsync(
            UndeployUri,
            new UndeployRequest { Environment = "at22" }
        );

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        _deploymentServiceMock.Verify(
            service =>
                service.UndeployAsync(
                    It.IsAny<AltinnAuthenticatedRepoEditingContext>(),
                    It.IsAny<string>(),
                    It.IsAny<CancellationToken>()
                ),
            Times.Never
        );
    }

    private void UserIsInTeam(string teamName) =>
        _giteaClientMock
            .Setup(client => client.GetTeams())
            .ReturnsAsync(
                new List<Team>
                {
                    new()
                    {
                        Name = teamName,
                        Organization = new Organization { Username = Org },
                    },
                }
            );
}
