using System.Net;
using System.Net.Http.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Controllers;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.Scheduling;
using Altinn.Studio.Designer.Services.Interfaces;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.InternalsController;

public class InactivityUndeployRunTests
    : DesignerEndpointsTestsBase<InactivityUndeployRunTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private readonly Mock<IAppInactivityUndeployJobQueue> _jobQueueMock = new();
    private readonly Mock<IDeploymentService> _deploymentServiceMock = new();
    private readonly Mock<IGiteaClient> _giteaClientMock = new();

    public InactivityUndeployRunTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.RemoveAll<IAppInactivityUndeployJobQueue>();
        services.RemoveAll<IDeploymentService>();
        services.RemoveAll<IGiteaClient>();
        services.AddSingleton(_jobQueueMock.Object);
        services.AddSingleton(_deploymentServiceMock.Object);
        _giteaClientMock
            .Setup(c => c.GetTeams())
            .ReturnsAsync([
                new Team
                {
                    Name = "Deploy-at22",
                    Organization = new Organization { Username = "ttd" },
                },
                new Team
                {
                    Name = "Deploy-at21",
                    Organization = new Organization { Username = "ttd" },
                },
            ]);
        _giteaClientMock.Setup(c => c.GetUserOrganizations()).ReturnsAsync([new Organization { Username = "ttd" }]);
        services.AddSingleton(_giteaClientMock.Object);
    }

    [Fact]
    public async Task Run_WithValidInput_ShouldReturnAcceptedAndQueueJob()
    {
        // Arrange
        const string Org = "ttd";
        const string Environment = "at22";
        _jobQueueMock
            .Setup(q => q.QueuePerOrgEvaluationJobAsync(Org, Environment, It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        // Act
        using var response = await HttpClient.GetAsync(
            $"/designer/api/v1/{Org}/internals/inactivity-undeploy/{Environment}/run"
        );

        // Assert
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        var result = await response.Content.ReadFromJsonAsync<InactivityUndeployRunQueuedResponse>(
            JsonSerializerOptions
        );
        Assert.NotNull(result);
        Assert.True(result.Queued);
        Assert.Equal(Org, result.Org);
        Assert.Equal(Environment, result.Environment);

        _jobQueueMock.Verify(
            q => q.QueuePerOrgEvaluationJobAsync(Org, Environment, It.IsAny<CancellationToken>()),
            Times.Once
        );
    }

    [Fact]
    public async Task Run_WithUnsupportedEnvironment_ShouldReturnBadRequest()
    {
        // Act
        using var response = await HttpClient.GetAsync("/designer/api/v1/ttd/internals/inactivity-undeploy/at21/run");

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        _jobQueueMock.Verify(
            q => q.QueuePerOrgEvaluationJobAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }

    [Fact]
    public async Task RunUndeploy_WhenUserHasNoTtdAccess_ShouldReturnForbidden()
    {
        _ = HttpClient;
        _giteaClientMock
            .Setup(c => c.GetUserOrganizations())
            .ReturnsAsync([new Organization { Username = "other-org" }]);

        using var response = await HttpClient.GetAsync("/designer/api/v1/ttd/internals/inactivity-undeploy/at22/run");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        _jobQueueMock.Verify(
            q => q.QueuePerOrgEvaluationJobAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never
        );
    }
}
