using System.Globalization;
using System.Net;
using System.Net.Http.Json;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestApp;
using WorkflowEngine.TestKit;

// CA1816: call GC.SuppressFinalize(object)
#pragma warning disable CA1816

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// End-to-end tests for the deferral primitive: a command returning
/// <see cref="ExecutionResult.Defer"/> parks its step in <c>Waiting</c>, is re-executed once the
/// workflow's backoff elapses, records no error history, and is bounded by the step's wait budget.
/// Drives the <see cref="DeferringCommand"/> registered by the shared test host.
/// </summary>
[Collection(EngineAppCollection.Name)]
public sealed class DeferralTests(EngineAppFixture<Program> fixture) : IAsyncLifetime
{
    private readonly EngineApiClient _client = new(fixture);
    private readonly TestHelpers _testHelpers = new(fixture);

    public async ValueTask InitializeAsync()
    {
        await fixture.Reset();
        DeferringCommand.ResetInvocations();
    }

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    private static StepRequest CreateDeferStep(
        string key,
        int succeedOnAttempt,
        int deferDelayMs = 200,
        TimeSpan? waitBudget = null
    ) =>
        new()
        {
            OperationId = $"defer-{key}",
            Command = CommandDefinition.Create(
                "test-defer",
                new DeferringCommandData
                {
                    Key = key,
                    SucceedOnAttempt = succeedOnAttempt,
                    DeferDelayMs = deferDelayMs,
                },
                waitBudget: waitBudget
            ),
        };

    [Fact]
    public async Task DeferringStep_IsReExecutedUntilSuccess_NoErrorHistory()
    {
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf-defer", [CreateDeferStep("poll-success", succeedOnAttempt: 3)])
        );
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;

        var workflow = await _client.WaitForWorkflowStatus(
            workflowId,
            PersistentItemStatus.Completed,
            TimeSpan.FromSeconds(30)
        );

        var step = Assert.Single(workflow.Steps);
        Assert.Equal(PersistentItemStatus.Completed, step.Status);
        Assert.Equal(2, step.DeferCount);
        Assert.NotNull(step.FirstDeferredAt);
        Assert.Equal(0, step.RetryCount);
        Assert.Null(step.ErrorHistory);
        Assert.Equal(3, DeferringCommand.InvocationCount("poll-success"));
    }

    [Fact]
    public async Task DeferringStep_OnResolution_RecordsWaitDurationOnce()
    {
        // The per-attempt service/total histograms say nothing about the wait, so the consumed budget
        // is its own signal — recorded exactly once, when the step stops waiting.
        using var collector = new TelemetryCollector();

        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf-wait-metric", [CreateDeferStep("poll-metric", succeedOnAttempt: 3)])
        );
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed, TimeSpan.FromSeconds(30));
        await collector.WaitForMeasurement("engine.steps.wait.duration");

        var measurement = Assert.Single(collector.GetMeasurements("engine.steps.wait.duration"));
        Assert.True(
            Convert.ToDouble(measurement.Value, CultureInfo.InvariantCulture) > 0,
            "Expected a positive wait duration for a step that deferred twice."
        );
    }

    [Fact]
    public async Task DeferringStep_SurfacesWaitingStatus_WhileParked()
    {
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow(
                "wf-waiting",
                [CreateDeferStep("poll-parked", succeedOnAttempt: 2, deferDelayMs: 60_000)]
            )
        );
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;

        var workflow = await _client.WaitForWorkflowStatus(
            workflowId,
            PersistentItemStatus.Waiting,
            TimeSpan.FromSeconds(30)
        );

        var step = Assert.Single(workflow.Steps);
        Assert.Equal(PersistentItemStatus.Waiting, step.Status);
        Assert.Equal(1, step.DeferCount);
        Assert.NotNull(step.FirstDeferredAt);
        Assert.Equal("not ready yet", step.LastDeferReason);
        Assert.Null(step.ErrorHistory);
        Assert.NotNull(workflow.BackoffUntil);
    }

    [Fact]
    public async Task WaitingHead_CollectionDetail_CarriesWaitingReason()
    {
        // The collection heads view is the one engine call consumers make on their read path, so the
        // waiting step's reason must ride on it — a Waiting head without the reason would force a
        // second per-workflow lookup on every read.
        var collectionKey = $"col-waiting-reason-{Guid.NewGuid():N}";
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow(
                "wf-waiting-reason",
                [CreateDeferStep("poll-collection-reason", succeedOnAttempt: 2, deferDelayMs: 60_000)]
            )
        );
        var enqueueResponse = await _client.Enqueue(request, collectionKey: collectionKey);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Waiting, TimeSpan.FromSeconds(30));

        var collection = await _client.GetCollection(collectionKey);

        Assert.NotNull(collection);
        var head = Assert.Single(collection.Heads);
        Assert.Equal(PersistentItemStatus.Waiting, head.Status);
        Assert.Equal("not ready yet", head.WaitingReason);
    }

    [Fact]
    public async Task WaitingWorkflow_Nudge_TriggersImmediateReExecution()
    {
        // Park the step with a delay far beyond the test timeout, then nudge it: the push channel
        // must turn a scheduled poll into an immediate re-check.
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow(
                "wf-nudge",
                [CreateDeferStep("poll-nudge", succeedOnAttempt: 2, deferDelayMs: 600_000)]
            )
        );
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Waiting, TimeSpan.FromSeconds(30));

        using var nudgeResponse = await Nudge(workflowId);
        Assert.Equal(HttpStatusCode.Accepted, nudgeResponse.StatusCode);
        var nudged = await nudgeResponse.Content.ReadFromJsonAsync<NudgeWorkflowResponse>(
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(nudged);
        Assert.Equal(workflowId, nudged.WorkflowId);
        Assert.NotNull(nudged.NudgedAt);

        var workflow = await _client.WaitForWorkflowStatus(
            workflowId,
            PersistentItemStatus.Completed,
            TimeSpan.FromSeconds(30)
        );
        Assert.Equal(1, Assert.Single(workflow.Steps).DeferCount);
    }

    [Fact]
    public async Task WaitingWorkflow_Fail_RecordsReasonAndStaysResumable()
    {
        const string reason = "Operator confirmed the receipt will never arrive";
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow(
                "wf-api-fail",
                [CreateDeferStep("poll-api-fail", succeedOnAttempt: 2, deferDelayMs: 600_000)]
            )
        );
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Waiting, TimeSpan.FromSeconds(30));

        var response = await _client.FailWorkflow(workflowId, reason);
        Assert.Equal(workflowId, response.WorkflowId);

        // A deferral records no error history, so the caller's reason is the step's only entry
        var failed = await _client.WaitForWorkflowStatus(
            workflowId,
            PersistentItemStatus.Failed,
            TimeSpan.FromSeconds(30)
        );
        var step = Assert.Single(failed.Steps);
        Assert.Equal(PersistentItemStatus.Failed, step.Status);
        Assert.Equal(1, step.DeferCount);
        Assert.NotNull(step.ErrorHistory);
        var entry = Assert.Single(step.ErrorHistory);
        Assert.Equal(reason, entry.Message);
        Assert.False(entry.WasRetryable);
        Assert.Equal(1, DeferringCommand.InvocationCount("poll-api-fail"));

        // Resume re-executes the step, which succeeds on its second attempt
        await _client.ResumeWorkflow(workflowId);
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed, TimeSpan.FromSeconds(30));
        Assert.Equal(2, DeferringCommand.InvocationCount("poll-api-fail"));
    }

    [Fact]
    public async Task Nudge_CompletedWorkflow_Returns409()
    {
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf-nudge-done", [CreateDeferStep("poll-done", succeedOnAttempt: 1)])
        );
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed, TimeSpan.FromSeconds(30));

        using var response = await Nudge(workflowId);
        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
    }

    [Fact]
    public async Task Nudge_UnknownWorkflow_Returns404()
    {
        using var response = await Nudge(Guid.NewGuid());
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task DeferringStep_WaitBudgetExhausted_FailsWithWaitExpired()
    {
        // Each deferral asks for 300ms against a 1s budget anchored at the first deferral. The engine
        // keeps parking (clamping the last poll to the deadline) until the budget is spent, then fails.
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow(
                "wf-expired",
                [
                    CreateDeferStep(
                        "poll-expired",
                        succeedOnAttempt: int.MaxValue,
                        deferDelayMs: 300,
                        waitBudget: TimeSpan.FromSeconds(1)
                    ),
                ]
            )
        );
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;

        var workflow = await _client.WaitForWorkflowStatus(
            workflowId,
            PersistentItemStatus.Failed,
            TimeSpan.FromSeconds(30)
        );

        var step = Assert.Single(workflow.Steps);
        Assert.Equal(PersistentItemStatus.Failed, step.Status);
        Assert.NotNull(step.ErrorHistory);
        var entry = Assert.Single(step.ErrorHistory);
        Assert.Contains("Wait budget", entry.Message, StringComparison.Ordinal);
        Assert.False(entry.WasRetryable);

        // The budget was actually spent rather than forfeited on the first overshoot.
        Assert.True(step.DeferCount > 0, $"expected at least one deferral, got {step.DeferCount}");
        Assert.NotNull(step.FirstDeferredAt);
    }

    [Fact]
    public async Task DeferringStep_DelayLongerThanBudget_StillParksThenExpires()
    {
        // Regression for the clamp: a single deferral asking for 10s against a 1s budget must park for
        // 1s and get a final check, not fail immediately with an unspent budget.
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow(
                "wf-clamped",
                [
                    CreateDeferStep(
                        "poll-clamped",
                        succeedOnAttempt: int.MaxValue,
                        deferDelayMs: 10_000,
                        waitBudget: TimeSpan.FromSeconds(1)
                    ),
                ]
            )
        );
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;

        var parked = await _client.WaitForWorkflowStatus(
            workflowId,
            PersistentItemStatus.Waiting,
            TimeSpan.FromSeconds(30)
        );
        Assert.Equal(1, Assert.Single(parked.Steps).DeferCount);

        var failed = await _client.WaitForWorkflowStatus(
            workflowId,
            PersistentItemStatus.Failed,
            TimeSpan.FromSeconds(30)
        );
        Assert.Contains(
            "Wait budget",
            Assert.Single(Assert.Single(failed.Steps).ErrorHistory!).Message,
            StringComparison.Ordinal
        );

        // Two executions: the initial one that parked, and the final check at the deadline.
        Assert.Equal(2, DeferringCommand.InvocationCount("poll-clamped"));
    }

    [Fact]
    public async Task Enqueue_WaitBudgetAboveCap_IsRejected()
    {
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow(
                "wf-invalid",
                [CreateDeferStep("poll-invalid", succeedOnAttempt: 1, waitBudget: TimeSpan.FromDays(365))]
            )
        );

        using var response = await _client.EnqueueRaw(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task Enqueue_NonPositiveWaitBudget_IsRejected()
    {
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow(
                "wf-invalid-negative",
                [CreateDeferStep("poll-invalid-negative", succeedOnAttempt: 1, waitBudget: TimeSpan.Zero)]
            )
        );

        using var response = await _client.EnqueueRaw(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    private async Task<HttpResponseMessage> Nudge(Guid workflowId)
    {
        using var client = fixture.CreateEngineClient();
        return await client.PostAsync(
            new Uri($"/api/v1/{EngineApiClient.DefaultNamespace}/workflows/{workflowId}/nudge", UriKind.Relative),
            content: null,
            TestContext.Current.CancellationToken
        );
    }
}
