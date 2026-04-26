using System.Diagnostics;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Integration tests that verify OpenTelemetry counters, histograms, and activities
/// are emitted correctly during the full API → Engine → DB pipeline.
/// </summary>
[Collection(EngineAppCollection.Name)]
public sealed class TelemetryTests(EngineAppFixture<Program> fixture) : IAsyncLifetime
{
    private readonly EngineApiClient _client = new(fixture);
    private readonly TestHelpers _testHelpers = new(fixture);

    public async ValueTask InitializeAsync()
    {
        await fixture.Reset();
        await Task.Delay(50);
    }

    public async ValueTask DisposeAsync()
    {
        _client.Dispose();
        await Task.Delay(50);
    }

    [Fact]
    public async Task SingleWorkflow_EmitsExpectedCounters()
    {
        // Arrange
        using var collector = new TelemetryCollector();

        var request = _testHelpers.CreateEnqueueRequest([
            _testHelpers.CreateWorkflow("a", [_testHelpers.CreateWebhookStep("/cmd")]),
        ]);

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Wait for async telemetry to flush (histogram is recorded last in the update buffer)
        await collector.WaitForMeasurement("engine.workflows.time.total");

        // Assert counters — request lifecycle
        Assert.True(
            collector.GetCounterTotal("engine.workflows.request.received") >= 1,
            "Expected at least 1 WorkflowRequestsReceived"
        );
        Assert.True(
            collector.GetCounterTotal("engine.workflows.request.accepted") >= 1,
            "Expected at least 1 WorkflowRequestsAccepted"
        );
        Assert.True(
            collector.GetCounterTotal("engine.steps.request.accepted") >= 1,
            "Expected at least 1 StepRequestsAccepted"
        );

        // Assert counters — execution lifecycle
        Assert.True(
            collector.GetCounterTotal("engine.workflows.execution.success") >= 1,
            "Expected at least 1 WorkflowsSucceeded"
        );
        Assert.True(
            collector.GetCounterTotal("engine.steps.execution.success") >= 1,
            "Expected at least 1 StepsSucceeded"
        );

        // Assert counters — database operations
        Assert.True(
            collector.GetCounterTotal("engine.db.operations.success") >= 1,
            "Expected at least 1 DbOperationsSucceeded"
        );

        // Assert counters — main loop ran at least once
        Assert.True(
            collector.GetCounterTotal("engine.mainloop.iterations") >= 1,
            "Expected at least 1 EngineMainLoopIterations"
        );

        // Assert histograms — workflow timing
        Assert.True(collector.HasMeasurement("engine.workflows.time.total"), "Expected WorkflowTotalTime histogram");
        Assert.True(
            collector.HasMeasurement("engine.workflows.time.service"),
            "Expected WorkflowServiceTime histogram"
        );
        Assert.True(collector.HasMeasurement("engine.workflows.time.queue"), "Expected WorkflowQueueTime histogram");

        // Assert histograms — step timing
        Assert.True(collector.HasMeasurement("engine.steps.time.total"), "Expected StepTotalTime histogram");
        Assert.True(collector.HasMeasurement("engine.steps.time.service"), "Expected StepServiceTime histogram");
        Assert.True(collector.HasMeasurement("engine.steps.time.queue"), "Expected StepQueueTime histogram");

        // Assert histograms — main loop timing
        Assert.True(
            collector.HasMeasurement("engine.mainloop.time.total"),
            "Expected EngineMainLoopTotalTime histogram"
        );
    }

    [Fact]
    public async Task SingleWorkflow_EmitsExpectedActivityHierarchy()
    {
        // Arrange
        using var collector = new TelemetryCollector();

        var request = _testHelpers.CreateEnqueueRequest([
            _testHelpers.CreateWorkflow(
                "a",
                [_testHelpers.CreateWebhookStep("/cmd-1"), _testHelpers.CreateWebhookStep("/cmd-2")]
            ),
        ]);

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Wait for the last span in the processing pipeline
        await collector.WaitForActivities("WorkflowUpdateBuffer.FlushBatch");

        // === Enqueue phase ===
        Assert.NotEmpty(collector.GetActivities("WorkflowWriteBuffer.FlushBatch"));
        Assert.NotEmpty(collector.GetActivities("ValidationUtils.ValidateAndSortWorkflowGraph"));
        Assert.NotEmpty(collector.GetActivities("EngineRepository.BatchEnqueueWorkflows"));

        // === Processing phase ===
        Assert.NotEmpty(collector.GetActivities("WorkflowHandler.Handle"));

        var processStepActivities = collector.GetActivitiesStartingWith("WorkflowHandler.ProcessStep");
        Assert.True(
            processStepActivities.Count >= 2,
            $"Expected at least 2 ProcessStep activities, got {processStepActivities.Count}"
        );

        // === Executor phase ===
        var executorActivities = collector.GetActivities("WorkflowExecutor.Execute");
        Assert.True(
            executorActivities.Count >= 2,
            $"Expected at least 2 WorkflowExecutor.Execute activities, got {executorActivities.Count}"
        );

        var webhookActivities = collector.GetActivities("WebhookCommand.Execute");
        Assert.True(
            webhookActivities.Count >= 2,
            $"Expected at least 2 WebhookCommand.Execute activities, got {webhookActivities.Count}"
        );

        var httpSlotAcquireActivities = collector.GetActivities("ConcurrencyLimiter.AcquireHttpSlot");
        Assert.True(
            httpSlotAcquireActivities.Count >= 2,
            $"Expected at least 2 ConcurrencyLimiter.AcquireHttpSlot activities, got {httpSlotAcquireActivities.Count}"
        );
        var httpSlotReleaseActivities = collector.GetActivities("ConcurrencyLimiter.ReleaseHttpSlot");
        Assert.True(
            httpSlotReleaseActivities.Count >= 2,
            $"Expected at least 2 ConcurrencyLimiter.ReleaseHttpSlot activities, got {httpSlotReleaseActivities.Count}"
        );

        // === Status write phase ===
        Assert.NotEmpty(collector.GetActivities("WorkflowUpdateBuffer.SubmitAndForget"));
        Assert.NotEmpty(collector.GetActivities("WorkflowUpdateBuffer.Submit"));
        Assert.NotEmpty(collector.GetActivities("WorkflowUpdateBuffer.FlushBatch"));
        Assert.NotEmpty(collector.GetActivities("EngineRepository.BatchUpdateWorkflowsAndSteps"));
    }

    [Fact]
    public async Task FailedWorkflow_EmitsFailureCounters()
    {
        // Arrange — WireMock always returns 500 → step exhausts retries → Failed
        using var collector = new TelemetryCollector();

        fixture.WireMock.Reset();
        fixture.WireMock.Given(Request.Create().UsingAnyMethod()).RespondWith(Response.Create().WithStatusCode(500));

        var request = _testHelpers.CreateEnqueueRequest([
            _testHelpers.CreateWorkflow("a", [_testHelpers.CreateWebhookStep("/cmd")]),
        ]);

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Failed);

        // Wait for async telemetry to flush
        await collector.WaitForMeasurement("engine.workflows.time.total");

        // Assert failure counters — step retries before permanent failure
        Assert.True(
            collector.GetCounterTotal("engine.steps.execution.requeued") >= 1,
            "Expected at least 1 StepsRequeued"
        );
        Assert.True(collector.GetCounterTotal("engine.steps.execution.failed") >= 1, "Expected at least 1 StepsFailed");
        Assert.True(
            collector.GetCounterTotal("engine.workflows.execution.failed") >= 1,
            "Expected at least 1 WorkflowsFailed"
        );

        // Assert the request-level counters still fire even for failed workflows
        Assert.True(
            collector.GetCounterTotal("engine.workflows.request.received") >= 1,
            "Expected WorkflowRequestsReceived even for failed workflows"
        );
        Assert.True(
            collector.GetCounterTotal("engine.workflows.request.accepted") >= 1,
            "Expected WorkflowRequestsAccepted even for failed workflows"
        );

        // Assert histograms still recorded for failed workflows
        Assert.True(
            collector.HasMeasurement("engine.steps.time.service"),
            "Expected StepServiceTime histogram for failed workflow"
        );
        Assert.True(
            collector.HasMeasurement("engine.steps.time.total"),
            "Expected StepTotalTime histogram for failed workflow"
        );
    }

    [Fact]
    public async Task QueryEndpoints_EmitQueryCounters()
    {
        // Arrange — enqueue and complete a workflow so the DB has data
        using var collector = new TelemetryCollector();

        var request = _testHelpers.CreateEnqueueRequest([
            _testHelpers.CreateWorkflow("a", [_testHelpers.CreateWebhookStep("/cmd")]),
        ]);

        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Reset collector so we only capture query-related telemetry
        while (collector.Measurements.TryTake(out _))
        {
            // Drain previous measurements
        }

        // Act — call both query endpoints
        await _client.ListActiveWorkflows();
        await _client.GetWorkflow(workflowId);

        // Wait for both query counter increments (list + get)
        await collector.WaitForCounterTotal("engine.workflows.query.received", 2);

        // Assert query counters
        Assert.True(
            collector.GetCounterTotal("engine.workflows.query.received") >= 2,
            "Expected at least 2 WorkflowQueriesReceived (one for list, one for get)"
        );

        // Assert repository activities for query operations
        Assert.NotEmpty(collector.GetActivities("EngineRepository.GetActiveWorkflows"));
        Assert.NotEmpty(collector.GetActivities("EngineRepository.GetWorkflow"));
    }

    /// <summary>
    /// Verifies the distributed trace hierarchy and cross-trace links for a single workflow.
    /// <para>
    /// The engine produces multiple traces per workflow lifecycle. Validation runs in
    /// the HTTP request context. The write buffer flushes in standalone background traces.
    /// Processing starts a new root trace that links back to the original request:
    /// </para>
    /// <code>
    /// Trace A — HTTP request:
    ///   ValidationUtils.ValidateAndSortWorkflowGraph   (child of HTTP server span)
    ///
    /// Background — Write buffer (standalone traces):
    ///   Engine.FlushBatch
    ///     └── EngineRepository.BatchEnqueueWorkflows
    ///
    /// Trace B — Processing (new root, linked → Trace A):
    ///   Engine.ProcessWorkflow
    ///     ├── Engine.ProcessStep.{operationId}
    ///     │     └── WorkflowExecutor.Execute
    ///     │           └── WebhookCommand.Execute
    ///     ├── Engine.SubmitAndForget     (step → Processing, fire-and-forget)
    ///     ├── Engine.SubmitStatusUpdate  (step done)
    ///     └── Engine.SubmitStatusUpdate  (workflow done)
    ///
    /// Background — Status write buffer (standalone traces):
    ///   Engine.FlushStatusBatch
    ///     └── EngineRepository.BatchUpdateWorkflowsAndSteps
    /// </code>
    /// </summary>
    [Fact]
    public async Task SingleWorkflow_SpanHierarchyAndLinks()
    {
        // Arrange — single workflow with one step keeps the hierarchy unambiguous
        using var collector = new TelemetryCollector();

        var request = _testHelpers.CreateEnqueueRequest([
            _testHelpers.CreateWorkflow("a", [_testHelpers.CreateWebhookStep("/cmd")]),
        ]);

        // Act
        var response = await _client.Enqueue(request);
        var workflowId = response.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        // Wait for the last span in the processing pipeline
        await collector.WaitForActivities("WorkflowUpdateBuffer.FlushBatch");

        // Resolve key span instances — filter by workflow ID tag to avoid
        // picking up activities from concurrent tests in other collections
        var processWorkflow = SingleForWorkflow(collector, "WorkflowHandler.Handle", workflowId);

        // ───────────────────────────────────────────────────────────
        // Cross-trace link: ProcessWorkflow is a new root that links
        // back to the HTTP request trace (captured during enqueue)
        // ───────────────────────────────────────────────────────────
        Assert.Equal(default, processWorkflow.ParentSpanId);

        _ = Assert.Single(processWorkflow.Links);

        // ───────────────────────────────────────────────────────────
        // Trace B — Processing tree (new root trace)
        // ───────────────────────────────────────────────────────────

        //   Engine.ProcessWorkflow
        //     ├── Engine.ProcessStep.{operationId}
        var processStep = SingleStartingWith(collector, processWorkflow.TraceId, "WorkflowHandler.ProcessStep");
        AssertChildOf(processWorkflow, processStep);

        //     │     └── WorkflowExecutor.Execute
        var execute = SingleInTrace(collector, processWorkflow.TraceId, "WorkflowExecutor.Execute");
        AssertChildOf(processStep, execute);

        //     │           └── WebhookCommand.Execute
        var webhookCommand = SingleInTrace(collector, processWorkflow.TraceId, "WebhookCommand.Execute");
        AssertChildOf(execute, webhookCommand);

        //     │     ├── WorkflowUpdateBuffer.SubmitAndForget [step.started — fire-and-forget]
        //     │     └── WorkflowUpdateBuffer.Submit [step.completed]
        //     └── WorkflowUpdateBuffer.Submit [workflow.completed]
        var submitAndForgets = collector
            .GetActivities("WorkflowUpdateBuffer.SubmitAndForget")
            .Where(a => a.TraceId == processWorkflow.TraceId)
            .ToList();
        Assert.Single(submitAndForgets);
        Assert.Equal(processStep.SpanId, submitAndForgets[0].ParentSpanId);

        var submitStatuses = collector
            .GetActivities("WorkflowUpdateBuffer.Submit")
            .Where(a => a.TraceId == processWorkflow.TraceId)
            .ToList();
        Assert.Equal(2, submitStatuses.Count);

        var stepSubmits = submitStatuses.Where(s => s.ParentSpanId == processStep.SpanId).ToList();
        var workflowSubmits = submitStatuses.Where(s => s.ParentSpanId == processWorkflow.SpanId).ToList();
        Assert.Single(stepSubmits);
        Assert.Single(workflowSubmits);

        // ───────────────────────────────────────────────────────────
        // Standalone background activities (exist but not in workflow traces)
        // ───────────────────────────────────────────────────────────
        Assert.NotEmpty(collector.GetActivities("WorkflowWriteBuffer.FlushBatch"));
        Assert.NotEmpty(collector.GetActivities("EngineRepository.BatchEnqueueWorkflows"));
        Assert.NotEmpty(collector.GetActivities("WorkflowUpdateBuffer.FlushBatch"));
        Assert.NotEmpty(collector.GetActivities("EngineRepository.BatchUpdateWorkflowsAndSteps"));
    }

    // ─── Span hierarchy helpers ────────────────────────────────────

    /// <summary>Asserts that <paramref name="child"/> is a direct child of <paramref name="parent"/>.</summary>
    private static void AssertChildOf(Activity parent, Activity child)
    {
        Assert.Equal(parent.TraceId, child.TraceId);
        Assert.Equal(parent.SpanId, child.ParentSpanId);
    }

    /// <summary>
    /// Returns the single activity matching <paramref name="operationName"/> that has a
    /// <c>workflow.database.id</c> tag equal to <paramref name="workflowId"/>.
    /// Filters by workflow to avoid picking up activities from concurrent tests.
    /// </summary>
    private static Activity SingleForWorkflow(TelemetryCollector collector, string operationName, Guid workflowId)
    {
        var matches = collector
            .GetActivities(operationName)
            .Where(a => a.GetTagItem("workflow.database.id") is Guid id && id == workflowId)
            .ToList();
        Assert.True(
            matches.Count == 1,
            $"Expected exactly 1 '{operationName}' for workflow {workflowId}, got {matches.Count}"
        );
        return matches[0];
    }

    /// <summary>Returns the single activity matching <paramref name="operationName"/> within the given trace.</summary>
    private static Activity SingleInTrace(TelemetryCollector collector, ActivityTraceId traceId, string operationName)
    {
        var matches = collector.GetActivities(operationName).Where(a => a.TraceId == traceId).ToList();
        Assert.True(
            matches.Count == 1,
            $"Expected exactly 1 '{operationName}' in trace {traceId}, got {matches.Count}"
        );
        return matches[0];
    }

    /// <summary>Returns the single activity whose name starts with <paramref name="prefix"/> within the given trace.</summary>
    private static Activity SingleStartingWith(TelemetryCollector collector, ActivityTraceId traceId, string prefix)
    {
        var matches = collector.GetActivitiesStartingWith(prefix).Where(a => a.TraceId == traceId).ToList();
        Assert.True(
            matches.Count == 1,
            $"Expected exactly 1 activity starting with '{prefix}' in trace {traceId}, got {matches.Count}"
        );
        return matches[0];
    }
}
