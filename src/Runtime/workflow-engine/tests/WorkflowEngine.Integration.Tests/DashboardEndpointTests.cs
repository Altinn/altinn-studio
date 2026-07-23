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
        await fixture.Reset();
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
        using var response = await client.GetAsync("/dashboard/labels?key=org", TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
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
        using var response = await client.GetAsync("/dashboard/labels?key=org", TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
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
        using var response = await client.GetAsync(
            "/dashboard/query?status=COMPLETED",
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
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
        using var response = await client.GetAsync(
            "/dashboard/query?status=FAILED",
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
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
        using var response = await client.GetAsync(
            "/dashboard/query?status=COMPLETED&limit=1",
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
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
        using var response = await client.GetAsync("/dashboard/scheduled", TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
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

        using var client = fixture.CreateEngineClient();

        // Act
        using var response = await client.GetAsync("/dashboard/scheduled", TestContext.Current.CancellationToken);

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
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

        var stepId = status.Steps[0].DatabaseId;

        using var client = fixture.CreateEngineClient();

        // Act
        using var response = await client.GetAsync(
            $"/dashboard/step?wf={workflowId}&ns={Uri.EscapeDataString(EngineApiClient.DefaultNamespace)}&step={stepId}",
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        using var doc = JsonDocument.Parse(json);
        Assert.True(doc.RootElement.TryGetProperty("idempotencyKey", out var id));
        Assert.Equal(stepId.ToString(), id.GetString());
        Assert.True(doc.RootElement.TryGetProperty("status", out _));
    }

    [Fact]
    public async Task Step_NotFound_Returns404()
    {
        // Arrange
        using var client = fixture.CreateEngineClient();

        // Act
        using var response = await client.GetAsync(
            $"/dashboard/step?wf={Guid.Empty}&ns=nonexistent-ns&step=nonexistent",
            TestContext.Current.CancellationToken
        );

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
        _ = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        using var client = fixture.CreateEngineClient();

        // Act
        using var response = await client.GetAsync(
            $"/dashboard/state?wf={workflowId}&ns={Uri.EscapeDataString(EngineApiClient.DefaultNamespace)}",
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var json = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
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
        using var response = await client.GetAsync(
            $"/dashboard/state?wf={Guid.Empty}&ns=nonexistent-ns",
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── /dashboard/relations ───────────────────────────────────────────

    [Fact]
    public async Task Relations_ReturnsDependenciesDependentsLinksAndIsHead()
    {
        // Arrange - main <- side (side depends on and links to main, and is an invisible side chain)
        var mainWorkflow = _testHelpers.CreateWorkflow("wf-main", [_testHelpers.CreateWebhookStep("/hook")]);
        var sideWorkflow = _testHelpers.CreateWorkflow(
            "wf-side",
            [_testHelpers.CreateWebhookStep("/hook-side")],
            dependsOn: [(WorkflowRef)"wf-main"]
        ) with
        {
            Links = [(WorkflowRef)"wf-main"],
            IsHead = false,
        };
        var request = _testHelpers.CreateEnqueueRequest([mainWorkflow, sideWorkflow], includeContext: false);
        var enqueueResponse = await _client.Enqueue(request);
        var mainId = enqueueResponse.Workflows[0].DatabaseId;
        var sideId = enqueueResponse.Workflows[1].DatabaseId;
        await _client.WaitForWorkflowStatus(
            enqueueResponse.Workflows.Select(w => w.DatabaseId),
            PersistentItemStatus.Completed
        );

        using var client = fixture.CreateEngineClient();

        // Act
        using var sideResponse = await client.GetAsync(
            $"/dashboard/relations?wf={sideId}&ns={Uri.EscapeDataString(EngineApiClient.DefaultNamespace)}",
            TestContext.Current.CancellationToken
        );
        using var mainResponse = await client.GetAsync(
            $"/dashboard/relations?wf={mainId}&ns={Uri.EscapeDataString(EngineApiClient.DefaultNamespace)}",
            TestContext.Current.CancellationToken
        );

        // Assert - the side workflow reports its dependency, its link, and the head directive
        Assert.Equal(HttpStatusCode.OK, sideResponse.StatusCode);
        var sideJson = await sideResponse.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        using var sideDoc = JsonDocument.Parse(sideJson);
        Assert.False(sideDoc.RootElement.GetProperty("isHead").GetBoolean());
        var dependsOn = Assert.Single(sideDoc.RootElement.GetProperty("dependsOn").EnumerateArray());
        Assert.Equal(mainId, dependsOn.GetProperty("databaseId").GetGuid());
        Assert.Equal("Completed", dependsOn.GetProperty("status").GetString());
        var link = Assert.Single(sideDoc.RootElement.GetProperty("links").EnumerateArray());
        Assert.Equal(mainId, link.GetProperty("databaseId").GetGuid());
        Assert.Equal(0, sideDoc.RootElement.GetProperty("dependents").GetArrayLength());

        // The main workflow reports the inverse edge
        Assert.Equal(HttpStatusCode.OK, mainResponse.StatusCode);
        var mainJson = await mainResponse.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        using var mainDoc = JsonDocument.Parse(mainJson);
        var dependent = Assert.Single(mainDoc.RootElement.GetProperty("dependents").EnumerateArray());
        Assert.Equal(sideId, dependent.GetProperty("databaseId").GetGuid());
        Assert.Equal(0, mainDoc.RootElement.GetProperty("dependsOn").GetArrayLength());
    }

    [Fact]
    public async Task Relations_NotFound_Returns404()
    {
        // Arrange
        using var client = fixture.CreateEngineClient();

        // Act
        using var response = await client.GetAsync(
            $"/dashboard/relations?wf={Guid.Empty}&ns=nonexistent-ns",
            TestContext.Current.CancellationToken
        );

        // Assert
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
