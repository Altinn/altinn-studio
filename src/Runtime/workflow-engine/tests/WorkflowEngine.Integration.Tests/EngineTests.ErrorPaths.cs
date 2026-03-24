using System.Net;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Core;
using WorkflowEngine.Models;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    [Fact]
    public async Task Webhook_Returns500_WorkflowRetriesAndEventuallyFails()
    {
        // Arrange – WireMock always returns 500
        fixture.WireMock.Reset();
        fixture.WireMock.Given(Request.Create().UsingAnyMethod()).RespondWith(Response.Create().WithStatusCode(500));

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/always-500")])
        );

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Failed);

        // Assert — engine is configured with 3 retries (Constant, 100ms)
        Assert.Equal(PersistentItemStatus.Failed, status.OverallStatus);
        Assert.Equal(PersistentItemStatus.Failed, status.Steps[0].Status);
        Assert.Equal(3, status.Steps[0].RetryCount);
    }

    [Fact]
    public async Task Webhook_Returns500ThenSuccess_WorkflowCompletes()
    {
        // Arrange – WireMock returns 500 twice, then 200
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .InScenario("flaky")
            .WillSetStateTo("failed-1")
            .RespondWith(Response.Create().WithStatusCode(500));
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .InScenario("flaky")
            .WhenStateIs("failed-1")
            .WillSetStateTo("failed-2")
            .RespondWith(Response.Create().WithStatusCode(500));
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .InScenario("flaky")
            .WhenStateIs("failed-2")
            .RespondWith(Response.Create().WithStatusCode(200));

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/flaky")])
        );

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Assert
        Assert.Equal(PersistentItemStatus.Completed, status.OverallStatus);
        Assert.Equal(PersistentItemStatus.Completed, status.Steps[0].Status);
        Assert.Equal(2, status.Steps[0].RetryCount);
    }

    [Fact]
    public async Task Webhook_Returns400_WorkflowFailsImmediately()
    {
        // Arrange – WireMock returns 400 (non-retryable client error)
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .RespondWith(Response.Create().WithStatusCode(400).WithBody("Bad Request"));

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/bad-request")])
        );

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Failed);

        // Assert — no retries for 400
        Assert.Equal(PersistentItemStatus.Failed, status.OverallStatus);
        Assert.Equal(PersistentItemStatus.Failed, status.Steps[0].Status);
        Assert.Equal(0, status.Steps[0].RetryCount);
    }

    [Fact]
    public async Task Enqueue_WhenAtBackpressureThreshold_Returns429()
    {
        // Arrange — seed the cached workflow count to match the threshold
        var engineStatus = fixture.Services.GetRequiredService<IEngineStatus>();
        var settings = fixture.Services.GetRequiredService<IOptions<EngineSettings>>().Value;
        engineStatus.UpdateWorkflowCounts(active: settings.Concurrency.BackpressureThreshold, scheduled: 0, failed: 0);

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/backpressure")])
        );

        // Act
        using var response = await _client.EnqueueRaw(request);

        // Assert
        Assert.Equal(HttpStatusCode.TooManyRequests, response.StatusCode);

        // Clean up — restore counts so other tests aren't affected
        engineStatus.UpdateWorkflowCounts(active: 0, scheduled: 0, failed: 0);
    }

    [Fact]
    public async Task HealthCheck_WhenAtBackpressureThreshold_ReturnsDegraded()
    {
        // Arrange — seed the cached workflow count to match the threshold
        var engineStatus = fixture.Services.GetRequiredService<IEngineStatus>();
        var settings = fixture.Services.GetRequiredService<IOptions<EngineSettings>>().Value;
        engineStatus.UpdateWorkflowCounts(active: settings.Concurrency.BackpressureThreshold, scheduled: 0, failed: 0);

        // Act
        using var client = fixture.CreateEngineClient();
        using var response = await client.GetAsync("/api/v1/health/ready", TestContext.Current.CancellationToken);
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);

        // Assert — health check should report degraded (QueueFull flag triggers DegradedMask)
        // Note: ASP.NET returns 200 for Degraded by default (only Unhealthy maps to 503)
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Contains("Degraded", body, StringComparison.Ordinal);
        Assert.Contains("QueueFull", body, StringComparison.Ordinal);

        // Clean up — restore counts so other tests aren't affected
        engineStatus.UpdateWorkflowCounts(active: 0, scheduled: 0, failed: 0);
    }
}
