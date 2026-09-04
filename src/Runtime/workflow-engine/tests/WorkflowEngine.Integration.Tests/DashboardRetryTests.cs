using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;
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
            new { workflowId, @namespace = EngineApiClient.DefaultNamespace },
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
            new { workflowId, @namespace = EngineApiClient.DefaultNamespace },
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
            new { workflowId = Guid.NewGuid(), @namespace = "nonexistent-ns" },
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

    // ── POST /dashboard/nudge ─────────────────────────────────────────

    [Fact]
    public async Task Nudge_NonExistentWorkflow_Returns404()
    {
        using var client = fixture.CreateEngineClient();

        // Act
        using var response = await client.PostAsJsonAsync(
            "/dashboard/nudge",
            new { workflowId = Guid.NewGuid(), @namespace = "nonexistent-ns" },
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Nudge_CompletedWorkflow_Returns409()
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
            "/dashboard/nudge",
            new { workflowId, @namespace = EngineApiClient.DefaultNamespace },
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Nudge_InvalidPayload_Returns400()
    {
        using var client = fixture.CreateEngineClient();

        // Act
        using var response = await client.PostAsJsonAsync(
            "/dashboard/nudge",
            new { notAWorkflowId = "hello" },
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    // ── POST /dashboard/fail ──────────────────────────────────────────

    [Fact]
    public async Task Fail_RequeuedWorkflow_FailsStepWithManualErrorEntry_AndStaysResumable()
    {
        // Arrange — a retryable failure (500) parked behind a backoff long enough to hold still
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .RespondWith(Response.Create().WithStatusCode(500).WithBody("boom"));

        var step = _testHelpers.CreateWebhookStep(
            "/fail-parked",
            retryStrategy: RetryStrategy.Constant(TimeSpan.FromMinutes(10), maxRetries: 5)
        );
        var request = _testHelpers.CreateEnqueueRequest(_testHelpers.CreateWorkflow("wf", [step]));
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Requeued);

        using var client = fixture.CreateEngineClient();

        // Act
        using var failResponse = await client.PostAsJsonAsync(
            "/dashboard/fail",
            new { workflowId, @namespace = EngineApiClient.DefaultNamespace },
            TestContext.Current.CancellationToken
        );

        // Assert — terminal Failed, backoff gone, the manual entry appended after the retryable one
        Assert.Equal(HttpStatusCode.OK, failResponse.StatusCode);

        var failed = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Failed);
        Assert.Null(failed.BackoffUntil);
        var failedStep = Assert.Single(failed.Steps);
        Assert.Equal(PersistentItemStatus.Failed, failedStep.Status);
        Assert.NotNull(failedStep.ErrorHistory);
        Assert.Equal(2, failedStep.ErrorHistory.Count);
        Assert.True(failedStep.ErrorHistory[0].WasRetryable);
        var manual = failedStep.ErrorHistory[1];
        Assert.False(manual.WasRetryable);
        Assert.Null(manual.HttpStatusCode);
        Assert.Contains("manually", manual.Message, StringComparison.Ordinal);

        // A manual failure is an ordinary failure: Retry resumes it
        fixture.WireMock.Reset();
        fixture.WireMock.Given(Request.Create().UsingAnyMethod()).RespondWith(Response.Create().WithStatusCode(200));

        using var retryResponse = await client.PostAsJsonAsync(
            "/dashboard/retry",
            new { workflowId, @namespace = EngineApiClient.DefaultNamespace },
            TestContext.Current.CancellationToken
        );
        Assert.Equal(HttpStatusCode.OK, retryResponse.StatusCode);
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);
    }

    [Fact]
    public async Task Fail_CompletedWorkflow_Returns409()
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
            "/dashboard/fail",
            new { workflowId, @namespace = EngineApiClient.DefaultNamespace },
            TestContext.Current.CancellationToken
        );

        // Assert — nothing to give up on, and the completed workflow is left alone
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var workflow = await _client.GetWorkflow(workflowId);
        Assert.NotNull(workflow);
        Assert.Equal(PersistentItemStatus.Completed, workflow.OverallStatus);
    }

    [Fact]
    public async Task Fail_NonExistentWorkflow_Returns404()
    {
        using var client = fixture.CreateEngineClient();

        // Act
        using var response = await client.PostAsJsonAsync(
            "/dashboard/fail",
            new { workflowId = Guid.NewGuid(), @namespace = "nonexistent-ns" },
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("/dashboard/retry")]
    [InlineData("/dashboard/nudge")]
    [InlineData("/dashboard/fail")]
    public async Task WorkflowAction_MalformedBody_Returns400(string path)
    {
        // Valid JSON that is not an object naming a target, plus a body that is not JSON at all — each
        // used to surface as a 500 out of JsonElement rather than the intended 400.
        string[] bodies = ["[]", "\"just a string\"", "{\"workflowId\":1,\"namespace\":\"ops\"}", "{not json"];
        using var client = fixture.CreateEngineClient();
        foreach (var body in bodies)
        {
            using var content = new StringContent(body, System.Text.Encoding.UTF8, "application/json");
            using var response = await client.PostAsync(path, content, TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }
    }

    [Fact]
    public async Task Fail_InvalidPayload_Returns400()
    {
        using var client = fixture.CreateEngineClient();

        // Act
        using var response = await client.PostAsJsonAsync(
            "/dashboard/fail",
            new { notAWorkflowId = "hello" },
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
