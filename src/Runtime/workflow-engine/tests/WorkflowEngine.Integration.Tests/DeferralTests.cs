using System.Collections.Concurrent;
using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.DependencyInjection;
using WorkflowEngine.Core.Extensions;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

// CA1816: call GC.SuppressFinalize(object)
#pragma warning disable CA1816

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// End-to-end tests for the deferral primitive: a command returning
/// <see cref="ExecutionResult.Defer"/> parks its step in <c>Waiting</c>, is re-executed once the
/// workflow's backoff elapses, records no error history, and is bounded by the step's wait budget.
/// Uses a dedicated fixture that registers the in-process <see cref="DeferringCommand"/>.
/// </summary>
public sealed class DeferralTests(DeferralTests.DeferralEngineFixture fixture)
    : IClassFixture<DeferralTests.DeferralEngineFixture>,
        IAsyncLifetime
{
    /// <summary>
    /// Fixture that layers the test-only <see cref="DeferringCommand"/> on top of the standard test host.
    /// </summary>
    public sealed class DeferralEngineFixture : EngineAppFixture<Program>
    {
        protected override void ConfigureWebHost(IWebHostBuilder builder) =>
            builder.ConfigureServices(services => services.AddCommand<DeferringCommand>());
    }

    /// <summary>
    /// Test command that defers until it has been invoked <see cref="DeferringCommandData.SucceedOnAttempt"/>
    /// times, then succeeds. Invocations are tracked per <see cref="DeferringCommandData.Key"/>.
    /// </summary>
    public sealed class DeferringCommand : Command<DeferringCommandData>
    {
        internal static readonly ConcurrentDictionary<string, int> Invocations = new();

        public override string CommandType => "test-defer";

        protected override CommandValidationResult Validate(DeferringCommandData? commandData) =>
            commandData is null || string.IsNullOrWhiteSpace(commandData.Key)
                ? new CommandValidationResult.Invalid("test-defer requires a 'key' in command data")
                : new CommandValidationResult.Valid();

        protected override Task<ExecutionResult> Execute(
            CommandExecutionContext context,
            CancellationToken cancellationToken
        )
        {
            var data = context.GetCommandData<DeferringCommandData>();
            var attempt = Invocations.AddOrUpdate(data.Key, 1, (_, count) => count + 1);

            return Task.FromResult(
                attempt >= data.SucceedOnAttempt
                    ? ExecutionResult.Success()
                    : ExecutionResult.Defer(TimeSpan.FromMilliseconds(data.DeferDelayMs), "not ready yet")
            );
        }
    }

    public sealed record DeferringCommandData
    {
        public required string Key { get; init; }
        public int SucceedOnAttempt { get; init; } = 1;
        public int DeferDelayMs { get; init; } = 200;
    }

    private readonly EngineApiClient _client = new(fixture);
    private readonly TestHelpers _testHelpers = new(fixture);

    public async ValueTask InitializeAsync()
    {
        await fixture.Reset();
        DeferringCommand.Invocations.Clear();
    }

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    private StepRequest CreateDeferStep(
        string key,
        int succeedOnAttempt,
        int deferDelayMs = 200,
        TimeSpan? maxWaitDuration = null
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
                maxWaitDuration: maxWaitDuration
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
        Assert.NotNull(step.WaitingSince);
        Assert.Equal(0, step.RetryCount);
        Assert.Null(step.ErrorHistory);
        Assert.Equal(3, DeferringCommand.Invocations["poll-success"]);
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
        Assert.NotNull(step.WaitingSince);
        Assert.Null(step.ErrorHistory);

        // Drain the parked workflow so the fixture's Reset (which waits for DB idle) is not
        // blocked by the 60s backoff in the next test.
        await NudgeWorkflow(workflowId);
        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Completed, TimeSpan.FromSeconds(30));
    }

    private async Task NudgeWorkflow(Guid workflowId)
    {
        using var client = fixture.CreateEngineClient();
        using var response = await client.PostAsJsonAsync(
            "/dashboard/skip-backoff",
            new { workflowId, @namespace = EngineApiClient.DefaultNamespace },
            TestContext.Current.CancellationToken
        );
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task WaitingWorkflow_SkipBackoff_TriggersImmediateReExecution()
    {
        // Park the step with a delay far beyond the test timeout, then nudge it via skip-backoff.
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow(
                "wf-nudge",
                [CreateDeferStep("poll-nudge", succeedOnAttempt: 2, deferDelayMs: 600_000)]
            )
        );
        var enqueueResponse = await _client.Enqueue(request);
        var workflowId = enqueueResponse.Workflows.Single().DatabaseId;

        await _client.WaitForWorkflowStatus(workflowId, PersistentItemStatus.Waiting, TimeSpan.FromSeconds(30));

        await NudgeWorkflow(workflowId);

        var workflow = await _client.WaitForWorkflowStatus(
            workflowId,
            PersistentItemStatus.Completed,
            TimeSpan.FromSeconds(30)
        );
        Assert.Equal(1, Assert.Single(workflow.Steps).DeferCount);
    }

    [Fact]
    public async Task DeferringStep_WaitBudgetExhausted_FailsWithWaitExpired()
    {
        // Each deferral asks for 300ms but the budget is 1s from the first deferral — the engine
        // fails the step once the next scheduled execution would overrun the deadline.
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow(
                "wf-expired",
                [
                    CreateDeferStep(
                        "poll-expired",
                        succeedOnAttempt: int.MaxValue,
                        deferDelayMs: 300,
                        maxWaitDuration: TimeSpan.FromSeconds(1)
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
        Assert.Contains("Wait budget", entry.Message);
        Assert.False(entry.WasRetryable);
    }

    [Fact]
    public async Task Enqueue_MaxWaitDurationAboveCap_IsRejected()
    {
        var request = _testHelpers.CreateEnqueueRequest(
            _testHelpers.CreateWorkflow(
                "wf-invalid",
                [CreateDeferStep("poll-invalid", succeedOnAttempt: 1, maxWaitDuration: TimeSpan.FromDays(365))]
            )
        );

        using var response = await _client.EnqueueRaw(request);
        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }
}
