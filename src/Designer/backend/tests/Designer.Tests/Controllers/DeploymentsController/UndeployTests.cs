using System;
using System.Collections.Generic;
using System.Net;
using System.Net.Http;
using System.Net.Mime;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Models;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Services.Interfaces.GitOps;
using Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;
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

public class UndeployTests
    : DbDesignerEndpointsTestsBase<UndeployTests>,
        IClassFixture<WebApplicationFactory<Program>>,
        IClassFixture<DesignerDbFixture>,
        IClassFixture<MockServerFixture>
{
    private readonly MockServerFixture _mockServerFixture;
    private readonly Mock<IGitOpsConfigurationManager> _gitOpsConfigurationManagerMock;
    private readonly Mock<IRuntimeGatewayClient> _runtimeGatewayClientMock;
    private const int DecommissionDefinitionId = 297;

    private static string VersionPrefix(string org, string repository) =>
        $"/designer/api/{org}/{repository}/deployments";

    public UndeployTests(
        WebApplicationFactory<Program> factory,
        DesignerDbFixture designerDbFixture,
        MockServerFixture mockServerFixture
    )
        : base(factory, designerDbFixture)
    {
        _mockServerFixture = mockServerFixture;
        _gitOpsConfigurationManagerMock = new Mock<IGitOpsConfigurationManager>();
        _runtimeGatewayClientMock = new Mock<IRuntimeGatewayClient>();
        _gitOpsConfigurationManagerMock
            .Setup(manager => manager.GitOpsConfigurationExistsAsync(It.IsAny<AltinnOrgEditingContext>()))
            .ReturnsAsync(false);
        _runtimeGatewayClientMock
            .Setup(client =>
                client.IsAppDeployedWithGitOpsAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<AltinnEnvironment>(),
                    It.IsAny<CancellationToken>()
                )
            )
            .ReturnsAsync(false);
        JsonConfigOverrides.Add(
            $$"""
            {
               "Integrations": {
                    "AzureDevOpsSettings": {
                        "BaseUri": "{{mockServerFixture.MockApi.Url}}/",
                        "DecommissionDefinitionId": {{DecommissionDefinitionId}}
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
    [MemberData(nameof(TestData))]
    public async Task Undeploy_WhenCalled_ShouldReturnAccepted(
        string org,
        string app,
        string environment,
        string azureDevopsMockQueueBuildResponse
    )
    {
        // Arrange
        _mockServerFixture.PrepareQueueBuildResponse(DecommissionDefinitionId, azureDevopsMockQueueBuildResponse);

        // Ensure that the deployment entity exists in the database
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
    }

    public static IEnumerable<object[]> TestData()
    {
        yield return
        [
            "ttd",
            "non-existing-app",
            "TestEnv",
            """
                {
                  "id" : 1,
                  "startTime" : "2025-01-24T09:46:54.201826+01:00",
                  "status" : "InProgress",
                  "result" : "None"
                }
                """,
        ];
    }
}
