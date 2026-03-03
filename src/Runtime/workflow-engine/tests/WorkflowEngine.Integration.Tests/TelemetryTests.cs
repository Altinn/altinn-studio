using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Integration tests that verify OpenTelemetry counters, histograms, and activities
/// are emitted correctly during the full API → Engine → DB pipeline.
/// </summary>
[Collection(EngineAppCollection.Name)]
public sealed class TelemetryTests(EngineAppFixture fixture) : IAsyncLifetime
{
    private const string InstanceLockToken = EngineAppFixture.DefaultInstanceLockToken;
    private readonly EngineApiClient _client = new(fixture);
    private readonly TestHelpers _testHelpers = new(fixture);
    private readonly Guid _instanceGuid = Guid.NewGuid();

    public async ValueTask InitializeAsync()
    {
        await fixture.ResetAsync();
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

        var request = _testHelpers.CreateEnqueueRequest(
            [_testHelpers.CreateWorkflow("a", WorkflowType.Generic, [_testHelpers.CreateAppCommandStep("/cmd")])],
            lockToken: InstanceLockToken
        );

        // Act
        var response = await _client.Enqueue(_instanceGuid, request);
        var workflowId = response.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(_instanceGuid, workflowId, PersistentItemStatus.Completed);

        // Allow a brief window for async telemetry to flush
        await Task.Delay(100, TestContext.Current.CancellationToken);

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

        // Assert zero failure/requeue counters for a successful workflow
        Assert.Equal(0, collector.GetCounterTotal("engine.workflows.execution.failed"));
        Assert.Equal(0, collector.GetCounterTotal("engine.steps.execution.failed"));
        Assert.Equal(0, collector.GetCounterTotal("engine.steps.execution.requeued"));

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

        var request = _testHelpers.CreateEnqueueRequest(
            [
                _testHelpers.CreateWorkflow(
                    "a",
                    WorkflowType.Generic,
                    [_testHelpers.CreateAppCommandStep("/cmd-1"), _testHelpers.CreateAppCommandStep("/cmd-2")]
                ),
            ],
            lockToken: InstanceLockToken
        );

        // Act
        var response = await _client.Enqueue(_instanceGuid, request);
        var workflowId = response.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(_instanceGuid, workflowId, PersistentItemStatus.Completed);

        await Task.Delay(100, TestContext.Current.CancellationToken);

        // === Enqueue phase ===
        Assert.NotEmpty(collector.GetActivities("Engine.EnqueueBatch"));
        Assert.NotEmpty(collector.GetActivities("ValidationUtils.ValidateAndSortWorkflowGraph"));
        Assert.NotEmpty(collector.GetActivities("Engine.AcquireQueueSlots"));
        Assert.NotEmpty(collector.GetActivities("EnginePgRepository.AddWorkflowBatch"));

        var dbSlotActivities = collector.GetActivities("ConcurrencyLimiter.AcquireDbSlot");
        Assert.True(
            dbSlotActivities.Count >= 1,
            $"Expected at least 1 ConcurrencyLimiter.AcquireDbSlot activity, got {dbSlotActivities.Count}"
        );

        Assert.NotEmpty(collector.GetActivities("EnginePgRepository.InsertWorkflowEntity"));

        // === Processing phase ===
        Assert.NotEmpty(collector.GetActivities("Engine.ProcessWorkflow"));

        var updateWorkflowActivities = collector.GetActivities("Engine.UpdateWorkflowInDb");
        Assert.True(
            updateWorkflowActivities.Count >= 1,
            $"Expected at least 1 Engine.UpdateWorkflowInDb activity, got {updateWorkflowActivities.Count}"
        );

        var repoUpdateActivities = collector.GetActivities("EnginePgRepository.UpdateWorkflow");
        Assert.True(
            repoUpdateActivities.Count >= 1,
            $"Expected at least 1 EnginePgRepository.UpdateWorkflow activity, got {repoUpdateActivities.Count}"
        );

        var processStepActivities = collector.GetActivitiesStartingWith("Engine.ProcessStep");
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

        var appCommandActivities = collector.GetActivities("WorkflowExecutor.AppCommand");
        Assert.True(
            appCommandActivities.Count >= 2,
            $"Expected at least 2 WorkflowExecutor.AppCommand activities, got {appCommandActivities.Count}"
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

        // === Batch write phase ===
        var batchUpdateEngineActivities = collector.GetActivities("Engine.UpdateWorkflowAndStepsInDb");
        Assert.True(
            batchUpdateEngineActivities.Count >= 1,
            $"Expected at least 1 Engine.UpdateWorkflowAndStepsInDb activity, got {batchUpdateEngineActivities.Count}"
        );

        Assert.NotEmpty(collector.GetActivities("EnginePgRepository.BatchUpdateWorkflowAndSteps"));

        // === Finalization phase ===
        Assert.NotEmpty(collector.GetActivities("Engine.ReleaseQueueSlot"));

        var dbSlotReleaseActivities = collector.GetActivities("ConcurrencyLimiter.ReleaseDbSlot");
        Assert.True(
            dbSlotReleaseActivities.Count >= 1,
            $"Expected at least 1 ConcurrencyLimiter.ReleaseDbSlot activity, got {dbSlotReleaseActivities.Count}"
        );
    }

    [Fact]
    public async Task FailedWorkflow_EmitsFailureCounters()
    {
        // Arrange — WireMock always returns 500 → step exhausts retries → Failed
        using var collector = new TelemetryCollector();

        fixture.WireMock.Reset();
        fixture.WireMock.Given(Request.Create().UsingAnyMethod()).RespondWith(Response.Create().WithStatusCode(500));

        var request = _testHelpers.CreateEnqueueRequest(
            [_testHelpers.CreateWorkflow("a", WorkflowType.Generic, [_testHelpers.CreateAppCommandStep("/cmd")])],
            lockToken: InstanceLockToken
        );

        // Act
        var response = await _client.Enqueue(_instanceGuid, request);
        var workflowId = response.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(_instanceGuid, workflowId, PersistentItemStatus.Failed);

        await Task.Delay(200, TestContext.Current.CancellationToken);

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

        // Assert zero success counters for a failed workflow
        Assert.Equal(0, collector.GetCounterTotal("engine.workflows.execution.success"));
        Assert.Equal(0, collector.GetCounterTotal("engine.steps.execution.success"));

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

        var request = _testHelpers.CreateEnqueueRequest(
            [_testHelpers.CreateWorkflow("a", WorkflowType.Generic, [_testHelpers.CreateAppCommandStep("/cmd")])],
            lockToken: InstanceLockToken
        );

        var response = await _client.Enqueue(_instanceGuid, request);
        var workflowId = response.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(_instanceGuid, workflowId, PersistentItemStatus.Completed);

        // Reset collector so we only capture query-related telemetry
        while (collector.Measurements.TryTake(out _))
        {
            // Drain previous measurements
        }

        // Act — call both query endpoints
        await _client.ListActiveWorkflows(_instanceGuid);
        await _client.GetWorkflow(_instanceGuid, workflowId);

        await Task.Delay(100, TestContext.Current.CancellationToken);

        // Assert query counters
        Assert.True(
            collector.GetCounterTotal("engine.workflows.query.received") >= 2,
            "Expected at least 2 WorkflowQueriesReceived (one for list, one for get)"
        );

        // Assert repository activities for query operations
        Assert.NotEmpty(collector.GetActivities("EnginePgRepository.GetActiveWorkflowsForInstance"));
        Assert.NotEmpty(collector.GetActivities("EnginePgRepository.GetWorkflow"));
    }
}
