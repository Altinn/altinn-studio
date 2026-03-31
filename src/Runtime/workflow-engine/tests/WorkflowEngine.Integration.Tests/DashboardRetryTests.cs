using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

[Collection(EngineAppCollection.Name)]
public sealed class DashboardRetryTests(EngineAppFixture<Program> fixture) : IAsyncLifetime
{
    private readonly EngineApiClient _client = new(fixture);
    private readonly TestHelpers _testHelpers = new(fixture);

    public async ValueTask InitializeAsync()
    {
        await fixture.Reset();
        await _testHelpers.AssertDbEmpty();
        await Task.Delay(50);
    }

    public async ValueTask DisposeAsync()
    {
        _client.Dispose();
        await Task.Delay(50);
    }

    // ── POST /dashboard/retry ─────────────────────────────────────────

    [Fact]
    public async Task Retry_FailedWorkflow_ResetsToEnqueued()
    {
        // Arrange — make a workflow fail (WireMock returns 400 = non-retryable)
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .RespondWith(Response.Create().WithStatusCode(400).WithBody("Bad Request"));

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/fail-for-retry")])
        );
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Failed);

        // Now restore WireMock to 200 so the retry succeeds
        fixture.WireMock.Reset();
        fixture.WireMock.Given(Request.Create().UsingAnyMethod()).RespondWith(Response.Create().WithStatusCode(200));

        using var client = fixture.CreateEngineClient();

        // Act — retry via dashboard endpoint
        using var retryResponse = await client.PostAsJsonAsync(
            "/dashboard/retry",
            new { workflowId },
            TestContext.Current.CancellationToken
        );

        // Assert — endpoint returns 200 OK
        Assert.Equal(HttpStatusCode.OK, retryResponse.StatusCode);

        // Wait for the retried workflow to complete
        var finalStatus = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);
        Assert.Equal(PersistentItemStatus.Completed, finalStatus.OverallStatus);
    }

    [Fact]
    public async Task Retry_CompletedWorkflow_Returns409()
    {
        // Arrange — create a workflow and let it complete
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")])
        );
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        using var client = fixture.CreateEngineClient();

        // Act
        using var retryResponse = await client.PostAsJsonAsync(
            "/dashboard/retry",
            new { workflowId },
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, retryResponse.StatusCode);
    }

    [Fact]
    public async Task Retry_NonExistentWorkflow_Returns404()
    {
        using var client = fixture.CreateEngineClient();

        // Act
        using var retryResponse = await client.PostAsJsonAsync(
            "/dashboard/retry",
            new { workflowId = Guid.NewGuid() },
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, retryResponse.StatusCode);
    }

    [Fact]
    public async Task Retry_InvalidPayload_Returns400()
    {
        using var client = fixture.CreateEngineClient();

        // Act — send empty body
        using var retryResponse = await client.PostAsJsonAsync(
            "/dashboard/retry",
            new { notAWorkflowId = "hello" },
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, retryResponse.StatusCode);
    }

    // ── POST /dashboard/skip-backoff ──────────────────────────────────

    [Fact]
    public async Task SkipBackoff_NonExistentWorkflow_Returns404()
    {
        using var client = fixture.CreateEngineClient();

        // Act
        using var response = await client.PostAsJsonAsync(
            "/dashboard/skip-backoff",
            new { workflowId = Guid.NewGuid() },
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task SkipBackoff_CompletedWorkflow_Returns409()
    {
        // Arrange
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")])
        );
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        using var client = fixture.CreateEngineClient();

        // Act
        using var response = await client.PostAsJsonAsync(
            "/dashboard/skip-backoff",
            new { workflowId },
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task SkipBackoff_InvalidPayload_Returns400()
    {
        using var client = fixture.CreateEngineClient();

        // Act
        using var response = await client.PostAsJsonAsync(
            "/dashboard/skip-backoff",
            new { notAWorkflowId = "hello" },
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
