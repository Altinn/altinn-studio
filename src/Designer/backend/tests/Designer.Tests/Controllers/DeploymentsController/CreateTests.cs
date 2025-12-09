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
using Altinn.Studio.Designer.TypedHttpClients.AzureDevOps.Enums;
using Altinn.Studio.Designer.ViewModels.Request;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Controllers.DeploymentsController.Utils;
using Designer.Tests.DbIntegrationTests;
using Designer.Tests.Fixtures;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Xunit;

namespace Designer.Tests.Controllers.DeploymentsController;

public class CreateTests : DbDesignerEndpointsTestsBase<CreateTests>, IClassFixture<WebApplicationFactory<Program>>, IClassFixture<MockServerFixture>
{
    private readonly MockServerFixture _mockServerFixture;

    private static string VersionPrefix(string org, string repository) => $"/designer/api/{org}/{repository}/deployments";

    public CreateTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture, MockServerFixture mockServerFixture) : base(factory, designerDbFixture)
    {
        _mockServerFixture = mockServerFixture;

        // Configure settings to point to mock server
        JsonConfigOverrides.Add(
            $$"""
                    {
                       "FeatureManagement": {
                           "{{StudioFeatureFlags.GitOpsDeploy}}": false
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

    [Theory]
    [InlineData("ttd", "deploy-test-at22", "at22", "1.0.0", "10001")]
    [InlineData("ttd", "deploy-test-tt02", "tt02", "2.1.5", "10002")]
    public async Task Create_Returns_201Created_With_Valid_Deployment(string org, string app, string envName, string tagName, string buildId)
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
        Assert.Equal(org, deploymentEntity.Org);
        Assert.Equal(app, deploymentEntity.App);
        Assert.Equal(envName, deploymentEntity.EnvName);
        Assert.Equal(tagName, deploymentEntity.TagName);
        Assert.NotNull(deploymentEntity.Build);
        Assert.Equal(buildId, deploymentEntity.Build.Id);
        Assert.Equal(BuildStatus.NotStarted, deploymentEntity.Build.Status);
    }

    [Theory]
    [InlineData("ttd", "test-validation", "at22", null)]
    [InlineData("ttd", "test-validation", "at22", "")]
    public async Task Create_Returns_400BadRequest_When_Required_Fields_Missing(string org, string app, string envName, string tagName)
    {
        // Arrange
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

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Theory]
    [InlineData("ttd", "test-dotdash1", "at22", ".invalidtag")]
    [InlineData("ttd", "test-dotdash2", "at22", "-invalidtag")]
    public async Task Create_Returns_400BadRequest_When_TagName_Starts_With_Dot_Or_Dash(string org, string app, string envName, string tagName)
    {
        // Arrange
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
        var responseContent = await response.Content.ReadAsStringAsync();
        var responseObject = JsonSerializer.Deserialize<JsonElement>(responseContent);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True(responseObject.TryGetProperty("errors", out JsonElement errors));
        Assert.True(errors.TryGetProperty("TagName", out JsonElement tagNameErrors));
        Assert.Contains("cannot start with '.' or '-'", tagNameErrors[0].GetString());
    }

    [Theory]
    [InlineData("ttd", "test-toolong", "at22")]
    public async Task Create_Returns_400BadRequest_When_TagName_Too_Long(string org, string app, string envName)
    {
        // Arrange
        string tagName = new string('a', 129); // 129 characters - exceeds 128 limit

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
        var responseContent = await response.Content.ReadAsStringAsync();
        var responseObject = JsonSerializer.Deserialize<JsonElement>(responseContent);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True(responseObject.TryGetProperty("errors", out JsonElement errors));
        Assert.True(errors.TryGetProperty("TagName", out JsonElement tagNameErrors));
        Assert.Contains("cannot be longer than 128 characters", tagNameErrors[0].GetString());
    }

    [Theory]
    [InlineData("ttd", "test-badchars1", "at22", "invalid@tag")]
    [InlineData("ttd", "test-badchars2", "at22", "invalid tag")]
    [InlineData("ttd", "test-badchars3", "at22", "INVALIDTAG")]
    [InlineData("ttd", "test-badchars4", "at22", "invalid_tag")]
    public async Task Create_Returns_400BadRequest_When_TagName_Has_Invalid_Characters(string org, string app, string envName, string tagName)
    {
        // Arrange
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
        var responseContent = await response.Content.ReadAsStringAsync();
        var responseObject = JsonSerializer.Deserialize<JsonElement>(responseContent);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        Assert.True(responseObject.TryGetProperty("errors", out JsonElement errors));
        Assert.True(errors.TryGetProperty("TagName", out JsonElement tagNameErrors));
        Assert.Contains("cannot have characters outside the following ranges [a-z0-9.-]", tagNameErrors[0].GetString());
    }

    [Theory]
    [InlineData("ttd", "test-validchars1", "at22", "valid-tag.1.0.0", "20001")]
    [InlineData("ttd", "test-validchars2", "tt02", "release-2.5.0", "20002")]
    public async Task Create_Returns_201Created_When_TagName_Has_Valid_Special_Characters(string org, string app, string envName, string tagName, string buildId)
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
        Assert.Equal(tagName, deploymentEntity.TagName);
    }

    [Theory]
    [InlineData("ttd", "queue-build-test", "at22", "1.0.0", "30001")]
    public async Task Create_Calls_UpdateApplicationInformation_And_QueueBuild(string org, string app, string envName, string tagName, string buildId)
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
        Assert.Equal(buildId, deploymentEntity.Build.Id);

        // Verify that the mock server received the expected calls
        var logEntries = _mockServerFixture.MockApi.LogEntries;

        // Assert application metadata update was called
        Assert.Contains(logEntries, entry =>
            entry.RequestMessage.Path.Contains("/storage/api/v1/applications") &&
            entry.RequestMessage.Method == "POST" &&
            entry.RequestMessage.RawQuery.Contains($"appId={org}/{app}"));

        // Assert text resources update was called
        Assert.Contains(logEntries, entry =>
            entry.RequestMessage.Path.EndsWith($"/{org}/{app}/texts") &&
            entry.RequestMessage.Method == "POST");

        // Assert policy update was called
        Assert.Contains(logEntries, entry =>
            entry.RequestMessage.Path.Contains("/authorization/api/v1/policy") &&
            entry.RequestMessage.Method == "POST" &&
            entry.RequestMessage.RawQuery.Contains($"org={org}") &&
            entry.RequestMessage.RawQuery.Contains($"app={app}"));

        // Assert build was queued
        Assert.Contains(logEntries, entry =>
            entry.RequestMessage.Path.Contains("/build/builds") &&
            entry.RequestMessage.Method == "POST");
    }

    [Theory]
    [InlineData("ttd", "deploy-test-at22", "at22", "3.0.0", "40001")]
    public async Task Create_WhenGitOpsFeatureFlagDisabled_ShouldNotCreateDeployEvent(string org, string app, string envName, string tagName, string buildId)
    {
        // Arrange - feature flag is disabled by default (not set in JsonConfigOverrides)
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

        // Assert
        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        // Verify no events were created in the database
        var events = await DesignerDbFixture.DbContext.DeployEvents
            .AsNoTracking()
            .Where(e => e.Deployment.Org == org && e.Deployment.Buildid == buildId)
            .ToListAsync();

        Assert.Empty(events);
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
                Id = "11111",
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
