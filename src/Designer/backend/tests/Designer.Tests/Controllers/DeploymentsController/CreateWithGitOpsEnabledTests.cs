using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces;
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Altinn.Studio.Designer.ViewModels.Request;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Controllers.DeploymentsController.Utils;
using Designer.Tests.DbIntegrationTests;
using Designer.Tests.Fixtures;
using Designer.Tests.Mocks;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace Designer.Tests.Controllers.DeploymentsController;

public class CreateWithGitOpsEnabledTests : DbDesignerEndpointsTestsBase<CreateWithGitOpsEnabledTests>,
    IClassFixture<WebApplicationFactory<Program>>,
    IClassFixture<DesignerDbFixture>,
    IClassFixture<MockServerFixture>
{
    private readonly MockServerFixture _mockServerFixture;

    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/deployments";

    public CreateWithGitOpsEnabledTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture, MockServerFixture mockServerFixture) : base(factory, designerDbFixture)
    {
        _mockServerFixture = mockServerFixture;

        // Configure settings to point to mock server with GitOpsDeploy enabled
        JsonConfigOverrides.Add(
            $$"""
                    {
                      "FeatureManagement": {
                          "{{StudioFeatureFlags.GitOpsDeploy}}": true
                      },
                      "GeneralSettings": {
                            "EnvironmentsUrl": "{{mockServerFixture.MockApi.Url}}/cdn-mock/environments.json",
                            "HostName": "{{mockServerFixture.MockApi.Url}}"
                        },
                      "Integrations": {
                        "AzureDevOpsSettings": {
                            "BaseUri": "{{mockServerFixture.MockApi.Url}}/",
                            "BuildDefinitionId": 1,
                            "DeployDefinitionId": 2,
                            "DecommissionDefinitionId": 3
                        }
                      },
                      "PlatformSettings": {
                            "ApiStorageApplicationUri": "storage/api/v1/applications/",
                            "ApiAuthorizationPolicyUri": "authorization/api/v1/policy",
                            "ResourceRegistryUrl": "resourceregistry/api/v1/resource"
                        }
                    }
                """
        );
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.AddTransient<ISourceControl, ISourceControlMock>();
    }

    [Theory]
    [InlineData("ttd", "deploy-gitops-test", "at22", "1.0.0", "80001")]
    public async Task Create_WhenGitOpsFeatureFlagEnabled_ShouldCreateDeployEvent(string org, string app, string envName, string tagName, string buildId)
    {
        // Arrange
        await PrepareReleaseInDb(org, app, tagName);
        _mockServerFixture.PrepareDeploymentMockResponses(org, app, buildId);

        var createDeployment = new CreateDeploymentRequestViewModel
        {
            EnvName = envName,
            TagName = tagName
        };

        string uri = VersionPrefix(org, app);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, uri)
        {
            Content = JsonContent.Create(createDeployment)
        };

        // Act
        using var response = await HttpClient.SendAsync(httpRequestMessage);
        string responseBody = await response.Content.ReadAsStringAsync();
        var deploymentEntity = JsonSerializer.Deserialize<DeploymentEntity>(responseBody, JsonSerializerOptions);

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        Assert.NotNull(deploymentEntity);

        // Verify event was created in the database
        var events = await DesignerDbFixture.DbContext.DeployEvents
            .AsNoTracking()
            .Where(e => e.Deployment.Org == org && e.Deployment.Buildid == buildId)
            .ToListAsync();

        Assert.Single(events);
        Assert.Equal(DeployEventType.PipelineScheduled.ToString(), events[0].EventType);
    }

    private async Task PrepareReleaseInDb(string org, string app, string tagName)
    {
        var releaseEntity = new ReleaseEntity
        {
            Org = org,
            App = app,
            TagName = tagName,
            TargetCommitish = "abc123def456",
            Build = new BuildEntity
            {
                Id = "81111",
                Status = BuildStatus.Completed,
                Result = BuildResult.Succeeded,
                Started = DateTime.UtcNow.AddMinutes(-10),
                Finished = DateTime.UtcNow.AddMinutes(-5)
            },
            Created = DateTime.UtcNow.AddHours(-1),
            CreatedBy = "testUser"
        };

        await DesignerDbFixture.PrepareEntitiesInDatabase(new List<ReleaseEntity> { releaseEntity });
    }
}
