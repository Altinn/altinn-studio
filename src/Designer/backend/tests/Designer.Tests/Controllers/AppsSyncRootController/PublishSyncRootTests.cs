using System.Collections.Generic;
using System.Net;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Mvc.Testing;
using Xunit;

namespace Designer.Tests.Controllers.AppsSyncRootController;

public class PublishSyncRootTests : DbDesignerEndpointsTestsBase<PublishSyncRootTests>,
    IClassFixture<WebApplicationFactory<Program>>,
    IClassFixture<DesignerDbFixture>,
    IClassFixture<MockServerFixture>
{
    private readonly MockServerFixture _mockServerFixture;
    private const int DeployDefinitionId = 299;
    private static string VersionPrefix(string org, string environment) => $"/designer/api/v1/{org}/sync-gitops/{environment}/push";

    public PublishSyncRootTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture, MockServerFixture mockServerFixture) : base(factory, designerDbFixture)
    {
        _mockServerFixture = mockServerFixture;

        JsonConfigOverrides.Add(
            $$"""
              {
                 "FeatureManagement": {
                      "{{StudioFeatureFlags.GitOpsDeploy}}": true
                 },
                 "Integrations": {
                      "AzureDevOpsSettings": {
                          "BaseUri": "{{mockServerFixture.MockApi.Url}}/",
                          "DeployDefinitionId": {{DeployDefinitionId}}
                      }
                 }
              }
              """);
    }

    [Theory]
    [MemberData(nameof(TestData))]
    public async Task PublishSyncRoot_ShouldQueueBuildAndReturnAccepted(string org, string environment, string azureDevopsMockQueueBuildResponse)
    {
        // Arrange
        _mockServerFixture.PrepareQueueBuildResponse(DeployDefinitionId, azureDevopsMockQueueBuildResponse);

        string uri = VersionPrefix(org, environment);

        // Act
        using var response = await HttpClient.GetAsync(uri);

        // Assert
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
    }

    [Theory]
    [MemberData(nameof(TestDataInvalidEnvironment))]
    public async Task PublishSyncRoot_WithInvalidEnvironment_ShouldReturnBadRequest(string org, string environment)
    {
        // Arrange
        string uri = VersionPrefix(org, environment);

        // Act
        using var response = await HttpClient.GetAsync(uri);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    public static IEnumerable<object[]> TestData()
    {
        yield return
        [
            "ttd",
            "at22",
            """
            {
              "id" : 90003,
              "startTime" : "2025-01-24T09:46:54.201826+01:00",
              "status" : "InProgress",
              "result" : "None"
            }
            """
        ];
    }

    public static IEnumerable<object[]> TestDataInvalidEnvironment()
    {
        yield return ["ttd", "invalid-env"];
        yield return ["ttd", "../../etc/passwd"];
    }
}