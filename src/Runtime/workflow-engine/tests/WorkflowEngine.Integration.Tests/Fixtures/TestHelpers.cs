using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Integration.Tests.Fixtures;

internal sealed class TestHelpers(EngineAppFixture fixture)
{
    /// <summary>
    /// Creates a GET Webhook step pointing at <c>http://localhost:{wireMockPort}{path}</c>.
    /// </summary>
    public StepRequest CreateWebhookStep(
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
    public StepRequest CreateAppCommandStep(
        string command,
        string? payload = null,
        TimeSpan? maxExecutionTime = null,
        RetryStrategy? retryStrategy = null
    ) => new() { Command = new Command.AppCommand(command, payload, maxExecutionTime), RetryStrategy = retryStrategy };

    /// <summary>Builds a <see cref="WorkflowRequest"/> with the supplied steps.</summary>
    public WorkflowRequest CreateWorkflow(
        string wfRef,
        WorkflowType type,
        IEnumerable<StepRequest> steps,
        IEnumerable<WorkflowRef>? dependsOn = null
    ) =>
        new()
        {
            Ref = wfRef,
            OperationId = $"op-{wfRef}",
            Type = type,
            Steps = steps.ToArray(),
            DependsOn = dependsOn?.ToList(),
        };

    /// <summary>
    /// Wraps a single <see cref="WorkflowRequest"/> in a <see cref="WorkflowEnqueueRequest"/>.
    /// </summary>
    public WorkflowEnqueueRequest CreateEnqueueRequest(WorkflowRequest workflow, string? lockToken = null) =>
        new()
        {
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            IdempotencyKey = $"idem-{Guid.NewGuid()}",
            LockToken = lockToken,
            Workflows = [workflow],
        };

    /// <summary>
    /// Wraps a a collection of <see cref="WorkflowRequest"/> in a <see cref="WorkflowEnqueueRequest"/>.
    /// </summary>
    public WorkflowEnqueueRequest CreateEnqueueRequest(
        IEnumerable<WorkflowRequest> workflows,
        string? lockToken = null
    ) =>
        new()
        {
            Actor = new Actor { UserIdOrOrgNumber = "test-user" },
            IdempotencyKey = $"idem-{Guid.NewGuid()}",
            LockToken = lockToken,
            Workflows = [.. workflows],
        };

    public async Task AssertDbEmpty()
    {
        await using var context = fixture.GetDbContext();
        var workflowCount = await context.Workflows.CountAsync(TestContext.Current.CancellationToken);
        var stepCount = await context.Steps.CountAsync(TestContext.Current.CancellationToken);

        Assert.Equal(0, workflowCount);
        Assert.Equal(0, stepCount);
    }

    public async Task AssertDbWorkflowCount(int expectedCount)
    {
        await using var context = fixture.GetDbContext();
        var workflowCount = await context.Workflows.CountAsync(TestContext.Current.CancellationToken);

        Assert.Equal(expectedCount, workflowCount);
    }

    public async Task AssertDbStepCount(int expectedCount)
    {
        await using var context = fixture.GetDbContext();
        var workflowCount = await context.Steps.CountAsync(TestContext.Current.CancellationToken);

        Assert.Equal(expectedCount, workflowCount);
    }
}
