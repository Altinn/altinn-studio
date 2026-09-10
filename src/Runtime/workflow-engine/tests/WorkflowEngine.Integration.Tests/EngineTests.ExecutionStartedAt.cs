using WorkflowEngine.Models;
using WorkflowEngine.TestApp;

namespace WorkflowEngine.Integration.Tests;

public partial class EngineTests
{
    // ── executionStartedAt on the public status read ──────────────────────────
    //
    // The status endpoints are served from the database, so a stamp the handler only ever held in
    // memory reads as absent here. These tests pin what a consumer may rely on: present once the first
    // attempt begins, bounded by enqueue and last write-back, and moving with each new attempt.

    [Fact]
    public async Task GetWorkflow_AfterCompletion_ExposesExecutionStartedAt_BoundedByCreatedAndUpdated()
    {
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow(
                "wf-started-at",
                [_testHelpers.CreateWebhookStep("/started-at/1"), _testHelpers.CreateWebhookStep("/started-at/2")]
            )
        );
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;

        var workflow = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed);

        Assert.NotNull(workflow.ExecutionStartedAt);
        Assert.NotNull(workflow.UpdatedAt);
        Assert.InRange(workflow.ExecutionStartedAt.Value, workflow.CreatedAt, workflow.UpdatedAt.Value);

        Assert.Equal(2, workflow.Steps.Count);
        foreach (var step in workflow.Steps)
        {
            // A step's attempt begins after the worker stamped the workflow and before the workflow's
            // final write-back. (The step's own updatedAt is on the wire but not on the typed client —
            // StepStatusResponse.UpdatedAt has an internal setter — so the workflow's bounds it.)
            Assert.NotNull(step.ExecutionStartedAt);
            Assert.InRange(step.ExecutionStartedAt.Value, workflow.ExecutionStartedAt.Value, workflow.UpdatedAt.Value);
        }

        // Steps run sequentially: the second cannot have started before the first.
        Assert.True(workflow.Steps[0].ExecutionStartedAt <= workflow.Steps[1].ExecutionStartedAt);
    }

    [Fact]
    public async Task GetWorkflow_BeforeTheFirstAttempt_OmitsExecutionStartedAt()
    {
        // A scheduled workflow sits in Enqueued until its start time: nothing has stamped it yet.
        var wfRequest = _testHelpers.CreateWorkflow("wf-scheduled", [_testHelpers.CreateWebhookStep("/later")]) with
        {
            StartAt = DateTimeOffset.UtcNow.AddHours(1),
        };
        var enqueueResponse = await _client.Enqueue(_testHelpers.CreateEnqueueRequest(wfRequest));
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;

        var workflow = await _client.GetWorkflow(workflowId);

        Assert.NotNull(workflow);
        Assert.Equal(PersistentItemStatus.Enqueued, workflow.OverallStatus);
        Assert.Null(workflow.ExecutionStartedAt);
        Assert.Null(Assert.Single(workflow.Steps).ExecutionStartedAt);
    }

    [Fact]
    public async Task GetWorkflow_ParkedThenFailedThenResumed_StampFollowsTheAttempts()
    {
        // Attempt 1 defers and parks the workflow in Waiting; a manual fail settles it; resume runs
        // attempt 2, which succeeds. The stamp must be present while parked (the parking write-back
        // carried it), untouched by the fail, and moved forward by the second attempt.
        var key = $"started-at-{Guid.NewGuid():N}";
        var step = new StepRequest
        {
            OperationId = "defer-then-succeed",
            Command = CommandDefinition.Create(
                "test-defer",
                new DeferringCommandData
                {
                    Key = key,
                    SucceedOnAttempt = 2,
                    DeferDelayMs = 600_000,
                }
            ),
        };
        var enqueueResponse = await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(_testHelpers.CreateWorkflow("wf-defer-resume", [step]))
        );
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;

        var waiting = await _client.WaitForWorkflowStatus(
            workflowId,
            PersistentItemStatus.Waiting,
            TimeSpan.FromSeconds(30)
        );
        var firstAttempt = waiting.ExecutionStartedAt;
        Assert.NotNull(firstAttempt);
        var firstStepAttempt = Assert.Single(waiting.Steps).ExecutionStartedAt;
        Assert.NotNull(firstStepAttempt);
        // The step is stamped when its turn comes, a moment after the worker stamped the workflow.
        Assert.True(firstStepAttempt >= firstAttempt);

        // A manual fail rules on the outcome; it does not touch when the attempt began.
        await _client.FailWorkflow(workflowId, "give up");
        var failed = await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Failed);
        Assert.Equal(firstAttempt, failed.ExecutionStartedAt);
        Assert.Equal(firstStepAttempt, Assert.Single(failed.Steps).ExecutionStartedAt);

        await _client.ResumeWorkflow(workflowId);
        var completed = await _client.WaitForWorkflowStatus(
            workflowId,
            PersistentItemStatus.Completed,
            TimeSpan.FromSeconds(30)
        );

        Assert.NotNull(completed.ExecutionStartedAt);
        Assert.True(
            completed.ExecutionStartedAt > firstAttempt,
            $"expected the resumed attempt's stamp {completed.ExecutionStartedAt:O} after the first attempt's {firstAttempt:O}"
        );
        var completedStep = Assert.Single(completed.Steps);
        Assert.NotNull(completedStep.ExecutionStartedAt);
        Assert.True(completedStep.ExecutionStartedAt > firstStepAttempt);
        Assert.Equal(2, DeferringCommand.InvocationCount(key));
    }
}
