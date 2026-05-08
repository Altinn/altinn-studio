using System.Net;
using System.Text;
using System.Text.Json;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;
using WorkflowEngine.TestKit;

// CA1305: StringBuilder interpolation locale — plaintext HTTP output, not locale-sensitive
#pragma warning disable CA1305

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Documents the inbound payload contract for the enqueue and dependency-graph endpoints
/// via plain-text <c>.http</c> snapshot files. Each test enqueues a real payload,
/// asserts the resulting behavior, and pins the wire format under
/// <c>tests/WorkflowEngine.Integration.Tests/.snapshots/inbound/</c>.
/// </summary>
public partial class EngineTests
{
    // ── Multi-workflow batches ──────────────────────────────────────────────

    [Fact]
    public async Task Inbound_MultiWorkflow_DependsOn_RefsOnly()
    {
        // Arrange — fan-out / fan-in shape: wf-a → {wf-b, wf-c}, wf-c also depends on wf-b
        var wfA = _testHelpers.CreateWorkflow("wf-a", [_testHelpers.CreateWebhookStep("/ping-a")]);
        var wfB = _testHelpers.CreateWorkflow("wf-b", [_testHelpers.CreateWebhookStep("/ping-b")], dependsOn: ["wf-a"]);
        var wfC = _testHelpers.CreateWorkflow(
            "wf-c",
            [_testHelpers.CreateWebhookStep("/ping-c")],
            dependsOn: ["wf-a", "wf-b"]
        );
        var request = _testHelpers.CreateEnqueueRequest([wfA, wfB, wfC], includeContext: false);

        // Act
        var (recorder, accepted) = await EnqueueAndCapture(request);

        // Assert — payload pinned + behavior
        Assert.Equal(3, accepted.Workflows.Count);
        await PersistInboundSnapshot(recorder, "Inbound_MultiWorkflow_DependsOn_RefsOnly");
        await _client.WaitForWorkflowStatus(
            accepted.Workflows.Select(w => w.DatabaseId),
            PersistentItemStatus.Completed
        );
    }

    [Fact]
    public async Task Inbound_MultiWorkflow_DependsOn_MixedRefs()
    {
        // Arrange — first batch persists wf-existing, then a second batch references it by GUID
        // alongside a fresh in-batch ref. Captures ["ref-a", "<guid>", "ref-b"] mixing.
        var bootstrap = await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf-existing", [_testHelpers.CreateWebhookStep("/ping-existing")]),
                includeContext: false
            )
        );
        var existingId = bootstrap.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(existingId, PersistentItemStatus.Completed);

        var wfA = _testHelpers.CreateWorkflow("wf-a", [_testHelpers.CreateWebhookStep("/ping-a")]);
        var wfB = _testHelpers.CreateWorkflow(
            "wf-b",
            [_testHelpers.CreateWebhookStep("/ping-b")],
            dependsOn: ["wf-a", existingId, (WorkflowRef)"wf-c"]
        );
        var wfC = _testHelpers.CreateWorkflow("wf-c", [_testHelpers.CreateWebhookStep("/ping-c")]);
        var request = _testHelpers.CreateEnqueueRequest([wfA, wfB, wfC], includeContext: false);

        // Act
        var (recorder, accepted) = await EnqueueAndCapture(request);

        // Assert
        Assert.Equal(3, accepted.Workflows.Count);
        await PersistInboundSnapshot(recorder, "Inbound_MultiWorkflow_DependsOn_MixedRefs");
        await _client.WaitForWorkflowStatus(
            accepted.Workflows.Select(w => w.DatabaseId),
            PersistentItemStatus.Completed
        );
    }

    [Fact]
    public async Task Inbound_Workflow_WithLinks()
    {
        // Arrange — wf-main depends on wf-up and is soft-linked to wf-side (no execution dependency)
        var wfUp = _testHelpers.CreateWorkflow("wf-up", [_testHelpers.CreateWebhookStep("/ping-up")]);
        var wfSide = _testHelpers.CreateWorkflow("wf-side", [_testHelpers.CreateWebhookStep("/ping-side")]);
        var wfMain = _testHelpers.CreateWorkflow(
            "wf-main",
            [_testHelpers.CreateWebhookStep("/ping-main")],
            dependsOn: ["wf-up"]
        ) with
        {
            Links = [(WorkflowRef)"wf-side"],
        };
        var request = _testHelpers.CreateEnqueueRequest([wfUp, wfSide, wfMain], includeContext: false);

        // Act
        var (recorder, accepted) = await EnqueueAndCapture(request);

        // Assert
        Assert.Equal(3, accepted.Workflows.Count);
        await PersistInboundSnapshot(recorder, "Inbound_Workflow_WithLinks");
        await _client.WaitForWorkflowStatus(
            accepted.Workflows.Select(w => w.DatabaseId),
            PersistentItemStatus.Completed
        );
    }

    [Fact]
    public async Task Inbound_Workflow_FullyPopulated()
    {
        // Arrange — every optional field set: batch labels + context, workflow startAt + state,
        // step retryStrategy + step labels.
        var step = _testHelpers.CreateWebhookStep(
            "/ping-full",
            payload: """{"hello":"world"}""",
            contentType: "application/json",
            retryStrategy: RetryStrategy.Exponential(
                baseInterval: TimeSpan.FromSeconds(1),
                maxRetries: 5,
                maxDelay: TimeSpan.FromSeconds(30),
                maxDuration: TimeSpan.FromMinutes(5)
            ),
            labels: new Dictionary<string, string> { ["env"] = "test", ["tier"] = "frontend" }
        );
        var workflow = _testHelpers.CreateWorkflow("wf-full", [step]) with
        {
            StartAt = DateTimeOffset.Parse(
                "2099-06-01T08:00:00+00:00",
                System.Globalization.CultureInfo.InvariantCulture
            ),
            State = """{"initial":"state"}""",
        };
        var request = new WorkflowEnqueueRequest
        {
            Labels = new Dictionary<string, string>
            {
                ["org"] = EngineAppFixture.DefaultOrg,
                ["app"] = EngineAppFixture.DefaultApp,
                ["tenant"] = "example-tenant",
            },
            Context = JsonSerializer.SerializeToElement(
                new
                {
                    Org = EngineAppFixture.DefaultOrg,
                    App = EngineAppFixture.DefaultApp,
                    Actor = "alice",
                }
            ),
            Workflows = [workflow],
        };

        // Act
        var (recorder, accepted) = await EnqueueAndCapture(request);

        // Assert — payload pinned. Don't wait for completion: StartAt is in the future.
        Assert.Single(accepted.Workflows);
        await PersistInboundSnapshot(recorder, "Inbound_Workflow_FullyPopulated");
    }

    // ── Collection head controls ────────────────────────────────────────────

    [Fact]
    public async Task Inbound_Workflow_DependsOnHeadsFalse()
    {
        // Arrange — bootstrap an existing head into the collection so the request payload's
        // `dependsOnHeads: false` opt-out has something concrete to opt out of.
        const string collectionKey = "head-ctrl-deps-on-heads-false";
        var bootstrap = await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf-existing-head", [_testHelpers.CreateWebhookStep("/ping-existing")]),
                includeContext: false
            ),
            collectionKey: collectionKey
        );
        await _client.WaitForWorkflowStatus(bootstrap.Workflows.Single().DatabaseId, PersistentItemStatus.Completed);

        var workflow = _testHelpers.CreateWorkflow("wf-orphan", [_testHelpers.CreateWebhookStep("/ping-orphan")]) with
        {
            DependsOnHeads = false,
        };
        var request = _testHelpers.CreateEnqueueRequest(workflow, includeContext: false);

        // Act
        var (recorder, accepted) = await EnqueueAndCapture(request, collectionKey: collectionKey);

        // Assert
        Assert.Single(accepted.Workflows);
        await PersistInboundSnapshot(recorder, "Inbound_Workflow_DependsOnHeadsFalse");
        await _client.WaitForWorkflowStatus(
            accepted.Workflows.Select(w => w.DatabaseId),
            PersistentItemStatus.Completed
        );
    }

    [Fact]
    public async Task Inbound_Workflow_IsHeadForceInclude()
    {
        // Arrange — A → B chain with `isHead: true` on the non-leaf A. Without the override,
        // only B (the leaf) would be a head; with it, both A and B end up in the collection's head set.
        const string collectionKey = "head-ctrl-is-head-include";
        var wfA = _testHelpers.CreateWorkflow("wf-a", [_testHelpers.CreateWebhookStep("/ping-a")]) with
        {
            IsHead = true,
        };
        var wfB = _testHelpers.CreateWorkflow("wf-b", [_testHelpers.CreateWebhookStep("/ping-b")], dependsOn: ["wf-a"]);
        var request = _testHelpers.CreateEnqueueRequest([wfA, wfB], includeContext: false);

        // Act
        var (recorder, accepted) = await EnqueueAndCapture(request, collectionKey: collectionKey);

        // Assert
        Assert.Equal(2, accepted.Workflows.Count);
        await PersistInboundSnapshot(recorder, "Inbound_Workflow_IsHeadForceInclude");
        await _client.WaitForWorkflowStatus(
            accepted.Workflows.Select(w => w.DatabaseId),
            PersistentItemStatus.Completed
        );
    }

    [Fact]
    public async Task Inbound_Workflow_IsHeadForceExclude()
    {
        // Arrange — single workflow with `isHead: false`. Without the override it would naturally
        // be a head (it's a leaf); with it the workflow runs but stays invisible to head tracking.
        const string collectionKey = "head-ctrl-is-head-exclude";
        var workflow = _testHelpers.CreateWorkflow("wf-shadow", [_testHelpers.CreateWebhookStep("/ping-shadow")]) with
        {
            IsHead = false,
        };
        var request = _testHelpers.CreateEnqueueRequest(workflow, includeContext: false);

        // Act
        var (recorder, accepted) = await EnqueueAndCapture(request, collectionKey: collectionKey);

        // Assert
        Assert.Single(accepted.Workflows);
        await PersistInboundSnapshot(recorder, "Inbound_Workflow_IsHeadForceExclude");
        await _client.WaitForWorkflowStatus(
            accepted.Workflows.Select(w => w.DatabaseId),
            PersistentItemStatus.Completed
        );
    }

    // ── Validation 400s (full exchange) ──────────────────────────────────────

    [Fact]
    public async Task Inbound_Validation_CycleDetected()
    {
        // Arrange — A → B → A
        var wfA = _testHelpers.CreateWorkflow("wf-a", [_testHelpers.CreateWebhookStep("/ping-a")], dependsOn: ["wf-b"]);
        var wfB = _testHelpers.CreateWorkflow("wf-b", [_testHelpers.CreateWebhookStep("/ping-b")], dependsOn: ["wf-a"]);
        var request = _testHelpers.CreateEnqueueRequest([wfA, wfB], includeContext: false);

        // Act + Assert
        await CaptureValidationFailure(request, "Inbound_Validation_CycleDetected");
    }

    [Fact]
    public async Task Inbound_Validation_DuplicateRef()
    {
        // Arrange — two workflows declaring the same ref
        var wfA1 = _testHelpers.CreateWorkflow("wf-dup", [_testHelpers.CreateWebhookStep("/ping-1")]);
        var wfA2 = _testHelpers.CreateWorkflow("wf-dup", [_testHelpers.CreateWebhookStep("/ping-2")]);
        var request = _testHelpers.CreateEnqueueRequest([wfA1, wfA2], includeContext: false);

        // Act + Assert
        await CaptureValidationFailure(request, "Inbound_Validation_DuplicateRef");
    }

    [Fact]
    public async Task Inbound_Validation_MissingRef()
    {
        // Arrange — dependsOn references a ref that's not in the batch and not a GUID
        var wfA = _testHelpers.CreateWorkflow(
            "wf-a",
            [_testHelpers.CreateWebhookStep("/ping-a")],
            dependsOn: ["wf-nonexistent"]
        );
        var request = _testHelpers.CreateEnqueueRequest(wfA, includeContext: false);

        // Act + Assert
        await CaptureValidationFailure(request, "Inbound_Validation_MissingRef");
    }

    [Fact]
    public async Task Inbound_Validation_SelfReference()
    {
        // Arrange — wf-a's DependsOn includes its own ref
        var wfA = _testHelpers.CreateWorkflow("wf-a", [_testHelpers.CreateWebhookStep("/ping-a")], dependsOn: ["wf-a"]);
        var request = _testHelpers.CreateEnqueueRequest(wfA, includeContext: false);

        // Act + Assert
        await CaptureValidationFailure(request, "Inbound_Validation_SelfReference");
    }

    // ── DAG roundtrip (enqueue + hierarchy GET in one file) ──────────────────

    [Fact]
    public async Task DagRoundtrip_AllRelations_FullExchange()
    {
        // Arrange — bootstrap an out-of-batch workflow so it can be referenced by
        // GUID from both `dependsOn` and `links` in the main batch.
        var bootstrap = await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf-existing", [_testHelpers.CreateWebhookStep("/ping-existing")]),
                includeContext: false
            )
        );
        var existingId = bootstrap.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(existingId, PersistentItemStatus.Completed);

        // Main batch — exercises everything in one shot:
        //   • chain depth (wf-up ← wf-mid ← wf-down) so the hierarchy walks transitively
        //   • multi-target `dependsOn` mixing in-batch ref + pre-existing GUID
        //   • multi-target `links`     mixing in-batch ref + pre-existing GUID
        //   • a pure soft-link target (wf-side) that should appear in `links`
        //     but NOT be pulled into the response `workflows[]` array
        var wfUp = _testHelpers.CreateWorkflow("wf-up", [_testHelpers.CreateWebhookStep("/ping-up")]);
        var wfSide = _testHelpers.CreateWorkflow("wf-side", [_testHelpers.CreateWebhookStep("/ping-side")]);
        var wfMid = _testHelpers.CreateWorkflow(
            "wf-mid",
            [_testHelpers.CreateWebhookStep("/ping-mid")],
            dependsOn: [(WorkflowRef)"wf-up", existingId]
        ) with
        {
            Links = [(WorkflowRef)"wf-side", existingId],
        };
        var wfDown = _testHelpers.CreateWorkflow(
            "wf-down",
            [_testHelpers.CreateWebhookStep("/ping-down")],
            dependsOn: ["wf-mid"]
        );
        var request = _testHelpers.CreateEnqueueRequest([wfUp, wfSide, wfMid, wfDown], includeContext: false);

        await CaptureDagRoundtrip(request, "wf-up", "DagRoundtrip_AllRelations_FullExchange");
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private async Task<(HttpExchangeRecorder Recorder, WorkflowEnqueueResponse.Accepted Accepted)> EnqueueAndCapture(
        WorkflowEnqueueRequest request,
        string? collectionKey = null
    )
    {
        var recorder = new HttpExchangeRecorder();
        using var client = new EngineApiClient(fixture, recorder);
        var accepted = await client.Enqueue(request, collectionKey: collectionKey);
        return (recorder, accepted);
    }

    private async Task CaptureValidationFailure(WorkflowEnqueueRequest request, string snapshotName)
    {
        var recorder = new HttpExchangeRecorder();
        using var client = new EngineApiClient(fixture, recorder);
        using var response = await client.EnqueueRaw(request);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        var http = new StringBuilder();
        HttpChatterHelpers.WriteExchange(http, recorder.Exchanges.Single());
        await HttpChatterHelpers.PersistSnapshot(
            http.ToString(),
            $"inbound/{snapshotName}.exchange.http",
            TestContext.Current.CancellationToken
        );
    }

    private async Task CaptureDagRoundtrip(WorkflowEnqueueRequest request, string rootRef, string snapshotName)
    {
        // Single client + recorder spans both calls so the enqueue and hierarchy exchanges
        // share the same Guid_N counter — one file documents both halves coherently.
        var recorder = new HttpExchangeRecorder();
        using var client = new EngineApiClient(fixture, recorder);

        var accepted = await client.Enqueue(request);
        var rootId = accepted.Workflows.Single(w => w.Ref == rootRef).DatabaseId;
        await client.WaitForWorkflowStatus(
            accepted.Workflows.Select(w => w.DatabaseId),
            PersistentItemStatus.Completed
        );

        using var hierarchyResponse = await client.GetWorkflowDependencyGraphRaw(rootId);
        Assert.Equal(HttpStatusCode.OK, hierarchyResponse.StatusCode);

        await PersistDagRoundtripSnapshot(recorder, snapshotName);
    }

    private static async Task PersistInboundSnapshot(HttpExchangeRecorder recorder, string snapshotName)
    {
        var http = new StringBuilder();
        HttpChatterHelpers.WriteInboundRequest(http, recorder.Exchanges.Single());
        await HttpChatterHelpers.PersistSnapshot(
            http.ToString(),
            $"inbound/{snapshotName}.inbound.http",
            TestContext.Current.CancellationToken
        );
    }

    private static async Task PersistDagRoundtripSnapshot(HttpExchangeRecorder recorder, string snapshotName)
    {
        var enqueue = recorder.Exchanges.First(e => e.Request.Method == HttpMethod.Post);
        var dependencyGraph = recorder.Exchanges.First(e =>
            e.Request.Method == HttpMethod.Get
            && e.Request.RequestUri?.PathAndQuery.Contains("/dependency-graph", StringComparison.Ordinal) == true
        );

        var http = new StringBuilder();
        http.AppendLine("###");
        http.AppendLine("### 1. Client → Engine: Enqueue workflow batch");
        http.AppendLine("###");
        http.AppendLine();
        HttpChatterHelpers.WriteExchange(http, enqueue);

        http.AppendLine();
        http.AppendLine("###");
        http.AppendLine("### 2. Client → Engine: Get workflow dependency graph");
        http.AppendLine("###");
        http.AppendLine();
        HttpChatterHelpers.WriteExchange(http, dependencyGraph);

        await HttpChatterHelpers.PersistSnapshot(
            http.ToString(),
            $"inbound/{snapshotName}.exchange.http",
            TestContext.Current.CancellationToken
        );
    }
}
