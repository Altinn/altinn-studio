using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Clients.Interfaces;
using Altinn.Studio.Designer.Repository;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.RepositoryClient.Model;
using Altinn.Studio.Designer.ViewModels.Request;
using Designer.Tests.Controllers.ApiTests;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.Admin.ApplicationsController;

public class GetDeploymentsTests
    : DesignerEndpointsTestsBase<GetDeploymentsTests>,
        IClassFixture<WebApplicationFactory<Program>>
{
    private const string Org = "ttd";
    private const string Env = "tt02";
    private const string App = "test-app";

    private readonly Mock<IDeploymentRepository> _deploymentRepositoryMock = new();
    private readonly Mock<IGiteaClient> _giteaClientMock = new();

    public GetDeploymentsTests(WebApplicationFactory<Program> factory)
        : base(factory) { }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        _giteaClientMock
            .Setup(c => c.GetTeams())
            .ReturnsAsync([
                new Team
                {
                    Name = $"Admin-{Env}",
                    Organization = new Organization { Username = Org },
                },
            ]);
        services.AddSingleton(_deploymentRepositoryMock.Object);
        services.AddSingleton(_giteaClientMock.Object);
    }

    [Fact]
    public async Task GetDeployments_ReturnsFinishedDeploymentsSinceTheTimestampOldestFirst()
    {
        _deploymentRepositoryMock
            .Setup(r => r.GetSucceeded(Org, App, Env, It.IsAny<DocumentQueryModel>()))
            .ReturnsAsync([
                Deployment("v14.2.0", new DateTime(2026, 11, 10, 13, 10, 0, DateTimeKind.Utc)),
                Deployment("v14.1.0", new DateTime(2026, 11, 10, 8, 35, 0, DateTimeKind.Utc)),
                Deployment("v13.0.0", new DateTime(2026, 11, 1, 8, 0, 0, DateTimeKind.Utc)),
                Deployment(
                    "v14.0.0",
                    new DateTime(2026, 11, 9, 12, 0, 0, DateTimeKind.Utc),
                    DeploymentType.Decommission
                ),
            ]);

        using var response = await HttpClient.GetAsync(
            $"/designer/api/v1/admin/applications/{Org}/{Env}/{App}/deployments?since=2026-11-09T00:00:00Z"
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var events = await response.Content.ReadFromJsonAsync<JsonElement>();
        Assert.Equal(
            ["v14.0.0", "v14.1.0", "v14.2.0"],
            events.EnumerateArray().Select(e => e.GetProperty("tagName").GetString())
        );
        var undeploy = events[0];
        Assert.Equal("decommission", undeploy.GetProperty("deploymentType").GetString());
        Assert.Equal(
            new DateTimeOffset(2026, 11, 9, 12, 0, 0, TimeSpan.Zero),
            undeploy.GetProperty("finishedAt").GetDateTimeOffset()
        );
        Assert.Equal("kari", undeploy.GetProperty("createdBy").GetString());
    }

    [Fact]
    public async Task GetDeployments_WhenUserIsNotAdmin_ReturnsForbidden()
    {
        _ = HttpClient;
        _giteaClientMock.Setup(c => c.GetTeams()).ReturnsAsync([]);

        using var response = await HttpClient.GetAsync(
            $"/designer/api/v1/admin/applications/{Org}/{Env}/{App}/deployments?since=2026-11-09T00:00:00Z"
        );

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        _deploymentRepositoryMock.VerifyNoOtherCalls();
    }

    private static DeploymentEntity Deployment(
        string tagName,
        DateTime finished,
        DeploymentType deploymentType = DeploymentType.Deploy
    )
    {
        return new DeploymentEntity
        {
            Org = Org,
            App = App,
            EnvName = Env,
            TagName = tagName,
            DeploymentType = deploymentType,
            Created = finished.AddMinutes(-5),
            CreatedBy = "kari",
            Build = new BuildEntity { Id = tagName, Finished = finished },
        };
    }
}
