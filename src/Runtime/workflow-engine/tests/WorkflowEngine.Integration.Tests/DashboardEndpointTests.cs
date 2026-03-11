using System.Net;
using System.Text.Json;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

[Collection(EngineAppCollection.Name)]
public sealed class DashboardEndpointTests(EngineAppFixture<Program> fixture) : IAsyncLifetime
{
    private readonly EngineApiClient _client = new(fixture);
    private readonly TestHelpers _testHelpers = new(fixture);

    public async ValueTask InitializeAsync()
    {
        await fixture.ResetAsync();
        await _testHelpers.AssertDbEmpty();
        await Task.Delay(50);
    }

    public async ValueTask DisposeAsync()
    {
        _client.Dispose();
        await Task.Delay(50);
    }

    // ── /dashboard/labels ─────────────────────────────────────────────

    [Fact]
    public async Task Labels_EmptyDb_ReturnsEmptyArray()
    {
        // Arrange
        using var client = fixture.CreateEngineClient();

        // Act
        using var response = await client.GetAsync("/dashboard/labels?key=org");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.Equal(JsonValueKind.Array, doc.RootElement.ValueKind);
        Assert.Equal(0, doc.RootElement.GetArrayLength());
    }

    [Fact]
    public async Task Labels_WithData_ReturnsDistinctValues()
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
        using var response = await client.GetAsync("/dashboard/labels?key=org");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.True(doc.RootElement.GetArrayLength() >= 1);
        Assert.Equal(JsonValueKind.String, doc.RootElement[0].ValueKind);
    }

    // ── /dashboard/query ───────────────────────────────────────────────

    [Fact]
    public async Task Query_ReturnsCompletedWorkflows()
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
        using var response = await client.GetAsync("/dashboard/query?status=COMPLETED");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.True(doc.RootElement.TryGetProperty("totalCount", out var totalCount));
        Assert.True(totalCount.GetInt32() >= 1);
        Assert.True(doc.RootElement.TryGetProperty("workflows", out var workflows));
        Assert.True(workflows.GetArrayLength() >= 1);
    }

    [Fact]
    public async Task Query_StatusFilter_ReturnsOnlyMatchingStatus()
    {
        // Arrange — create a completed workflow
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")])
        );
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        using var client = fixture.CreateEngineClient();

        // Act — query for FAILED only (should not include our completed workflow)
        using var response = await client.GetAsync("/dashboard/query?status=FAILED");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.Equal(0, doc.RootElement.GetProperty("totalCount").GetInt32());
    }

    [Fact]
    public async Task Query_LimitParameter_RespectsLimit()
    {
        // Arrange — create 3 completed workflows
        for (int i = 0; i < 3; i++)
        {
            var request = _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow($"wf-{i}", [_testHelpers.CreateWebhookStep("/hook")])
            );
            var enqueueResponse = await _client.Enqueue(request);
            var workflowId = enqueueResponse.Workflows.Single().DatabaseId;
            await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);
        }

        using var client = fixture.CreateEngineClient();

        // Act
        using var response = await client.GetAsync("/dashboard/query?status=COMPLETED&limit=1");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.Equal(1, doc.RootElement.GetProperty("workflows").GetArrayLength());
        Assert.True(doc.RootElement.GetProperty("totalCount").GetInt32() >= 3);
    }

    // ── /dashboard/scheduled ───────────────────────────────────────────

    [Fact]
    public async Task Scheduled_NoScheduled_ReturnsEmptyArray()
    {
        // Arrange
        using var client = fixture.CreateEngineClient();

        // Act
        using var response = await client.GetAsync("/dashboard/scheduled");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.Equal(JsonValueKind.Array, doc.RootElement.ValueKind);
        Assert.Equal(0, doc.RootElement.GetArrayLength());
    }

    [Fact]
    public async Task Scheduled_WithFutureStartAt_ReturnsWorkflow()
    {
        // Arrange
        var startAt = DateTimeOffset.UtcNow.AddHours(1);
        var wfRequest = new WorkflowRequest
        {
            Ref = "wf-scheduled",
            OperationId = $"op-{Guid.NewGuid()}",
            StartAt = startAt,
            Steps = [_testHelpers.CreateWebhookStep("/scheduled-hook")],
        };
        var request = _testHelpers.CreateEnqueueRequest(wfRequest);
        await _client.Enqueue(request);

        // Give the engine a moment to persist
        await Task.Delay(500);

        using var client = fixture.CreateEngineClient();

        // Act
        using var response = await client.GetAsync("/dashboard/scheduled");

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.True(doc.RootElement.GetArrayLength() >= 1);
    }

    // ── /dashboard/step ────────────────────────────────────────────────

    [Fact]
    public async Task Step_CompletedWorkflow_ReturnsStepDetail()
    {
        // Arrange
        var wfRequest = _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")]);
        var request = _testHelpers.CreateEnqueueRequest(wfRequest);
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        var wfKey = status.IdempotencyKey;
        var stepKey = status.Steps[0].IdempotencyKey;
        var createdAt = status.CreatedAt.ToString("o");

        using var client = fixture.CreateEngineClient();

        // Act
        using var response = await client.GetAsync(
            $"/dashboard/step?wf={Uri.EscapeDataString(wfKey)}&step={Uri.EscapeDataString(stepKey)}&createdAt={Uri.EscapeDataString(createdAt)}"
        );

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.True(doc.RootElement.TryGetProperty("idempotencyKey", out var key));
        Assert.Equal(stepKey, key.GetString());
        Assert.True(doc.RootElement.TryGetProperty("status", out _));
    }

    [Fact]
    public async Task Step_NotFound_Returns404()
    {
        // Arrange
        using var client = fixture.CreateEngineClient();

        // Act
        using var response = await client.GetAsync("/dashboard/step?wf=nonexistent&step=nonexistent");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── /dashboard/state ───────────────────────────────────────────────

    [Fact]
    public async Task State_CompletedWorkflow_ReturnsStateData()
    {
        // Arrange
        var wfRequest = _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")]);
        var request = _testHelpers.CreateEnqueueRequest(wfRequest);
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;
        var status = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        var wfKey = status.IdempotencyKey;
        var createdAt = status.CreatedAt.ToString("o");

        using var client = fixture.CreateEngineClient();

        // Act
        using var response = await client.GetAsync(
            $"/dashboard/state?wf={Uri.EscapeDataString(wfKey)}&createdAt={Uri.EscapeDataString(createdAt)}"
        );

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync();
        using var doc = JsonDocument.Parse(json);
        Assert.True(doc.RootElement.TryGetProperty("steps", out var steps));
        Assert.Equal(JsonValueKind.Array, steps.ValueKind);
    }

    [Fact]
    public async Task State_NotFound_Returns404()
    {
        // Arrange
        using var client = fixture.CreateEngineClient();

        // Act
        using var response = await client.GetAsync("/dashboard/state?wf=nonexistent");

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
