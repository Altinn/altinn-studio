using System.Net;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// End-to-end tests for <c>POST /api/v1/{namespace}/workflows/{id}/fail</c>: a parked workflow and its
/// parked step move to <c>Failed</c> with the caller's reason as the step's final error entry, the result
/// is an ordinary failure (resumable), and anything not parked is refused.
/// </summary>
[Collection(EngineAppCollection.Name)]
public sealed class EngineFailTests(EngineAppFixture<Program> fixture) : IAsyncLifetime
{
    private const string Reason = "Upstream registry confirmed the shipment was never created";

    private readonly EngineApiClient _client = new(fixture);
    private readonly TestHelpers _testHelpers = new(fixture);

    public async ValueTask InitializeAsync()
    {
        await fixture.Reset();
        await _testHelpers.AssertDbEmpty();
    }

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    /// <summary>
    /// Parks a single-step workflow in <c>Requeued</c>: the webhook answers 500 and the constant ten-minute
    /// backoff holds the step still for the rest of the test.
    /// </summary>
    private async Task<Guid> EnqueueRequeuedWorkflow(string path)
    {
        fixture.WireMock.Reset();
        fixture
            .WireMock.Given(Request.Create().UsingAnyMethod())
            .RespondWith(Response.Create().WithStatusCode(500).WithBody("boom"));

        var step = _testHelpers.CreateWebhookStep(
            path,
            retryStrategy: RetryStrategy.Constant(TimeSpan.FromMinutes(10), maxRetries: 5)
        );
        var request = _testHelpers.CreateEnqueueRequest(_testHelpers.CreateWorkflow("wf", [step]));
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Requeued);
        return workflowId;
    }

    [Fact]
    public async Task Fail_RequeuedWorkflow_Returns202_RecordsReason_AndStaysResumable()
    {
        var workflowId = await EnqueueRequeuedWorkflow("/fail-with-reason");

        // Act
        var response = await _client.FailWorkflow(workflowId, Reason);

        // Assert — terminal Failed, backoff gone, the reason appended after the retryable 500 entry
        Assert.Equal(workflowId, response.WorkflowId);

        var failed = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Failed);
        Assert.Null(failed.BackoffUntil);
        var step = Assert.Single(failed.Steps);
        Assert.Equal(PersistentItemStatus.Failed, step.Status);
        Assert.NotNull(step.ErrorHistory);
        Assert.Equal(2, step.ErrorHistory.Count);
        Assert.True(step.ErrorHistory[0].WasRetryable);
        var manual = step.ErrorHistory[1];
        Assert.Equal(Reason, manual.Message);
        Assert.False(manual.WasRetryable);
        Assert.Null(manual.HttpStatusCode);
        Assert.Equal(response.FailedAt, manual.Timestamp);

        // An ordinary failure: resume re-runs the step, which now succeeds
        fixture.WireMock.Reset();
        fixture.WireMock.Given(Request.Create().UsingAnyMethod()).RespondWith(Response.Create().WithStatusCode(200));
        await _client.ResumeWorkflow(workflowId);
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);
    }

    [Fact]
    public async Task Fail_WithoutBody_RecordsDefaultReason()
    {
        var workflowId = await EnqueueRequeuedWorkflow("/fail-default-reason");

        using var response = await _client.FailWorkflowRaw(workflowId);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var failed = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Failed);
        var history = Assert.Single(failed.Steps).ErrorHistory;
        Assert.NotNull(history);
        var entry = history[^1];
        Assert.False(entry.WasRetryable);
        Assert.False(string.IsNullOrWhiteSpace(entry.Message));
    }

    [Fact]
    public async Task Fail_AlreadyFailedWorkflow_Returns409()
    {
        // A manual failure is indistinguishable from an engine failure, so there is no idempotent replay.
        var workflowId = await EnqueueRequeuedWorkflow("/fail-twice");
        await _client.FailWorkflow(workflowId, Reason);
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Failed);

        using var response = await _client.FailWorkflowRaw(workflowId, Reason);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var workflow = await _client.GetWorkflow(workflowId);
        Assert.NotNull(workflow);
        Assert.Single(Assert.Single(workflow.Steps).ErrorHistory!.Where(e => e.Message == Reason));
    }

    [Fact]
    public async Task Fail_CompletedWorkflow_Returns409()
    {
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/hook")])
        );
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        using var response = await _client.FailWorkflowRaw(workflowId, Reason);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var workflow = await _client.GetWorkflow(workflowId);
        Assert.NotNull(workflow);
        Assert.Equal(PersistentItemStatus.Completed, workflow.OverallStatus);
    }

    [Fact]
    public async Task Fail_NonExistentWorkflow_Returns404()
    {
        using var response = await _client.FailWorkflowRaw(Guid.NewGuid(), Reason);

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Theory]
    [InlineData("   ")]
    [InlineData("")]
    public async Task Fail_BlankReason_Returns400(string reason)
    {
        var workflowId = await EnqueueRequeuedWorkflow("/fail-blank-reason");

        using var response = await _client.FailWorkflowRaw(workflowId, reason);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var workflow = await _client.GetWorkflow(workflowId);
        Assert.NotNull(workflow);
        Assert.Equal(PersistentItemStatus.Requeued, workflow.OverallStatus);
    }

    [Fact]
    public async Task Fail_OverlongReason_Returns400()
    {
        var workflowId = await EnqueueRequeuedWorkflow("/fail-long-reason");

        using var response = await _client.FailWorkflowRaw(
            workflowId,
            new string('x', FailWorkflowRequest.MaxReasonLength + 1)
        );

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var workflow = await _client.GetWorkflow(workflowId);
        Assert.NotNull(workflow);
        Assert.Equal(PersistentItemStatus.Requeued, workflow.OverallStatus);
    }
}
