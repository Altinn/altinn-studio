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

        // Assert counters
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
        Assert.True(
            collector.GetCounterTotal("engine.workflows.execution.success") >= 1,
            "Expected at least 1 WorkflowsSucceeded"
        );
        Assert.True(
            collector.GetCounterTotal("engine.steps.execution.success") >= 1,
            "Expected at least 1 StepsSucceeded"
        );
        Assert.True(
            collector.GetCounterTotal("engine.db.operations.success") >= 1,
            "Expected at least 1 DbOperationsSucceeded"
        );

        // Assert histograms recorded
        Assert.True(collector.HasMeasurement("engine.workflows.time.total"), "Expected WorkflowTotalTime histogram");
        Assert.True(
            collector.HasMeasurement("engine.workflows.time.service"),
            "Expected WorkflowServiceTime histogram"
        );
        Assert.True(collector.HasMeasurement("engine.steps.time.total"), "Expected StepTotalTime histogram");
        Assert.True(collector.HasMeasurement("engine.steps.time.service"), "Expected StepServiceTime histogram");
    }

    [Fact]
    public async Task SingleWorkflow_EmitsExpectedActivityHierarchy()
    {
        // Arrange — 2 steps so we can verify multiple ProcessStep activities
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

        // Assert key activities exist
        Assert.NotEmpty(collector.GetActivities("Engine.EnqueueBatch"));
        Assert.NotEmpty(collector.GetActivities("Engine.ProcessWorkflow"));

        // ProcessStep activities (one per step)
        var processStepActivities = collector.GetActivitiesStartingWith("Engine.ProcessStep");
        Assert.True(
            processStepActivities.Count >= 2,
            $"Expected at least 2 ProcessStep activities, got {processStepActivities.Count}"
        );

        // Executor activities
        var executorActivities = collector.GetActivitiesStartingWith("WorkflowExecutor.Execute");
        Assert.True(
            executorActivities.Count >= 2,
            $"Expected at least 2 executor activities, got {executorActivities.Count}"
        );

        // Repository activities
        Assert.NotEmpty(collector.GetActivities("EnginePgRepository.AddWorkflowBatch"));
        Assert.NotEmpty(collector.GetActivities("EnginePgRepository.BatchUpdateWorkflowAndSteps"));
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

        // Assert failure counters
        Assert.True(
            collector.GetCounterTotal("engine.steps.execution.requeued") >= 1,
            "Expected at least 1 StepsRequeued"
        );
        Assert.True(collector.GetCounterTotal("engine.steps.execution.failed") >= 1, "Expected at least 1 StepsFailed");
        Assert.True(
            collector.GetCounterTotal("engine.workflows.execution.failed") >= 1,
            "Expected at least 1 WorkflowsFailed"
        );
    }
}
