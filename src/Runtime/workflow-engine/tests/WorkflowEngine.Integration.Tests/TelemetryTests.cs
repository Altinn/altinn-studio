using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Data.Services;
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
        await collector.WaitForMeasurement("altinn.workflow_engine.workflow.duration");

        // Assert counters — request lifecycle
        Assert.True(
            collector.GetCounterTotal("altinn.workflow_engine.workflow.request.received") >= 1,
            "Expected at least 1 WorkflowRequestsReceived"
        );
        Assert.True(
            collector.GetCounterTotal("altinn.workflow_engine.workflow.request.accepted") >= 1,
            "Expected at least 1 WorkflowRequestsAccepted"
        );
        Assert.True(
            collector.GetCounterTotal("altinn.workflow_engine.step.request.accepted") >= 1,
            "Expected at least 1 StepRequestsAccepted"
        );

        // Assert counters — execution lifecycle
        Assert.True(
            collector.GetCounterTotal("altinn.workflow_engine.workflow.execution.success") >= 1,
            "Expected at least 1 WorkflowsSucceeded"
        );
        Assert.True(
            collector.GetCounterTotal("altinn.workflow_engine.step.execution.success") >= 1,
            "Expected at least 1 StepsSucceeded"
        );

        // Assert counters — database operations
        Assert.True(
            collector.GetCounterTotal("altinn.workflow_engine.db.operation.success") >= 1,
            "Expected at least 1 DbOperationsSucceeded"
        );

        // Assert counters — main loop ran at least once
        Assert.True(
            collector.GetCounterTotal("altinn.workflow_engine.main_loop.iterations") >= 1,
            "Expected at least 1 EngineMainLoopIterations"
        );

        // Assert histograms — workflow timing
        Assert.True(
            collector.HasMeasurement("altinn.workflow_engine.workflow.duration"),
            "Expected WorkflowTotalTime histogram"
        );
        Assert.True(
            collector.HasMeasurement("altinn.workflow_engine.workflow.processing.duration"),
            "Expected WorkflowServiceTime histogram"
        );
        Assert.True(
            collector.HasMeasurement("altinn.workflow_engine.workflow.queue.duration"),
            "Expected WorkflowQueueTime histogram"
        );

        // Assert histograms — step timing
        Assert.True(
            collector.HasMeasurement("altinn.workflow_engine.step.duration"),
            "Expected StepTotalTime histogram"
        );
        Assert.True(
            collector.HasMeasurement("altinn.workflow_engine.step.processing.duration"),
            "Expected StepServiceTime histogram"
        );
        Assert.True(
            collector.HasMeasurement("altinn.workflow_engine.step.queue.duration"),
            "Expected StepQueueTime histogram"
        );

        // Assert histograms — main loop timing
        Assert.True(
            collector.HasMeasurement("altinn.workflow_engine.main_loop.duration"),
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
        Assert.NotEmpty(collector.GetActivities("ValidationUtils.ValidateWorkflowGraph"));
        Assert.NotEmpty(collector.GetActivities("EngineRepository.BatchEnqueueWorkflows"));

        // === Processing phase ===
        Assert.NotEmpty(collector.GetActivities("WorkflowHandler.Handle"));

        var processStepActivities = collector.GetActivities("WorkflowHandler.ProcessStep");
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
        await collector.WaitForMeasurement("altinn.workflow_engine.workflow.duration");

        // Assert failure counters — step retries before permanent failure
        Assert.True(
            collector.GetCounterTotal("altinn.workflow_engine.step.execution.requeued") >= 1,
            "Expected at least 1 StepsRequeued"
        );
        Assert.True(
            collector.GetCounterTotal("altinn.workflow_engine.step.execution.failed") >= 1,
            "Expected at least 1 StepsFailed"
        );
        Assert.True(
            collector.GetCounterTotal("altinn.workflow_engine.workflow.execution.failed") >= 1,
            "Expected at least 1 WorkflowsFailed"
        );

        // Assert the request-level counters still fire even for failed workflows
        Assert.True(
            collector.GetCounterTotal("altinn.workflow_engine.workflow.request.received") >= 1,
            "Expected WorkflowRequestsReceived even for failed workflows"
        );
        Assert.True(
            collector.GetCounterTotal("altinn.workflow_engine.workflow.request.accepted") >= 1,
            "Expected WorkflowRequestsAccepted even for failed workflows"
        );

        // Assert histograms still recorded for failed workflows
        Assert.True(
            collector.HasMeasurement("altinn.workflow_engine.step.processing.duration"),
            "Expected StepServiceTime histogram for failed workflow"
        );
        Assert.True(
            collector.HasMeasurement("altinn.workflow_engine.step.duration"),
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
        await collector.WaitForCounterTotal("altinn.workflow_engine.workflow.query.received", 2);

        // Assert query counters
        Assert.True(
            collector.GetCounterTotal("altinn.workflow_engine.workflow.query.received") >= 2,
            "Expected at least 2 WorkflowQueriesReceived (one for list, one for get)"
        );
        var endpoints = collector
            .GetMeasurements("altinn.workflow_engine.workflow.query.received")
            .Select(m => Assert.Single(m.Tags, t => t.Key == "altinn.workflow_engine.endpoint").Value)
            .ToList();
        Assert.Contains("list", endpoints);
        Assert.Contains("get", endpoints);

        // Assert repository activities for query operations
        Assert.NotEmpty(collector.GetActivities("EngineRepository.QueryWorkflows"));
        Assert.NotEmpty(collector.GetActivities("EngineRepository.GetWorkflow"));
    }

    [Fact]
    public async Task SingleWorkflow_DurationHistograms_CarryOnlyBoundedAttributes()
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
        await collector.WaitForMeasurement("altinn.workflow_engine.workflow.duration");

        // Assert — the collector sees every host in the process, so this holds for every measurement, not
        // only this workflow's: no ID, and nothing an app builds, ever reaches these series
        string[] workflowHistograms =
        [
            "altinn.workflow_engine.workflow.queue.duration",
            "altinn.workflow_engine.workflow.processing.duration",
            "altinn.workflow_engine.workflow.duration",
        ];
        foreach (var name in workflowHistograms)
        {
            var measurements = collector.GetMeasurements(name);
            Assert.NotEmpty(measurements);
            Assert.All(measurements, m => Assert.Empty(m.Tags));
        }

        string[] stepHistograms =
        [
            "altinn.workflow_engine.step.queue.duration",
            "altinn.workflow_engine.step.processing.duration",
            "altinn.workflow_engine.step.duration",
        ];
        foreach (var name in stepHistograms)
        {
            var measurements = collector.GetMeasurements(name);
            Assert.NotEmpty(measurements);
            Assert.All(
                measurements,
                m => Assert.Equal("altinn.workflow_engine.step.command.type", Assert.Single(m.Tags).Key)
            );
            Assert.Contains(measurements, m => Equals(m.Tags[0].Value, "webhook"));
        }
    }

    [Fact]
    public async Task HealthEndpoints_AreLeftOutOfHttpRequestMetrics()
    {
        // Arrange
        using var requestDurations = new HttpRequestDurationCollector(
            fixture.Services.GetRequiredService<IMeterFactory>()
        );
        using var client = fixture.CreateEngineClient();
        string[] probes =
        [
            "/api/v1/health",
            "/api/v1/health/ready",
            "/api/v1/health/live",
            "/health",
            "/health/ready",
            "/health/live",
        ];

        // Act
        foreach (var probe in probes)
        {
            using var probeResponse = await client.GetAsync(probe, TestContext.Current.CancellationToken);
            Assert.NotEqual(HttpStatusCode.NotFound, probeResponse.StatusCode);
        }

        // An ordinary request after the probes: once it is recorded, theirs would have been too
        using var apiResponse = await client.GetAsync("/api/v1/namespaces", TestContext.Current.CancellationToken);
        await requestDurations.WaitForRoute("/api/v1/namespaces");

        // Assert
        Assert.DoesNotContain(
            requestDurations.Routes,
            route => route?.Contains("health", StringComparison.Ordinal) is true
        );
    }

    /// <summary>
    /// Collects the <c>http.route</c> of every <c>http.server.request.duration</c> measurement one host records.
    /// The meter comes from the host's own <see cref="IMeterFactory"/>, so other hosts in the process stay out.
    /// </summary>
    private sealed class HttpRequestDurationCollector : IDisposable
    {
        private readonly MeterListener _listener = new();

        public ConcurrentBag<string?> Routes { get; } = [];

        public HttpRequestDurationCollector(IMeterFactory hostMeterFactory)
        {
            _listener.InstrumentPublished = (instrument, listener) =>
            {
                if (
                    ReferenceEquals(instrument.Meter.Scope, hostMeterFactory)
                    && instrument.Meter.Name == "Microsoft.AspNetCore.Hosting"
                    && instrument.Name == "http.server.request.duration"
                )
                {
                    listener.EnableMeasurementEvents(instrument);
                }
            };
            _listener.SetMeasurementEventCallback<double>(
                (_, _, tags, _) =>
                {
                    string? route = null;
                    foreach (var tag in tags)
                    {
                        if (tag.Key == "http.route")
                            route = tag.Value as string;
                    }

                    Routes.Add(route);
                }
            );
            _listener.Start();
        }

        public async Task WaitForRoute(string route)
        {
            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(5));
            while (!Routes.Contains(route))
            {
                await Task.Delay(25, cts.Token);
            }
        }

        public void Dispose() => _listener.Dispose();
    }

    /// <summary>
    /// Verifies the distributed trace hierarchy and cross-trace links for a single workflow.
    /// <para>
    /// The engine produces multiple traces per workflow lifecycle. Validation runs in
    /// the HTTP request context. The write buffer flushes in standalone background traces.
    /// Processing starts a new root trace that links back to the original request
    /// (the concurrency limiter's slot spans are left out):
    /// </para>
    /// <code>
    /// Trace A — HTTP request:
    ///   HTTP server span
    ///     └── Engine.EnqueueWorkflow
    ///           ├── ValidationUtils.ValidateWorkflowGraph
    ///           └── WorkflowWriteBuffer.Enqueue
    ///
    /// Background — Write buffer (standalone traces, linked → Trace A):
    ///   WorkflowWriteBuffer.FlushBatch
    ///     └── EngineRepository.BatchEnqueueWorkflows
    ///
    /// Trace B — Processing (new root, linked → Trace A):
    ///   WorkflowHandler.Handle
    ///     ├── WorkflowHandler.ProcessStep
    ///     │     ├── WorkflowUpdateBuffer.SubmitAndForget  (step_started, fire-and-forget)
    ///     │     ├── WorkflowExecutor.Execute
    ///     │     │     └── WebhookCommand.Execute
    ///     │     └── WorkflowUpdateBuffer.Submit           (step_completed)
    ///     └── WorkflowUpdateBuffer.Submit                 (workflow_completed)
    ///
    /// Background — Status write buffer (standalone traces, linked → Trace B):
    ///   WorkflowUpdateBuffer.FlushBatch
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

        //   WorkflowHandler.Handle
        //     ├── WorkflowHandler.ProcessStep — one name for every step; the operation ID is an attribute
        var processStep = SingleInTrace(collector, processWorkflow.TraceId, "WorkflowHandler.ProcessStep");
        AssertChildOf(processWorkflow, processStep);
        Assert.Equal("/cmd", processStep.GetTagItem("altinn.workflow_engine.step.operation_id"));
        Assert.Equal("webhook", processStep.GetTagItem("altinn.workflow_engine.step.command.type"));
        Assert.IsType<Guid>(processStep.GetTagItem("altinn.workflow_engine.step.id"));
        Assert.Equal(ActivityStatusCode.Ok, processStep.Status);

        //     │     └── WorkflowExecutor.Execute
        var execute = SingleInTrace(collector, processWorkflow.TraceId, "WorkflowExecutor.Execute");
        AssertChildOf(processStep, execute);

        //     │           └── WebhookCommand.Execute
        var webhookCommand = SingleInTrace(collector, processWorkflow.TraceId, "WebhookCommand.Execute");
        AssertChildOf(execute, webhookCommand);

        //     │     ├── WorkflowUpdateBuffer.SubmitAndForget [step_started — fire-and-forget]
        //     │     └── WorkflowUpdateBuffer.Submit [step_completed]
        //     └── WorkflowUpdateBuffer.Submit [workflow_completed]
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
        Assert.Equal("step_completed", Assert.Single(stepSubmits).GetTagItem("altinn.workflow_engine.update.reason"));
        Assert.Equal(
            "workflow_completed",
            Assert.Single(workflowSubmits).GetTagItem("altinn.workflow_engine.update.reason")
        );
        Assert.Equal("step_started", submitAndForgets[0].GetTagItem("altinn.workflow_engine.update.reason"));

        // ───────────────────────────────────────────────────────────
        // Standalone background activities (exist but not in workflow traces)
        // ───────────────────────────────────────────────────────────
        Assert.NotEmpty(collector.GetActivities("WorkflowWriteBuffer.FlushBatch"));
        Assert.NotEmpty(collector.GetActivities("EngineRepository.BatchEnqueueWorkflows"));
        Assert.NotEmpty(collector.GetActivities("WorkflowUpdateBuffer.FlushBatch"));
        Assert.NotEmpty(collector.GetActivities("EngineRepository.BatchUpdateWorkflowsAndSteps"));
    }

    [Fact]
    public async Task Enqueue_ServerSpan_CarriesTheWorkflowIdsAsAStringArray()
    {
        // Arrange — the server span is ASP.NET Core's, so its source is collected too
        using var collector = new TelemetryCollector("Microsoft.AspNetCore");

        var request = _testHelpers.CreateEnqueueRequest([
            _testHelpers.CreateWorkflow("a", [_testHelpers.CreateWebhookStep("/cmd-a")]),
            _testHelpers.CreateWorkflow("b", [_testHelpers.CreateWebhookStep("/cmd-b")]),
        ]);

        // Act
        var response = await _client.Enqueue(request);
        string[] workflowIds = [.. response.Workflows.Select(w => w.DatabaseId.ToString())];

        // Assert — one attribute holding every ID in request order, not a joined string
        var serverSpan = await collector.WaitForActivity(a =>
            a.Source.Name == "Microsoft.AspNetCore"
            && a.GetTagItem("altinn.workflow_engine.workflow.ids") is string[] ids
            && ids.Contains(workflowIds[0])
        );

        Assert.Equal(ActivityKind.Server, serverSpan.Kind);
        Assert.Equal(
            workflowIds,
            Assert.IsType<string[]>(serverSpan.GetTagItem("altinn.workflow_engine.workflow.ids"))
        );
        Assert.Equal(response.Workflows[0].Namespace, serverSpan.GetTagItem("altinn.workflow_engine.namespace"));
        Assert.NotNull(serverSpan.GetTagItem("altinn.workflow_engine.workflow.idempotency_key"));
    }

    [Fact]
    public async Task FailedStep_SpansCarryTheErrorTypeAndNoExceptionEvent()
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

        // Assert — the attempt that failed the workflow: earlier attempts were requeued and leave the status unset
        var handle = await collector.WaitForActivity(a =>
            a.OperationName == "WorkflowHandler.Handle"
            && a.GetTagItem("altinn.workflow_engine.workflow.id") is Guid id
            && id == workflowId
            && a.Status == ActivityStatusCode.Error
        );
        var processStep = SingleInTrace(collector, handle.TraceId, "WorkflowHandler.ProcessStep");

        Assert.Equal("execution", handle.GetTagItem("error.type"));
        Assert.Equal(ActivityStatusCode.Error, processStep.Status);
        Assert.Equal("execution", processStep.GetTagItem("error.type"));
        Assert.Contains("500", processStep.StatusDescription, StringComparison.Ordinal);
        Assert.All(collector.Activities.Where(a => a.TraceId == handle.TraceId), a => Assert.Empty(a.Events));
    }

    [Fact]
    public async Task StepWriteBackFails_TheStepSpanIsStillExported()
    {
        // Arrange — a trigger refuses this step's completion, so the database error reaches the handler through the
        // update buffer the way an outage's would. Only an ended span is exported, and so collected
        using var collector = new TelemetryCollector();
        const string operationId = "/refused-write-back";
        var settings = fixture.Services.GetRequiredService<IOptions<EngineSettings>>().Value;
        var maintenance = fixture.Services.GetServices<IHostedService>().OfType<DbMaintenanceService>().Single();

        await using (var context = fixture.GetDbContext())
        {
            await context.Database.ExecuteSqlRawAsync(
                $"""
                CREATE FUNCTION public.refuse_step_write_back() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    RAISE EXCEPTION 'step write-back refused';
                END
                $$;
                CREATE TRIGGER refuse_step_write_back BEFORE UPDATE ON engine.steps FOR EACH ROW
                    WHEN (NEW.operation_id = '{operationId}' AND NEW.status = {(int)PersistentItemStatus.Completed})
                    EXECUTE FUNCTION public.refuse_step_write_back();
                """,
                TestContext.Current.CancellationToken
            );
        }

        Guid workflowId;
        try
        {
            var request = _testHelpers.CreateEnqueueRequest([
                _testHelpers.CreateWorkflow("a", [_testHelpers.CreateWebhookStep(operationId)]),
            ]);

            // Act
            var response = await _client.Enqueue(request);
            workflowId = response.Workflows.Single().DatabaseId;

            // Assert
            var handle = await collector.WaitForActivity(
                a =>
                    a.OperationName == "WorkflowHandler.Handle"
                    && a.GetTagItem("altinn.workflow_engine.workflow.id") is Guid id
                    && id == workflowId,
                TimeSpan.FromSeconds(15)
            );
            var processStep = await collector.WaitForActivity(a =>
                a.OperationName == "WorkflowHandler.ProcessStep" && a.TraceId == handle.TraceId
            );

            AssertChildOf(handle, processStep);
            Assert.Equal(ActivityStatusCode.Error, processStep.Status);
            Assert.Equal("Npgsql.PostgresException", processStep.GetTagItem("error.type"));
            Assert.Empty(processStep.Events);
            Assert.Equal(ActivityStatusCode.Error, handle.Status);
            Assert.Equal("Npgsql.PostgresException", handle.GetTagItem("error.type"));
            Assert.Empty(handle.Events);
            var errorLog = Assert.Single(collector.Logs, l => l.TraceId == handle.TraceId && l.Level >= LogLevel.Error);
            Assert.Equal(LogLevel.Error, errorLog.Level);
            Assert.Equal(handle.SpanId, errorLog.SpanId);
            var exception = Assert.IsType<PostgresException>(errorLog.Exception);
            Assert.Equal("step write-back refused", exception.MessageText);

            await using var context = fixture.GetDbContext();
            var row = await context
                .Workflows.Include(w => w.Steps)
                .AsNoTracking()
                .SingleAsync(w => w.Id == workflowId, TestContext.Current.CancellationToken);
            Assert.Equal(PersistentItemStatus.Processing, row.Status);
            Assert.NotNull(row.LeaseToken);
            Assert.NotEqual(PersistentItemStatus.Completed, Assert.Single(row.Steps).Status);
        }
        finally
        {
            // Reclaimed as if the threshold had passed, which also leaves the database idle for the next test's reset
            await using var context = fixture.GetDbContext();
            await context.Database.ExecuteSqlRawAsync(
                """
                DROP TRIGGER refuse_step_write_back ON engine.steps;
                DROP FUNCTION public.refuse_step_write_back();
                """,
                CancellationToken.None
            );
            await maintenance.ReclaimStaleWorkflows(
                DateTimeOffset.UtcNow + settings.StaleWorkflowThreshold,
                settings,
                CancellationToken.None
            );
        }

        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);
    }

    [Fact]
    public async Task FinalWriteBackFails_TheWorkflowSpanEndsInErrorAndTheExceptionIsLoggedInItsTrace()
    {
        // Arrange — the workflow stays Processing until the stale reclaim, so the test waits for its exported span
        using var collector = new TelemetryCollector();
        const string workflowRef = "refused-final-write-back";
        var settings = fixture.Services.GetRequiredService<IOptions<EngineSettings>>().Value;
        var maintenance = fixture.Services.GetServices<IHostedService>().OfType<DbMaintenanceService>().Single();

        await using (var context = fixture.GetDbContext())
        {
            await context.Database.ExecuteSqlRawAsync(
                $"""
                CREATE FUNCTION public.refuse_final_write_back() RETURNS trigger LANGUAGE plpgsql AS $$
                BEGIN
                    RAISE EXCEPTION 'final write-back refused';
                END
                $$;
                CREATE TRIGGER refuse_final_write_back BEFORE UPDATE ON engine.workflows FOR EACH ROW
                    WHEN (NEW.operation_id = 'op-{workflowRef}' AND NEW.status = {(int)PersistentItemStatus.Completed})
                    EXECUTE FUNCTION public.refuse_final_write_back();
                """,
                TestContext.Current.CancellationToken
            );
        }

        Guid workflowId;
        try
        {
            var request = _testHelpers.CreateEnqueueRequest([
                _testHelpers.CreateWorkflow(workflowRef, [_testHelpers.CreateWebhookStep("/cmd")]),
            ]);

            // Act
            var response = await _client.Enqueue(request);
            workflowId = response.Workflows.Single().DatabaseId;

            // Assert — the update buffer logs the same error too, in the flush's trace
            var handle = await collector.WaitForActivity(
                a =>
                    a.OperationName == "WorkflowHandler.Handle"
                    && a.GetTagItem("altinn.workflow_engine.workflow.id") is Guid id
                    && id == workflowId,
                TimeSpan.FromSeconds(15)
            );

            Assert.Equal(ActivityStatusCode.Error, handle.Status);
            Assert.Equal("Npgsql.PostgresException", handle.GetTagItem("error.type"));
            Assert.Empty(handle.Events);
            var errorLog = Assert.Single(collector.Logs, l => l.TraceId == handle.TraceId && l.Level >= LogLevel.Error);
            Assert.Equal(LogLevel.Error, errorLog.Level);
            Assert.Equal(handle.SpanId, errorLog.SpanId);
            var exception = Assert.IsType<PostgresException>(errorLog.Exception);
            Assert.Equal("final write-back refused", exception.MessageText);

            // Nothing more was written: the step's completion landed, the workflow's did not
            await using var context = fixture.GetDbContext();
            var row = await context
                .Workflows.Include(w => w.Steps)
                .AsNoTracking()
                .SingleAsync(w => w.Id == workflowId, TestContext.Current.CancellationToken);
            Assert.Equal(PersistentItemStatus.Processing, row.Status);
            Assert.NotNull(row.LeaseToken);
            Assert.Equal(PersistentItemStatus.Completed, Assert.Single(row.Steps).Status);
        }
        finally
        {
            // Reclaimed as if the threshold had passed, which also leaves the database idle for the next test's reset
            await using var context = fixture.GetDbContext();
            await context.Database.ExecuteSqlRawAsync(
                """
                DROP TRIGGER refuse_final_write_back ON engine.workflows;
                DROP FUNCTION public.refuse_final_write_back();
                """,
                CancellationToken.None
            );
            await maintenance.ReclaimStaleWorkflows(
                DateTimeOffset.UtcNow + settings.StaleWorkflowThreshold,
                settings,
                CancellationToken.None
            );
        }

        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);
    }

    // ─── Span hierarchy helpers ────────────────────────────────────

    /// <summary>
    /// Asserts that <paramref name="child"/> is a direct child of <paramref name="parent"/>.
    /// </summary>
    private static void AssertChildOf(Activity parent, Activity child)
    {
        Assert.Equal(parent.TraceId, child.TraceId);
        Assert.Equal(parent.SpanId, child.ParentSpanId);
    }

    /// <summary>
    /// Returns the single activity matching <paramref name="operationName"/> that has a
    /// <c>altinn.workflow_engine.workflow.id</c> tag equal to <paramref name="workflowId"/>.
    /// Filters by workflow to avoid picking up activities from concurrent tests.
    /// </summary>
    private static Activity SingleForWorkflow(TelemetryCollector collector, string operationName, Guid workflowId)
    {
        var matches = collector
            .GetActivities(operationName)
            .Where(a => a.GetTagItem("altinn.workflow_engine.workflow.id") is Guid id && id == workflowId)
            .ToList();
        Assert.True(
            matches.Count == 1,
            $"Expected exactly 1 '{operationName}' for workflow {workflowId}, got {matches.Count}"
        );
        return matches[0];
    }

    /// <summary>
    /// Returns the single activity matching <paramref name="operationName"/> within the given trace.
    /// </summary>
    private static Activity SingleInTrace(TelemetryCollector collector, ActivityTraceId traceId, string operationName)
    {
        var matches = collector.GetActivities(operationName).Where(a => a.TraceId == traceId).ToList();
        Assert.True(
            matches.Count == 1,
            $"Expected exactly 1 '{operationName}' in trace {traceId}, got {matches.Count}"
        );
        return matches[0];
    }
}
