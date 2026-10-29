using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models;
using Altinn.Studio.Designer.Services.Interfaces.GitOps;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.DbIntegrationTests;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.DeploymentsController;

public class UndeployGitOpsTests
    : DbDesignerEndpointsTestsBase<UndeployGitOpsTests>,
        IClassFixture<WebApplicationFactory<Program>>,
        IClassFixture<DesignerDbFixture>,
        IClassFixture<MockServerFixture>
{
    private readonly MockServerFixture _mockServerFixture;
    private readonly Mock<IGitOpsConfigurationManager> _gitOpsConfigurationManagerMock;
    private readonly Mock<IRuntimeGatewayClient> _runtimeGatewayClientMock;
    private const int GitOpsManagerDefinitionId = 298;

    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/deployments";

    public UndeployGitOpsTests(
        WebApplicationFactory<Program> factory,
        DesignerDbFixture designerDbFixture,
        MockServerFixture mockServerFixture
    )
        : base(factory, designerDbFixture)
    {
        _mockServerFixture = mockServerFixture;
        _gitOpsConfigurationManagerMock = new Mock<IGitOpsConfigurationManager>();
        _runtimeGatewayClientMock = new Mock<IRuntimeGatewayClient>(MockBehavior.Strict);

        JsonConfigOverrides.Add(
            $$"""
            {
               "Integrations": {
                    "AzureDevOpsSettings": {
                        "BaseUri": "{{mockServerFixture.MockApi.Url}}/",
                        "GitOpsManagerDefinitionId": {{GitOpsManagerDefinitionId}}
                    }
               }
            }
            """
        );
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.RemoveAll<IGitOpsConfigurationManager>();
        services.AddSingleton(_gitOpsConfigurationManagerMock.Object);
        services.RemoveAll<IRuntimeGatewayClient>();
        services.AddSingleton(_runtimeGatewayClientMock.Object);
    }

    [Theory]
    [MemberData(nameof(TestDataAppExistsInGitOps))]
    public async Task Undeploy_WhenAppExistsInGitOps_ShouldRemoveAppAndUseGitOpsManagerDefinitionId(
        string org,
        string app,
        string environment,
        string azureDevopsMockQueueBuildResponse
    )
    {
        // Arrange
        _gitOpsConfigurationManagerMock
            .Setup(m => m.GitOpsConfigurationExistsAsync(It.IsAny<AltinnOrgEditingContext>()))
            .ReturnsAsync(true);

        _gitOpsConfigurationManagerMock
            .Setup(m =>
                m.AppExistsInGitOpsConfigurationAsync(
                    It.IsAny<AltinnOrgEditingContext>(),
                    It.Is<AltinnRepoName>(r => r.Name == app),
                    It.Is<AltinnEnvironment>(e => e.Name == environment)
                )
            )
            .ReturnsAsync(true);

        _gitOpsConfigurationManagerMock
            .Setup(m =>
                m.RemoveAppFromGitOpsEnvironmentConfigurationAsync(
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.IsAny<AltinnEnvironment>()
                )
            )
            .Returns(Task.CompletedTask);

        _gitOpsConfigurationManagerMock.Setup(m =>
            m.PersistGitOpsConfiguration(It.IsAny<AltinnOrgEditingContext>(), It.IsAny<AltinnEnvironment>())
        );

        _mockServerFixture.PrepareQueueBuildResponse(GitOpsManagerDefinitionId, azureDevopsMockQueueBuildResponse);

        var entity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(org, app, envName: environment);
        await DesignerDbFixture.PrepareEntityInDatabase(entity);

        string uri = $"{VersionPrefix(org, app)}/undeploy";
        var request = new UndeployRequest { Environment = environment };
        using var content = new StringContent(
            JsonSerializer.Serialize(request, JsonSerializerOptions),
            Encoding.UTF8,
            MediaTypeNames.Application.Json
        );

        // Act
        using var response = await HttpClient.PostAsync(uri, content);

        // Assert
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        _gitOpsConfigurationManagerMock.Verify(
            m => m.GitOpsConfigurationExistsAsync(It.IsAny<AltinnOrgEditingContext>()),
            Times.Once
        );

        _gitOpsConfigurationManagerMock.Verify(
            m =>
                m.AppExistsInGitOpsConfigurationAsync(
                    It.IsAny<AltinnOrgEditingContext>(),
                    It.Is<AltinnRepoName>(r => r.Name == app),
                    It.Is<AltinnEnvironment>(e => e.Name == environment)
                ),
            Times.Once
        );

        _gitOpsConfigurationManagerMock.Verify(
            m =>
                m.RemoveAppFromGitOpsEnvironmentConfigurationAsync(
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.Is<AltinnEnvironment>(e => e.Name == environment)
                ),
            Times.Once
        );

        _gitOpsConfigurationManagerMock.Verify(
            m =>
                m.PersistGitOpsConfiguration(
                    It.IsAny<AltinnOrgEditingContext>(),
                    It.Is<AltinnEnvironment>(e => e.Name == environment)
                ),
            Times.Once
        );
    }

    [Theory]
    [MemberData(nameof(TestDataAppNotInGitOps))]
    public async Task Undeploy_WhenAppDoesNotExistInGitOps_ShouldUseGitOpsManagerDefinitionId(
        string org,
        string app,
        string environment,
        string azureDevopsMockQueueBuildResponse
    )
    {
        // Arrange
        _gitOpsConfigurationManagerMock
            .Setup(m => m.GitOpsConfigurationExistsAsync(It.IsAny<AltinnOrgEditingContext>()))
            .ReturnsAsync(true);

        _gitOpsConfigurationManagerMock
            .Setup(m =>
                m.AppExistsInGitOpsConfigurationAsync(
                    It.IsAny<AltinnOrgEditingContext>(),
                    It.Is<AltinnRepoName>(r => r.Name == app),
                    It.Is<AltinnEnvironment>(e => e.Name == environment)
                )
            )
            .ReturnsAsync(false);

        _mockServerFixture.PrepareQueueBuildResponse(GitOpsManagerDefinitionId, azureDevopsMockQueueBuildResponse);

        var entity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(org, app, envName: environment);
        await DesignerDbFixture.PrepareEntityInDatabase(entity);

        string uri = $"{VersionPrefix(org, app)}/undeploy";
        var request = new UndeployRequest { Environment = environment };
        using var content = new StringContent(
            JsonSerializer.Serialize(request, JsonSerializerOptions),
            Encoding.UTF8,
            MediaTypeNames.Application.Json
        );

        // Act
        using var response = await HttpClient.PostAsync(uri, content);

        // Assert
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        _gitOpsConfigurationManagerMock.Verify(
            m => m.GitOpsConfigurationExistsAsync(It.IsAny<AltinnOrgEditingContext>()),
            Times.Once
        );

        _gitOpsConfigurationManagerMock.Verify(
            m =>
                m.AppExistsInGitOpsConfigurationAsync(
                    It.IsAny<AltinnOrgEditingContext>(),
                    It.Is<AltinnRepoName>(r => r.Name == app),
                    It.Is<AltinnEnvironment>(e => e.Name == environment)
                ),
            Times.Once
        );

        _gitOpsConfigurationManagerMock.Verify(
            m =>
                m.RemoveAppFromGitOpsEnvironmentConfigurationAsync(
                    It.IsAny<AltinnRepoEditingContext>(),
                    It.IsAny<AltinnEnvironment>()
                ),
            Times.Never
        );

        _gitOpsConfigurationManagerMock.Verify(
            m => m.PersistGitOpsConfiguration(It.IsAny<AltinnOrgEditingContext>(), It.IsAny<AltinnEnvironment>()),
            Times.Never
        );
    }

    [Theory]
    [MemberData(nameof(TestDataPipelineScheduledEvent))]
    public async Task Undeploy_WhenAppDoesNotExistInGitOps_ShouldCreatePipelineScheduledEvent(
        string org,
        string app,
        string environment,
        string buildId,
        string azureDevopsMockQueueBuildResponse
    )
    {
        // Arrange
        _gitOpsConfigurationManagerMock
            .Setup(m => m.GitOpsConfigurationExistsAsync(It.IsAny<AltinnOrgEditingContext>()))
            .ReturnsAsync(true);

        _gitOpsConfigurationManagerMock
            .Setup(m =>
                m.AppExistsInGitOpsConfigurationAsync(
                    It.IsAny<AltinnOrgEditingContext>(),
                    It.Is<AltinnRepoName>(r => r.Name == app),
                    It.Is<AltinnEnvironment>(e => e.Name == environment)
                )
            )
            .ReturnsAsync(false);

        _mockServerFixture.PrepareQueueBuildResponse(GitOpsManagerDefinitionId, azureDevopsMockQueueBuildResponse);

        var entity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(org, app, envName: environment);
        await DesignerDbFixture.PrepareEntityInDatabase(entity);

        string uri = $"{VersionPrefix(org, app)}/undeploy";
        var request = new UndeployRequest { Environment = environment };
        using var content = new StringContent(
            JsonSerializer.Serialize(request, JsonSerializerOptions),
            Encoding.UTF8,
            MediaTypeNames.Application.Json
        );

        // Act
        using var response = await HttpClient.PostAsync(uri, content);

        // Assert
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        // Verify PipelineScheduled event was created in the database
        var events = await DesignerDbFixture
            .DbContext.DeployEvents.AsNoTracking()
            .Where(e => e.Deployment.Org == org && e.Deployment.Buildid == buildId)
            .ToListAsync();

        Assert.Single(events);
        Assert.Equal(DeployEventType.PipelineScheduled.ToString(), events[0].EventType);
    }

    public static IEnumerable<object[]> TestDataAppExistsInGitOps()
    {
        yield return
        [
            "ttd",
            "gitops-app",
            "TestEnv",
            """
                {
                  "id" : 90001,
                  "startTime" : "2025-01-24T09:46:54.201826+01:00",
                  "status" : "InProgress",
                  "result" : "None"
                }
                """,
        ];
    }

    public static IEnumerable<object[]> TestDataAppNotInGitOps()
    {
        yield return
        [
            "ttd",
            "removed-gitops-app",
            "TestEnv",
            """
                {
                  "id" : 90002,
                  "startTime" : "2025-01-24T09:46:54.201826+01:00",
                  "status" : "InProgress",
                  "result" : "None"
                }
                """,
        ];
    }

    public static IEnumerable<object[]> TestDataPipelineScheduledEvent()
    {
        yield return
        [
            "ttd",
            "removed-gitops-event-app",
            "TestEnv",
            "90003",
            """
                {
                  "id" : 90003,
                  "startTime" : "2025-01-24T09:46:54.201826+01:00",
                  "status" : "InProgress",
                  "result" : "None"
                }
                """,
        ];
    }
}
