using System;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Net.Http.Json;
using System.Threading.Tasks;
using Altinn.Studio.Designer.Constants;
using Altinn.Studio.Designer.Infrastructure.Maskinporten;
using Altinn.Studio.Designer.Models.Dto;
using Altinn.Studio.Designer.Repository.Models;
using Designer.Tests.Controllers.ApiTests;
using Designer.Tests.Controllers.ControlPlaneController.Base;
using Designer.Tests.DbIntegrationTests;
using Designer.Tests.Fixtures;
using Designer.Tests.Utils;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.Mvc.Testing.Handlers;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Xunit;

namespace Designer.Tests.Controllers.DeploymentWebhooksController;

public class ReceiveDeployEventTests : DbDesignerEndpointsTestsBase<ReceiveDeployEventTests>, IClassFixture<WebApplicationFactory<Program>>
{
    private const string MaskinportenTestScheme = "MaskinportenTest";
    private const string RequiredScope = "altinn:studio/designer";

    private static string WebhookUrl(string org, string app) => $"/designer/api/v1/{org}/{app}/deployments/webhooks/events";

    public ReceiveDeployEventTests(WebApplicationFactory<Program> factory, DesignerDbFixture designerDbFixture) : base(factory, designerDbFixture)
    {
        JsonConfigOverrides.Add(
            $$"""
            {
                "FeatureManagement": {
                    "{{StudioFeatureFlags.GitOpsDeploy}}": true,
                    "{{StudioFeatureFlags.Maskinporten}}": true
                },
                "Maskinporten": {
                    "MetadataAddresses": ["http://localhost/.well-known/oauth-authorization-server"],
                    "RequiredScope": "{{RequiredScope}}"
                }
            }
            """
        );
    }

    private HttpClient CreateClientWithMaskinportenAuth(bool shouldAuthenticate, string scope = null)
    {
        string configPath = GetConfigPath();
        IConfiguration configuration = new ConfigurationBuilder()
            .AddJsonFile(configPath, false, false)
            .AddJsonStream(GenerateJsonOverrideConfig())
            .AddEnvironmentVariables()
            .Build();

        return Factory.WithWebHostBuilder(builder =>
        {
            builder.UseConfiguration(configuration);
            builder.ConfigureAppConfiguration((_, conf) =>
            {
                conf.AddJsonFile(configPath);
                conf.AddJsonStream(GenerateJsonOverrideConfig());
            });
            builder.ConfigureTestServices(ConfigureTestServices);
            builder.ConfigureTestServices(services =>
            {
                // Remove the IssuerSchemeCacheInitializer to avoid HTTP calls during test startup
                ServiceDescriptor initializerDescriptor = services.FirstOrDefault(
                    d => d.ImplementationType == typeof(IssuerSchemeCacheInitializer)
                );
                if (initializerDescriptor is not null)
                {
                    services.Remove(initializerDescriptor);
                }

                services.AddAuthentication(MaskinportenTestScheme)
                    .AddScheme<MaskinportenTestAuthOptions, MaskinportenTestAuthHandler>(
                        MaskinportenTestScheme,
                        options =>
                        {
                            options.ShouldAuthenticate = shouldAuthenticate;
                            options.Scope = scope;
                            options.TimeProvider = TimeProvider.System;
                        });

                services.AddAuthorizationBuilder()
                    .AddPolicy(
                        MaskinportenConstants.AuthorizationPolicy,
                        policy =>
                        {
                            policy.AddAuthenticationSchemes(MaskinportenTestScheme);
                            policy.RequireAuthenticatedUser();
                            policy.RequireAssertion(context =>
                            {
                                var scopeClaim = context.User.FindFirst(MaskinportenConstants.ScopeClaimType);
                                if (scopeClaim is null)
                                {
                                    return false;
                                }

                                string[] scopes = scopeClaim.Value.Split(' ', StringSplitOptions.RemoveEmptyEntries);
                                return scopes.Contains(RequiredScope);
                            });
                        });
            });
        }).CreateDefaultClient(new CookieContainerHandler());
    }

    [Theory]
    [InlineData("ttd", "at22", "InstallSucceeded", "Install succeeded")]
    [InlineData("ttd", "at22", "InstallFailed", "Install failed")]
    [InlineData("ttd", "at22", "UpgradeSucceeded", "Upgrade succeeded")]
    [InlineData("ttd", "at22", "UpgradeFailed", "Upgrade failed")]
    [InlineData("ttd", "at22", "PipelineScheduled", "Pipeline scheduled")]
    [InlineData("ttd", "at22", "PipelineSucceeded", "Pipeline succeeded")]
    [InlineData("ttd", "at22", "PipelineFailed", "Pipeline failed")]
    public async Task ReceiveDeployEvent_ForDeployment_ShouldCreateEvent(string org, string envName, string eventType, string message)
    {
        // Arrange
        string app = TestDataHelper.GenerateTestRepoName();
        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(
            org, app, envName: envName, deploymentType: DeploymentType.Deploy);
        await DesignerDbFixture.PrepareEntityInDatabase(deploymentEntity);

        var request = new DeployEventRequest
        {
            BuildId = deploymentEntity.Build.Id,
            EventType = eventType,
            Message = message,
            Timestamp = DateTimeOffset.UtcNow,
            Environment = envName
        };

        using var client = CreateClientWithMaskinportenAuth(shouldAuthenticate: true, scope: RequiredScope);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, WebhookUrl(org, app))
        {
            Content = JsonContent.Create(request)
        };

        // Act
        using var response = await client.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var events = await DesignerDbFixture.DbContext.DeployEvents
            .AsNoTracking()
            .Where(e => e.Deployment.Buildid == deploymentEntity.Build.Id)
            .ToListAsync();

        Assert.Single(events);
        Assert.Equal(eventType, events[0].EventType);
        Assert.Equal(message, events[0].Message);
    }

    [Theory]
    [InlineData("ttd", "at22", "UninstallSucceeded", "Uninstall succeeded")]
    [InlineData("ttd", "at22", "UninstallFailed", "Uninstall failed")]
    public async Task ReceiveDeployEvent_ForDecommission_ShouldCreateEvent(string org, string envName, string eventType, string message)
    {
        // Arrange
        string app = TestDataHelper.GenerateTestRepoName();
        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(
            org, app, envName: envName, deploymentType: DeploymentType.Decommission);
        await DesignerDbFixture.PrepareEntityInDatabase(deploymentEntity);

        var request = new DeployEventRequest
        {
            BuildId = null, // BuildId is not required for uninstall events
            EventType = eventType,
            Message = message,
            Timestamp = DateTimeOffset.UtcNow,
            Environment = envName
        };

        using var client = CreateClientWithMaskinportenAuth(shouldAuthenticate: true, scope: RequiredScope);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, WebhookUrl(org, app))
        {
            Content = JsonContent.Create(request)
        };

        // Act
        using var response = await client.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var events = await DesignerDbFixture.DbContext.DeployEvents
            .AsNoTracking()
            .Where(e => e.Deployment.Buildid == deploymentEntity.Build.Id)
            .ToListAsync();

        Assert.Single(events);
        Assert.Equal(eventType, events[0].EventType);
        Assert.Equal(message, events[0].Message);
    }

    [Fact]
    public async Task ReceiveDeployEvent_WithInvalidEventType_ShouldReturnBadRequest()
    {
        // Arrange
        string org = "ttd";
        string app = TestDataHelper.GenerateTestRepoName();

        var request = new DeployEventRequest
        {
            BuildId = "12345",
            EventType = "InvalidEventType",
            Message = "Some message",
            Timestamp = DateTimeOffset.UtcNow,
            Environment = "at22"
        };

        using var client = CreateClientWithMaskinportenAuth(shouldAuthenticate: true, scope: RequiredScope);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, WebhookUrl(org, app))
        {
            Content = JsonContent.Create(request)
        };

        // Act
        using var response = await client.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("Invalid event type", content);
    }

    [Fact]
    public async Task ReceiveDeployEvent_ForDeployment_WithoutBuildId_ShouldReturnBadRequest()
    {
        // Arrange
        string org = "ttd";
        string app = TestDataHelper.GenerateTestRepoName();

        var request = new DeployEventRequest
        {
            BuildId = null,
            EventType = "InstallSucceeded",
            Message = "Install succeeded",
            Timestamp = DateTimeOffset.UtcNow,
            Environment = "at22"
        };

        using var client = CreateClientWithMaskinportenAuth(shouldAuthenticate: true, scope: RequiredScope);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, WebhookUrl(org, app))
        {
            Content = JsonContent.Create(request)
        };

        // Act
        using var response = await client.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("BuildId is required", content);
    }

    [Fact]
    public async Task ReceiveDeployEvent_ForDecommission_WithNoPendingDecommission_ShouldReturnNotFound()
    {
        // Arrange
        string org = "ttd";
        string app = TestDataHelper.GenerateTestRepoName();
        string envName = "at22";

        // Create a regular deployment, not a decommission
        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(
            org, app, envName: envName, deploymentType: DeploymentType.Deploy);
        await DesignerDbFixture.PrepareEntityInDatabase(deploymentEntity);

        var request = new DeployEventRequest
        {
            BuildId = null,
            EventType = "UninstallSucceeded",
            Message = "Uninstall succeeded",
            Timestamp = DateTimeOffset.UtcNow,
            Environment = envName
        };

        using var client = CreateClientWithMaskinportenAuth(shouldAuthenticate: true, scope: RequiredScope);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, WebhookUrl(org, app))
        {
            Content = JsonContent.Create(request)
        };

        // Act
        using var response = await client.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        var content = await response.Content.ReadAsStringAsync();
        Assert.Contains("No pending decommission deployment found", content);
    }

    [Theory]
    [InlineData("InstallSucceeded")]
    [InlineData("InstallFailed")]
    [InlineData("UpgradeSucceeded")]
    [InlineData("UpgradeFailed")]
    public async Task ReceiveDeployEvent_ForDeployment_WhenHasFinalEvent_ShouldReturnOkWithoutAddingEvent(string finalEventType)
    {
        // Arrange
        string org = "ttd";
        string app = TestDataHelper.GenerateTestRepoName();
        string envName = "at22";

        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(
            org, app, envName: envName, deploymentType: DeploymentType.Deploy);
        await DesignerDbFixture.PrepareEntityInDatabase(deploymentEntity);

        // Add the final event first
        var existingFinalEvent = new DeployEvent
        {
            EventType = Enum.Parse<DeployEventType>(finalEventType),
            Message = "Final event",
            Timestamp = DateTimeOffset.UtcNow.AddMinutes(-1),
            Created = DateTimeOffset.UtcNow.AddMinutes(-1),
            Origin = DeployEventOrigin.Webhook
        };
        await DesignerDbFixture.PrepareDeployEventInDatabase(org, deploymentEntity.Build.Id, existingFinalEvent);

        // Try to add another event
        var request = new DeployEventRequest
        {
            BuildId = deploymentEntity.Build.Id,
            EventType = "PipelineSucceeded",
            Message = "This should not be added",
            Timestamp = DateTimeOffset.UtcNow,
            Environment = envName
        };

        using var client = CreateClientWithMaskinportenAuth(shouldAuthenticate: true, scope: RequiredScope);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, WebhookUrl(org, app))
        {
            Content = JsonContent.Create(request)
        };

        // Act
        using var response = await client.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        // Verify only the original final event exists
        var events = await DesignerDbFixture.DbContext.DeployEvents
            .AsNoTracking()
            .Where(e => e.Deployment.Buildid == deploymentEntity.Build.Id)
            .ToListAsync();

        Assert.Single(events);
        Assert.Equal(finalEventType, events[0].EventType);
    }

    [Theory]
    [InlineData("UninstallSucceeded")]
    [InlineData("UninstallFailed")]
    public async Task ReceiveDeployEvent_ForDecommission_WhenHasFinalEvent_ShouldReturnNotFound(string finalEventType)
    {
        // Arrange
        string org = "ttd";
        string app = TestDataHelper.GenerateTestRepoName();
        string envName = "at22";

        var deploymentEntity = EntityGenerationUtils.Deployment.GenerateDeploymentEntity(
            org, app, envName: envName, deploymentType: DeploymentType.Decommission);
        await DesignerDbFixture.PrepareEntityInDatabase(deploymentEntity);

        // Add the final event first - this makes the decommission no longer "pending"
        var existingFinalEvent = new DeployEvent
        {
            EventType = Enum.Parse<DeployEventType>(finalEventType),
            Message = "Final event",
            Timestamp = DateTimeOffset.UtcNow.AddMinutes(-1),
            Created = DateTimeOffset.UtcNow.AddMinutes(-1),
            Origin = DeployEventOrigin.Webhook
        };
        await DesignerDbFixture.PrepareDeployEventInDatabase(org, deploymentEntity.Build.Id, existingFinalEvent);

        // Try to add another uninstall event - GetPendingDecommission will return null
        // because the decommission already has a final event
        var request = new DeployEventRequest
        {
            BuildId = null,
            EventType = "UninstallSucceeded",
            Message = "This should not be added",
            Timestamp = DateTimeOffset.UtcNow,
            Environment = envName
        };

        using var client = CreateClientWithMaskinportenAuth(shouldAuthenticate: true, scope: RequiredScope);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, WebhookUrl(org, app))
        {
            Content = JsonContent.Create(request)
        };

        // Act
        using var response = await client.SendAsync(httpRequestMessage);

        // Assert - Returns NotFound because GetPendingDecommission excludes deployments with final events
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);

        // Verify only the original final event exists (no new event was added)
        var events = await DesignerDbFixture.DbContext.DeployEvents
            .AsNoTracking()
            .Where(e => e.Deployment.Buildid == deploymentEntity.Build.Id)
            .ToListAsync();

        Assert.Single(events);
        Assert.Equal(finalEventType, events[0].EventType);
    }

    [Fact]
    public async Task ReceiveDeployEvent_WithoutAuthentication_ShouldReturnUnauthorized()
    {
        // Arrange
        string org = "ttd";
        string app = TestDataHelper.GenerateTestRepoName();

        var request = new DeployEventRequest
        {
            BuildId = "12345",
            EventType = "InstallSucceeded",
            Message = "Install succeeded",
            Timestamp = DateTimeOffset.UtcNow,
            Environment = "at22"
        };

        using var client = CreateClientWithMaskinportenAuth(shouldAuthenticate: false);
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, WebhookUrl(org, app))
        {
            Content = JsonContent.Create(request)
        };

        // Act
        using var response = await client.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task ReceiveDeployEvent_WithWrongScope_ShouldReturnForbidden()
    {
        // Arrange
        string org = "ttd";
        string app = TestDataHelper.GenerateTestRepoName();

        var request = new DeployEventRequest
        {
            BuildId = "12345",
            EventType = "InstallSucceeded",
            Message = "Install succeeded",
            Timestamp = DateTimeOffset.UtcNow,
            Environment = "at22"
        };

        using var client = CreateClientWithMaskinportenAuth(shouldAuthenticate: true, scope: "wrong:scope");
        using var httpRequestMessage = new HttpRequestMessage(HttpMethod.Post, WebhookUrl(org, app))
        {
            Content = JsonContent.Create(request)
        };

        // Act
        using var response = await client.SendAsync(httpRequestMessage);

        // Assert
        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }
}
