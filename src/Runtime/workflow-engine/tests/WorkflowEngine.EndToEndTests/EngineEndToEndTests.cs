using Microsoft.EntityFrameworkCore;
using WorkflowEngine.EndToEndTests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

// CA1816: call GC.SuppressFinalize(object)
#pragma warning disable CA1816

namespace WorkflowEngine.EndToEndTests;

/// <summary>
/// End-to-end tests that spin up the full ASP.NET Core application (via WebApplicationFactory),
/// POST real JSON payloads to the engine API, and assert on the final workflow state after the
/// engine has processed the requests.
///
/// Infrastructure:
///   • PostgreSQL  – real Testcontainers instance shared across all tests in this class.
///   • WireMock    – in-process HTTP server that acts as the app-callback / webhook receiver.
///   • Engine      – runs as a hosted background service inside the test host.
///
/// Test isolation: every test calls <see cref="EngineAppFixture.ResetAsync"/> to truncate the
/// database and restore WireMock to its default catch-all 200 stub.
/// </summary>
[Collection(EngineAppCollection.Name)]
public partial class EngineEndToEndTests(EngineAppFixture fixture) : IAsyncLifetime
{
    // ── Instance-level constants ──────────────────────────────────────────────

    private const string Org = "ttd";
    private const string App = "e2e-tests";
    private const string PartyId = "50001";
    private const string LockToken = "e2e-lock-token-abc123";

    // ── Per-test state ────────────────────────────────────────────────────────

    private readonly EngineApiClient _client = new(fixture.CreateEngineClient());
    private readonly Guid _instanceGuid = Guid.NewGuid();

    public async ValueTask InitializeAsync()
    {
        await fixture.ResetAsync();
        await AssertDbEmpty();
    }

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    /// <summary>
    /// Creates a GET Webhook step pointing at <c>http://localhost:{wireMockPort}{path}</c>.
    /// </summary>
    private StepRequest CreateWebhookStep(
        string path,
        string? payload = null,
        string? contentType = null,
        TimeSpan? maxExecutionTime = null,
        RetryStrategy? retryStrategy = null
    ) =>
        new()
        {
            Command = new Command.Webhook(
                $"http://localhost:{fixture.WireMock.Port}{path}",
                payload,
                contentType,
                maxExecutionTime
            ),
            RetryStrategy = retryStrategy,
        };

    /// <summary>
    /// Creates an AppCommand step with the given command.
    /// </summary>
    private static StepRequest CreateAppCommandStep(
        string command,
        string? payload = null,
        TimeSpan? maxExecutionTime = null,
        RetryStrategy? retryStrategy = null
    ) => new() { Command = new Command.AppCommand(command, payload, maxExecutionTime), RetryStrategy = retryStrategy };

    /// <summary>Builds a <see cref="WorkflowRequest"/> with the supplied steps.</summary>
    private static WorkflowRequest CreateWorkflow(
        string wfRef,
        WorkflowType type,
        IEnumerable<StepRequest> steps,
        IEnumerable<WorkflowRef>? dependsOn = null
    ) =>
        new()
        {
            Ref = wfRef,
            OperationId = $"op-{wfRef}-{Guid.NewGuid()}",
            Type = type,
            Steps = steps.ToArray(),
            DependsOn = dependsOn?.ToList(),
        };

    /// <summary>
    /// Wraps a single <see cref="WorkflowRequest"/> in a <see cref="WorkflowEnqueueRequest"/>.
    /// </summary>
    private static WorkflowEnqueueRequest CreateEnqueueRequest(WorkflowRequest workflow, string? lockToken = null) =>
        new()
        {
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            LockToken = lockToken,
            Workflows = [workflow],
        };

    /// <summary>
    /// Wraps a a collection of <see cref="WorkflowRequest"/> in a <see cref="WorkflowEnqueueRequest"/>.
    /// </summary>
    private static WorkflowEnqueueRequest CreateEnqueueRequest(
        IEnumerable<WorkflowRequest> workflows,
        string? lockToken = null
    ) =>
        new()
        {
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            LockToken = lockToken,
            Workflows = [.. workflows],
        };

    private async Task<WorkflowStatusResponse> WaitForWorkflowStatus(long workflowId, PersistentItemStatus status) =>
        await _client.WaitForStatus(Org, App, PartyId, _instanceGuid, workflowId, status);

    private async Task<List<WorkflowStatusResponse>> WaitForWorkflowStatus(
        IEnumerable<long> workflowIds,
        PersistentItemStatus status
    ) => await _client.WaitForAllStatus(Org, App, PartyId, _instanceGuid, workflowIds, status);

    private async Task AssertDbEmpty()
    {
        await using var context = fixture.GetDbContext();
        var workflowCount = await context.Workflows.CountAsync(TestContext.Current.CancellationToken);
        var stepCount = await context.Steps.CountAsync(TestContext.Current.CancellationToken);

        Assert.Equal(0, workflowCount);
        Assert.Equal(0, stepCount);
    }

    private async Task AssertDbWorkflowCount(int expectedCount)
    {
        await using var context = fixture.GetDbContext();
        var workflowCount = await context.Workflows.CountAsync(TestContext.Current.CancellationToken);

        Assert.Equal(expectedCount, workflowCount);
    }

    private async Task AssertDbStepCount(int expectedCount)
    {
        await using var context = fixture.GetDbContext();
        var workflowCount = await context.Steps.CountAsync(TestContext.Current.CancellationToken);

        Assert.Equal(expectedCount, workflowCount);
    }
}
