using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces.GitOps;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.DbIntegrationTests;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Moq;
using Xunit;

namespace Designer.Tests.Controllers.DeploymentsController;

public class UndeployWithGitOpsEnabledTests : DbDesignerEndpointsTestsBase<UndeployWithGitOpsEnabledTests>,
    IClassFixture<WebApplicationFactory<Program>>,
    IClassFixture<DesignerDbFixture>,
    IClassFixture<MockServerFixture>
{
    private readonly MockServerFixture _mockServerFixture;
    private readonly Mock<IGitOpsConfigurationManager> _gitOpsConfigurationManagerMock;
    private const int DecommissionDefinitionId = 297;
    private const int GitOpsDecommissionDefinitionId = 298;
    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/deployments";

    public UndeployWithGitOpsEnabledTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture, MockServerFixture mockServerFixture) : base(factory, designerDbFixture)
    {
        _mockServerFixture = mockServerFixture;
        _gitOpsConfigurationManagerMock = new Mock<IGitOpsConfigurationManager>();

        JsonConfigOverrides.Add(
            $$"""
              {
                 "FeatureManagement": {
                      "{{StudioFeatureFlags.GitOpsDeploy}}": true
                 },
                 "Integrations": {
                      "AzureDevOpsSettings": {
                          "BaseUri": "{{mockServerFixture.MockApi.Url}}/",
                          "DecommissionDefinitionId": {{DecommissionDefinitionId}},
                          "GitOpsDecommissionDefinitionId": {{GitOpsDecommissionDefinitionId}}
                      }
                 }
              }
              """);
    }

    protected override void ConfigureTestServices(IServiceCollection services)
    {
        base.ConfigureTestServices(services);
        services.RemoveAll<IGitOpsConfigurationManager>();
        services.AddSingleton(_gitOpsConfigurationManagerMock.Object);
    }

    [Theory]
    [MemberData(nameof(TestDataAppExistsInGitOps))]
    public async Task Undeploy_WhenAppExistsInGitOps_ShouldRemoveAppAndUseGitOpsDecommissionDefinitionId(string org, string app, string environment, string azureDevopsMockQueueBuildResponse)
    {
        // Arrange
        _gitOpsConfigurationManagerMock.Setup(m => m.AppExistsInGitOpsConfigurationAsync(
            It.IsAny<AltinnOrgEditingContext>(),
            It.Is<AltinnRepoName>(r => r.Name == app),
            It.Is<AltinnEnvironment>(e => e.Name == environment)
        )).ReturnsAsync(true);

        _gitOpsConfigurationManagerMock.Setup(m => m.RemoveAppFromGitOpsEnvironmentConfigurationAsync(
            It.IsAny<AltinnRepoEditingContext>(),
            It.IsAny<AltinnEnvironment>()
        )).Returns(Task.CompletedTask);

        _gitOpsConfigurationManagerMock.Setup(m => m.PersistGitOpsConfigurationAsync(
            It.IsAny<AltinnOrgEditingContext>(),
            It.IsAny<AltinnEnvironment>()
        )).Returns(Task.CompletedTask);

        _mockServerFixture.PrepareQueueBuildResponse(GitOpsDecommissionDefinitionId, azureDevopsMockQueueBuildResponse);

        var entity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(org, app, envName: environment);
        await DesignerDbFixture.PrepareEntityInDatabase(entity);

        string uri = $"{VersionPrefix(org, app)}/undeploy";
        var request = new UndeployRequest { Environment = environment };
        using var content = new StringContent(JsonSerializer.Serialize(request, JsonSerializerOptions), Encoding.UTF8, MediaTypeNames.Application.Json);

        // Act
        using var response = await HttpClient.PostAsync(uri, content);

        // Assert
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        _gitOpsConfigurationManagerMock.Verify(m => m.AppExistsInGitOpsConfigurationAsync(
            It.IsAny<AltinnOrgEditingContext>(),
            It.Is<AltinnRepoName>(r => r.Name == app),
            It.Is<AltinnEnvironment>(e => e.Name == environment)
        ), Times.Once);

        _gitOpsConfigurationManagerMock.Verify(m => m.RemoveAppFromGitOpsEnvironmentConfigurationAsync(
            It.IsAny<AltinnRepoEditingContext>(),
            It.Is<AltinnEnvironment>(e => e.Name == environment)
        ), Times.Once);

        _gitOpsConfigurationManagerMock.Verify(m => m.PersistGitOpsConfigurationAsync(
            It.IsAny<AltinnOrgEditingContext>(),
            It.Is<AltinnEnvironment>(e => e.Name == environment)
        ), Times.Once);
    }

    [Theory]
    [MemberData(nameof(TestDataAppNotInGitOps))]
    public async Task Undeploy_WhenAppDoesNotExistInGitOps_ShouldFallbackToDecommissionDefinitionId(string org, string app, string environment, string azureDevopsMockQueueBuildResponse)
    {
        // Arrange
        _gitOpsConfigurationManagerMock.Setup(m => m.AppExistsInGitOpsConfigurationAsync(
            It.IsAny<AltinnOrgEditingContext>(),
            It.Is<AltinnRepoName>(r => r.Name == app),
            It.Is<AltinnEnvironment>(e => e.Name == environment)
        )).ReturnsAsync(false);

        _mockServerFixture.PrepareQueueBuildResponse(DecommissionDefinitionId, azureDevopsMockQueueBuildResponse);

        var entity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(org, app, envName: environment);
        await DesignerDbFixture.PrepareEntityInDatabase(entity);

        string uri = $"{VersionPrefix(org, app)}/undeploy";
        var request = new UndeployRequest { Environment = environment };
        using var content = new StringContent(JsonSerializer.Serialize(request, JsonSerializerOptions), Encoding.UTF8, MediaTypeNames.Application.Json);

        // Act
        using var response = await HttpClient.PostAsync(uri, content);

        // Assert
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        _gitOpsConfigurationManagerMock.Verify(m => m.AppExistsInGitOpsConfigurationAsync(
            It.IsAny<AltinnOrgEditingContext>(),
            It.Is<AltinnRepoName>(r => r.Name == app),
            It.Is<AltinnEnvironment>(e => e.Name == environment)
        ), Times.Once);

        _gitOpsConfigurationManagerMock.Verify(m => m.RemoveAppFromGitOpsEnvironmentConfigurationAsync(
            It.IsAny<AltinnRepoEditingContext>(),
            It.IsAny<AltinnEnvironment>()
        ), Times.Never);

        _gitOpsConfigurationManagerMock.Verify(m => m.PersistGitOpsConfigurationAsync(
            It.IsAny<AltinnOrgEditingContext>(),
            It.IsAny<AltinnEnvironment>()
        ), Times.Never);
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
            """
        ];
    }

    public static IEnumerable<object[]> TestDataAppNotInGitOps()
    {
        yield return
        [
            "ttd",
            "non-gitops-app",
            "TestEnv",
            """
            {
              "id" : 90002,
              "startTime" : "2025-01-24T09:46:54.201826+01:00",
              "status" : "InProgress",
              "result" : "None"
            }
            """
        ];
    }
}
