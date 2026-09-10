using System.Net;
using System.Text.Json;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.TestApp;
using WorkflowEngine.TestKit;

// CA1816: call GC.SuppressFinalize(object)
#pragma warning disable CA1816

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// End-to-end tests for the skip outcome: a command returning <see cref="ExecutionResult.Skip"/> ends
/// its workflow <c>Skipped</c> with itself and every later step <c>Skipped</c>, the reason on the
/// skipping step, no error history, and the workflow terminal but neither failed nor resumable.
/// Drives the <see cref="SkippingCommand"/> registered by the shared test host.
/// </summary>
[Collection(EngineAppCollection.Name)]
public sealed class SkipTests(EngineAppFixture<Program> fixture) : IAsyncLifetime
{
    private const string SkipReason = "acquireConcurrencyConflict";

    private readonly EngineApiClient _client = new(fixture);
    private readonly TestHelpers _testHelpers = new(fixture);

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    private static StepRequest CreateSkipStep(string key) =>
        new()
        {
            OperationId = $"skip-{key}",
            Command = CommandDefinition.Create("test-skip", new SkippingCommandData { Reason = SkipReason }),
        };

    [Fact]
    public async Task SkippingStep_EndsWorkflowSkipped_LaterStepsSkipped_ReasonOnStatus()
    {
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow(
                "wf-skip",
                [
                    _testHelpers.CreateWebhookStep("/before-skip"),
                    CreateSkipStep("acquire"),
                    _testHelpers.CreateWebhookStep("/after-skip"),
                ]
            )
        );
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;

        var workflow = await _client.WaitForWorkflowStatus(
            workflowId,
            PersistentItemStatus.Skipped,
            TimeSpan.FromSeconds(30)
        );

        Assert.Equal(3, workflow.Steps.Count);
        var before = workflow.Steps.Single(s => s.ProcessingOrder == 0);
        Assert.Equal(PersistentItemStatus.Completed, before.Status);
        Assert.Null(before.SkipReason);
        Assert.Null(before.SkipOrigin);

        var skipping = workflow.Steps.Single(s => s.ProcessingOrder == 1);
        Assert.Equal(PersistentItemStatus.Skipped, skipping.Status);
        Assert.Equal(SkipReason, skipping.SkipReason);
        Assert.Equal(SkipOrigin.Command, skipping.SkipOrigin);
        Assert.Null(skipping.ErrorHistory);
        Assert.Equal(0, skipping.RetryCount);

        var after = workflow.Steps.Single(s => s.ProcessingOrder == 2);
        Assert.Equal(PersistentItemStatus.Skipped, after.Status);
        Assert.Null(after.SkipReason);
        Assert.Null(after.SkipOrigin);
        Assert.Null(after.ErrorHistory);

        // The later step never ran, yet its row was stamped by the skipping step's write-back (the typed
        // client cannot see it: StepStatusResponse.UpdatedAt has an internal setter)
        using var raw = await _client.GetWorkflowRaw(workflowId);
        using var doc = JsonDocument.Parse(await raw.Content.ReadAsStringAsync(TestContext.Current.CancellationToken));
        var afterJson = doc
            .RootElement.GetProperty("steps")
            .EnumerateArray()
            .Single(s => s.GetProperty("processingOrder").GetInt32() == 2);
        Assert.True(afterJson.TryGetProperty("updatedAt", out _));

        // The step after the skip never ran
        Assert.Contains(fixture.WireMock.LogEntries, e => e.RequestMessage.AbsolutePath == "/before-skip");
        Assert.DoesNotContain(fixture.WireMock.LogEntries, e => e.RequestMessage.AbsolutePath == "/after-skip");
    }

    [Fact]
    public async Task SkippedWorkflow_DependentEnqueuedAfterwards_Runs()
    {
        // Skipped is terminal and not a failure: a successor declaring an ordinary dependency on it
        // runs instead of becoming DependencyFailed, and the predecessor is left as it was.
        var skipEnqueue = await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(_testHelpers.CreateWorkflow("wf-skip", [CreateSkipStep("predecessor")]))
        );
        var skippedId = skipEnqueue.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(skippedId, PersistentItemStatus.Skipped, TimeSpan.FromSeconds(30));

        var dependentEnqueue = await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow(
                    "wf-dependent",
                    [_testHelpers.CreateWebhookStep("/dependent-after")],
                    dependsOn: [(WorkflowRef)skippedId]
                )
            )
        );
        var dependentId = dependentEnqueue.Workflows.Single().DatabaseId;

        var dependent = await _client.WaitForWorkflowStatus(
            dependentId,
            PersistentItemStatus.Completed,
            TimeSpan.FromSeconds(30)
        );
        Assert.NotNull(dependent.Dependencies);
        Assert.Equal(PersistentItemStatus.Skipped, dependent.Dependencies[skippedId]);

        var predecessor = await _client.GetWorkflow(skippedId);
        Assert.NotNull(predecessor);
        Assert.Equal(PersistentItemStatus.Skipped, predecessor.OverallStatus);
    }

    [Fact]
    public async Task SkippedWorkflow_DependentEnqueuedBefore_RunsAfterSkip()
    {
        // Admitted in the same batch, the dependent is gated on the predecessor while it is still
        // enqueued; the fetch gate releases it once the predecessor settles as Skipped.
        var predecessor = _testHelpers.CreateWorkflow("wf-skip", [CreateSkipStep("predecessor-before")]);
        var dependent = _testHelpers.CreateWorkflow(
            "wf-dependent",
            [_testHelpers.CreateWebhookStep("/dependent-before")],
            dependsOn: [(WorkflowRef)"wf-skip"]
        );
        var enqueueResponse = await _client.Enqueue(_testHelpers.CreateEnqueueRequest([predecessor, dependent]));
        var skippedId = enqueueResponse.Workflows.Single(w => w.Ref == "wf-skip").DatabaseId;
        var dependentId = enqueueResponse.Workflows.Single(w => w.Ref == "wf-dependent").DatabaseId;

        await _client.WaitForWorkflowStatus(skippedId, PersistentItemStatus.Skipped, TimeSpan.FromSeconds(30));
        var completed = await _client.WaitForWorkflowStatus(
            dependentId,
            PersistentItemStatus.Completed,
            TimeSpan.FromSeconds(30)
        );

        Assert.NotNull(completed.Dependencies);
        Assert.Equal(PersistentItemStatus.Skipped, completed.Dependencies[skippedId]);
        Assert.Contains(fixture.WireMock.LogEntries, e => e.RequestMessage.AbsolutePath == "/dependent-before");
    }

    [Fact]
    public async Task SkippedWorkflow_Resume_Returns409()
    {
        var enqueueResponse = await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(_testHelpers.CreateWorkflow("wf-skip", [CreateSkipStep("resume")]))
        );
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Skipped, TimeSpan.FromSeconds(30));

        using var response = await _client.ResumeWorkflowRaw(workflowId);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var workflow = await _client.GetWorkflow(workflowId);
        Assert.NotNull(workflow);
        Assert.Equal(PersistentItemStatus.Skipped, workflow.OverallStatus);
    }

    [Fact]
    public async Task SkippedWorkflow_Cancel_Returns409()
    {
        var enqueueResponse = await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(_testHelpers.CreateWorkflow("wf-skip", [CreateSkipStep("cancel")]))
        );
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Skipped, TimeSpan.FromSeconds(30));

        using var response = await _client.CancelWorkflowRaw(workflowId);

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var workflow = await _client.GetWorkflow(workflowId);
        Assert.NotNull(workflow);
        Assert.Equal(PersistentItemStatus.Skipped, workflow.OverallStatus);
    }

    [Fact]
    public async Task ListWorkflows_FiltersBySkipped()
    {
        var skipEnqueue = await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(_testHelpers.CreateWorkflow("wf-skip", [CreateSkipStep("list")]))
        );
        var skippedId = skipEnqueue.Workflows.Single().DatabaseId;
        var completedEnqueue = await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf-complete", [_testHelpers.CreateWebhookStep("/list-complete")])
            )
        );
        var completedId = completedEnqueue.Workflows.Single().DatabaseId;
        await _client.WaitForWorkflowStatus(skippedId, PersistentItemStatus.Skipped, TimeSpan.FromSeconds(30));
        await _client.WaitForWorkflowStatus(completedId, PersistentItemStatus.Completed, TimeSpan.FromSeconds(30));

        var skipped = await _client.ListWorkflows([PersistentItemStatus.Skipped]);
        var completed = await _client.ListWorkflows([PersistentItemStatus.Completed]);

        Assert.Equal(skippedId, Assert.Single(skipped).DatabaseId);
        Assert.Equal(completedId, Assert.Single(completed).DatabaseId);
    }
}
