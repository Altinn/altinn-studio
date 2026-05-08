using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.RegularExpressions;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    // ── Health endpoint responses ─────────────────────────────────────────────

    [Fact]
    public async Task Response_HealthLive_ReturnsExpectedShape()
    {
        using var client = fixture.CreateEngineClient();
        using var response = await client.GetAsync("/api/v1/health/live", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    [Fact]
    public async Task Response_HealthReady_ReturnsExpectedShape()
    {
        using var client = fixture.CreateEngineClient();
        using var response = await client.GetAsync("/api/v1/health/ready", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body).ScrubMembers("active_workflows", "scheduled_workflows", "failed_workflows", "count");
    }

    [Fact]
    public async Task Response_HealthAggregate_ReturnsExpectedShape()
    {
        using var client = fixture.CreateEngineClient();
        using var response = await client.GetAsync("/api/v1/health", TestContext.Current.CancellationToken);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body).ScrubMembers("active_workflows", "scheduled_workflows", "failed_workflows", "count");
    }

    // ── Enqueue endpoint responses ────────────────────────────────────────────

    [Fact]
    public async Task Response_Enqueue_SingleWebhookWorkflow_ReturnsAcceptedShape()
    {
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf-1", [_testHelpers.CreateWebhookStep("/ping")])
        );

        using var response = await _client.EnqueueRaw(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body).ScrubMembers("databaseId");
        await WaitForAcceptedWorkflowsToComplete(body);
    }

    [Fact]
    public async Task Response_Enqueue_MultipleWorkflows_ReturnsAcceptedShape()
    {
        var workflows = new[]
        {
            _testHelpers.CreateWorkflow("wf-a", [_testHelpers.CreateWebhookStep("/ping-a")]),
            _testHelpers.CreateWorkflow("wf-b", [_testHelpers.CreateWebhookStep("/ping-b")]),
        };
        var request = _testHelpers.CreateEnqueueRequest(workflows);

        using var response = await _client.EnqueueRaw(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body).ScrubMembers("databaseId");
        await WaitForAcceptedWorkflowsToComplete(body);
    }

    // ── GetWorkflow endpoint responses ────────────────────────────────────────

    [Fact]
    public async Task Response_GetWorkflow_CompletedWebhook_ReturnsFullDetailsShape()
    {
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf-1", [_testHelpers.CreateWebhookStep("/ping")])
        );
        var accepted = await _client.Enqueue(request);
        var workflowId = accepted.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        using var response = await _client.GetWorkflowRaw(workflowId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    [Fact]
    public async Task Response_GetWorkflow_WithStepLabels_ReturnsLabelsInShape()
    {
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow(
                "wf-1",
                [
                    _testHelpers.CreateWebhookStep(
                        "/ping",
                        labels: new Dictionary<string, string> { ["env"] = "test", ["tier"] = "frontend" }
                    ),
                ]
            )
        );
        var accepted = await _client.Enqueue(request);
        var workflowId = accepted.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        using var response = await _client.GetWorkflowRaw(workflowId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    [Fact]
    public async Task Response_GetWorkflow_MultipleSteps_ReturnsAllSteps()
    {
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow(
                "wf-1",
                [
                    _testHelpers.CreateWebhookStep("/step-1"),
                    _testHelpers.CreateWebhookStep("/step-2"),
                    _testHelpers.CreateWebhookStep("/step-3"),
                ]
            )
        );
        var accepted = await _client.Enqueue(request);
        var workflowId = accepted.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        using var response = await _client.GetWorkflowRaw(workflowId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    [Fact]
    public async Task Response_GetWorkflow_NonExistent_Returns404()
    {
        using var response = await _client.GetWorkflowRaw(Guid.NewGuid());

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Response_GetWorkflow_WithDependencies_ShowsDependencyStatus()
    {
        var workflowA = _testHelpers.CreateWorkflow("wf-a", [_testHelpers.CreateWebhookStep("/ping-a")]);
        var workflowB = _testHelpers.CreateWorkflow(
            "wf-b",
            [_testHelpers.CreateWebhookStep("/ping-b")],
            dependsOn: ["wf-a"]
        );
        var request = _testHelpers.CreateEnqueueRequest([workflowA, workflowB]);

        var accepted = await _client.Enqueue(request);
        var workflowBId = accepted.Workflows.First(w => w.Ref == "wf-b").DatabaseId;

        await _client.WaitForWorkflowStatus(
            accepted.Workflows.Select(w => w.DatabaseId),
            PersistentItemStatus.Completed
        );

        using var response = await _client.GetWorkflowRaw(workflowBId);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        body = Regex.Replace(body, @"""[0-9a-f\-]{36}"":", @"""{Scrubbed}"":"); // Scrub the workflow GUIDs from the `dependencies` dict
        await VerifyJson(body).ScrubInlineGuids();
    }

    [Fact]
    public async Task Response_GetWorkflowDependencyGraph_IncludesDependentsAcrossCollectionKeys()
    {
        var rootWorkflow = _testHelpers.CreateWorkflow("wf-root", [_testHelpers.CreateWebhookStep("/ping-root")]);
        var rootAccepted = await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(rootWorkflow),
            collectionKey: "collection-a"
        );
        var rootWorkflowId = rootAccepted.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(rootWorkflowId, PersistentItemStatus.Completed);

        var childWorkflow = _testHelpers.CreateWorkflow("wf-child", [_testHelpers.CreateWebhookStep("/ping-child")]);
        var childAccepted = await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(childWorkflow with { DependsOn = [rootWorkflowId] }),
            collectionKey: "collection-b"
        );
        var childWorkflowId = childAccepted.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(childWorkflowId, PersistentItemStatus.Completed);

        var dependencyGraph = await _client.GetWorkflowDependencyGraph(rootWorkflowId);

        Assert.NotNull(dependencyGraph);
        Assert.Equal(rootWorkflowId, dependencyGraph.RootWorkflowId);

        var workflowIds = dependencyGraph.Workflows.Select(workflow => workflow.DatabaseId).ToHashSet();
        Assert.Equal(2, workflowIds.Count);
        Assert.Contains(rootWorkflowId, workflowIds);
        Assert.Contains(childWorkflowId, workflowIds);

        Assert.Collection(
            dependencyGraph.Edges,
            edge =>
            {
                Assert.Equal(rootWorkflowId, edge.From);
                Assert.Equal(childWorkflowId, edge.To);
                Assert.Equal(WorkflowDependencyGraphEdgeKind.Dependency, edge.Kind);
            }
        );

        using var rawResponse = await _client.GetWorkflowDependencyGraphRaw(rootWorkflowId);
        var body = await rawResponse.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    [Fact]
    public async Task Response_GetWorkflowDependencyGraph_TraversesDependenciesAndLinksBidirectionally()
    {
        // Three workflows enqueued separately so DependsOn / Links resolve via persisted GUIDs:
        //   c — independent (enqueued first)
        //   a — links to c       (link edge a → c)
        //   b — depends on a     (dependency edge a → b)
        // Querying the graph rooted at b must walk upward to a, then sideways via the link to c.
        var acceptedC = await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("c", [_testHelpers.CreateWebhookStep("/ping-c")])
            )
        );
        var idC = acceptedC.Workflows.Single().DatabaseId;

        var workflowA = _testHelpers.CreateWorkflow("a", [_testHelpers.CreateWebhookStep("/ping-a")]) with
        {
            Links = [idC],
        };
        var acceptedA = await _client.Enqueue(_testHelpers.CreateEnqueueRequest(workflowA));
        var idA = acceptedA.Workflows.Single().DatabaseId;

        var workflowB = _testHelpers.CreateWorkflow("b", [_testHelpers.CreateWebhookStep("/ping-b")], dependsOn: [idA]);
        var acceptedB = await _client.Enqueue(_testHelpers.CreateEnqueueRequest(workflowB));
        var idB = acceptedB.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(idA, PersistentItemStatus.Completed);
        await _client.WaitForWorkflowStatus(idB, PersistentItemStatus.Completed);
        await _client.WaitForWorkflowStatus(idC, PersistentItemStatus.Completed);

        var dependencyGraph = await _client.GetWorkflowDependencyGraph(idB);

        Assert.NotNull(dependencyGraph);
        Assert.Equal(idB, dependencyGraph.RootWorkflowId);

        var workflowIds = dependencyGraph.Workflows.Select(wf => wf.DatabaseId).ToHashSet();
        Assert.Equal(3, workflowIds.Count);
        Assert.Contains(idA, workflowIds);
        Assert.Contains(idB, workflowIds);
        Assert.Contains(idC, workflowIds);

        Assert.Contains(
            dependencyGraph.Edges,
            edge => edge.From == idA && edge.To == idB && edge.Kind == WorkflowDependencyGraphEdgeKind.Dependency
        );
        Assert.Contains(
            dependencyGraph.Edges,
            edge => edge.From == idA && edge.To == idC && edge.Kind == WorkflowDependencyGraphEdgeKind.Link
        );
        Assert.Equal(2, dependencyGraph.Edges.Count);

        using var rawResponse = await _client.GetWorkflowDependencyGraphRaw(idB);
        var body = await rawResponse.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    [Fact]
    public async Task Response_GetWorkflowDependencyGraph_WorkflowWithoutRelations_ReturnsRootOnlyWithNoEdges()
    {
        var accepted = await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("solo", [_testHelpers.CreateWebhookStep("/ping")])
            )
        );
        var workflowId = accepted.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        var dependencyGraph = await _client.GetWorkflowDependencyGraph(workflowId);

        Assert.NotNull(dependencyGraph);
        Assert.Equal(workflowId, dependencyGraph.RootWorkflowId);
        Assert.Single(dependencyGraph.Workflows);
        Assert.Equal(workflowId, dependencyGraph.Workflows[0].DatabaseId);
        Assert.Empty(dependencyGraph.Edges);

        using var rawResponse = await _client.GetWorkflowDependencyGraphRaw(workflowId);
        var body = await rawResponse.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    [Fact]
    public async Task Response_GetWorkflowDependencyGraph_DifferentNamespace_ReturnsNotFound()
    {
        // Workflow exists in namespace "ttd:other" but is queried via the default namespace.
        // Both the seed and the recursive arms of the CTE filter on namespace, so the response
        // must be 404 even though the workflow row exists.
        var accepted = await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("solo", [_testHelpers.CreateWebhookStep("/ping")])
            ),
            ns: "ttd:other"
        );
        var workflowId = accepted.Workflows.Single().DatabaseId;

        using var response = await _client.GetWorkflowDependencyGraphRaw(workflowId);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    // ── ListWorkflows endpoint responses ────────────────────────────────

    [Fact]
    public async Task Response_ListWorkflows_WhileProcessing_ReturnsWorkflowsShape()
    {
        // Arrange - slow WireMock so workflow stays active
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().WithPath("/slow").UsingGet())
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(5)));
        fixture.SetupDefaultStub();

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf-1", [_testHelpers.CreateWebhookStep("/slow")])
        );
        await _client.Enqueue(request);

        // Poll until the engine picks up the workflow and starts processing
        var deadline = DateTimeOffset.UtcNow.AddSeconds(5);
        List<WorkflowStatusResponse> active;
        do
        {
            active = await _client.ListActiveWorkflows();
            if (active.Exists(w => w.OverallStatus == PersistentItemStatus.Processing))
                break;
            await Task.Delay(50, TestContext.Current.CancellationToken);
        } while (DateTimeOffset.UtcNow < deadline);
        Assert.Contains(active, w => w.OverallStatus == PersistentItemStatus.Processing);

        // Act
        using var client = fixture.CreateEngineClient();
        using var response = await client.GetAsync(
            $"/api/v1/{Uri.EscapeDataString(EngineApiClient.DefaultNamespace)}/workflows",
            TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);

        var activeWorkflowId = active.Single(w => w.OverallStatus == PersistentItemStatus.Processing).DatabaseId;
        await _client.WaitForWorkflowStatus(activeWorkflowId, PersistentItemStatus.Completed);
    }

    [Fact]
    public async Task Response_ListWorkflows_NoWorkflows_Returns204()
    {
        using var client = fixture.CreateEngineClient();
        using var response = await client.GetAsync(
            $"/api/v1/{Uri.EscapeDataString(EngineApiClient.DefaultNamespace)}/workflows",
            TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
    }

    // ── Error response snapshots ────────────────────────────────────────────

    [Fact]
    public async Task Response_Enqueue_CycleDetection_Returns400WithDetails()
    {
        // A → B → A cycle
        var request = _testHelpers.CreateEnqueueRequest([
            _testHelpers.CreateWorkflow("a", [_testHelpers.CreateWebhookStep("/a")], dependsOn: ["b"]),
            _testHelpers.CreateWorkflow("b", [_testHelpers.CreateWebhookStep("/b")], dependsOn: ["a"]),
        ]);

        using var response = await _client.EnqueueRaw(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    [Fact]
    public async Task Response_Enqueue_SizeLimitExceeded_Returns400WithDetails()
    {
        // Create a workflow with too many steps (max is 50 per the test config)
        var steps = Enumerable.Range(1, 51).Select(i => _testHelpers.CreateWebhookStep($"/step-{i}")).ToList();
        var request = _testHelpers.CreateEnqueueRequest(_testHelpers.CreateWorkflow("wf", steps));

        using var response = await _client.EnqueueRaw(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    [Fact]
    public async Task Response_Enqueue_MaxWorkflowsExceeded_Returns400WithDetails()
    {
        // Create more workflows than allowed (max is 100 per the test config)
        var workflows = Enumerable
            .Range(1, 101)
            .Select(i => _testHelpers.CreateWorkflow($"wf-{i}", [_testHelpers.CreateWebhookStep($"/step-{i}")]))
            .ToList();
        var request = _testHelpers.CreateEnqueueRequest(workflows);

        using var response = await _client.EnqueueRaw(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    [Fact]
    public async Task Response_Enqueue_MaxWorkflowsAtLimit_Succeeds()
    {
        // Exactly at the limit (100) should succeed
        var workflows = Enumerable
            .Range(1, 100)
            .Select(i => _testHelpers.CreateWorkflow($"wf-{i}", [_testHelpers.CreateWebhookStep($"/step-{i}")]))
            .ToList();
        var request = _testHelpers.CreateEnqueueRequest(workflows);

        using var response = await _client.EnqueueRaw(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await WaitForAcceptedWorkflowsToComplete(body, TimeSpan.FromSeconds(90));
    }

    [Fact]
    public async Task Response_Enqueue_MaxLabelsExceeded_Returns400WithDetails()
    {
        // Create more labels than allowed (max is 50 per the test config)
        var labels = Enumerable.Range(1, 51).ToDictionary(i => $"key-{i}", i => $"value-{i}");
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/ping")])
        );
        request = request with { Labels = labels };

        using var response = await _client.EnqueueRaw(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    [Fact]
    public async Task Response_Enqueue_MaxLabelsAtLimit_Succeeds()
    {
        // Exactly at the limit (50) should succeed
        var labels = Enumerable.Range(1, 50).ToDictionary(i => $"key-{i}", i => $"value-{i}");
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/ping")])
        );
        request = request with { Labels = labels };

        using var response = await _client.EnqueueRaw(request);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await WaitForAcceptedWorkflowsToComplete(body);
    }

    [Fact]
    public async Task Response_Enqueue_StepLabelsExceedMax_Returns400WithDetails()
    {
        var stepLabels = Enumerable.Range(1, 51).ToDictionary(i => $"key-{i}", i => $"value-{i}");
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/ping", labels: stepLabels)])
        );

        using var response = await _client.EnqueueRaw(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    [Fact]
    public async Task Response_GetWorkflow_AfterRetries_ShowsRetryState()
    {
        // Arrange – WireMock returns 500 twice, then 200
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .InScenario("retry-snapshot")
            .WillSetStateTo("failed-once")
            .RespondWith(Response.Create().WithStatusCode(500));
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .InScenario("retry-snapshot")
            .WhenStateIs("failed-once")
            .WillSetStateTo("succeeded")
            .RespondWith(Response.Create().WithStatusCode(500));
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .InScenario("retry-snapshot")
            .WhenStateIs("succeeded")
            .RespondWith(Response.Create().WithStatusCode(200));

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/retry-target")])
        );
        var accepted = await _client.Enqueue(request);
        var workflowId = accepted.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Act
        using var response = await _client.GetWorkflowRaw(workflowId);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    // ── ListWorkflows endpoint responses ────────────────────────────────

    [Fact]
    public async Task Response_ListWorkflows_AfterCompletion_ReturnsCompletedWorkflowShape()
    {
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf-1", [_testHelpers.CreateWebhookStep("/ping")])
        );
        var accepted = await _client.Enqueue(request);
        var workflowId = accepted.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        using var client = fixture.CreateEngineClient();
        using var response = await client.GetAsync(
            $"/api/v1/{Uri.EscapeDataString(EngineApiClient.DefaultNamespace)}/workflows",
            TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        await VerifyJson(body);
    }

    private async Task WaitForAcceptedWorkflowsToComplete(string responseBody, TimeSpan? timeout = null)
    {
        var accepted = JsonSerializer.Deserialize<WorkflowEnqueueResponse.Accepted>(responseBody);
        Assert.NotNull(accepted);

        await _client.WaitForWorkflowStatus(
            accepted.Workflows.Select(workflow => workflow.DatabaseId),
            PersistentItemStatus.Completed,
            timeout ?? TimeSpan.FromSeconds(30)
        );
    }
}
