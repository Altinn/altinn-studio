using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using WorkflowEngine.CommandHandlers.Altinn;
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
            Command = new Command
            {
                Type = "webhook",
                OperationId = path,
                MaxExecutionTime = maxExecutionTime,
                Data = JsonSerializer.SerializeToElement(
                    new
                    {
                        uri = $"http://localhost:{fixture.WireMock.Port}{path}",
                        payload,
                        contentType,
                    }
                ),
            },
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
    ) =>
        new()
        {
            Command = new Command
            {
                Type = "app",
                OperationId = command,
                MaxExecutionTime = maxExecutionTime,
                Data = JsonSerializer.SerializeToElement(new { commandKey = command, payload }),
            },
            RetryStrategy = retryStrategy,
        };

    /// <summary>Builds a <see cref="WorkflowRequest"/> with the supplied steps.</summary>
    public WorkflowRequest CreateWorkflow(
        string wfRef,
        IEnumerable<StepRequest> steps,
        IEnumerable<WorkflowRef>? dependsOn = null
    ) =>
        new()
        {
            Ref = wfRef,
            OperationId = $"op-{wfRef}",
            Steps = steps.ToArray(),
            DependsOn = dependsOn?.ToList(),
        };

    /// <summary>
    /// Wraps a single <see cref="WorkflowRequest"/> in a <see cref="WorkflowEnqueueRequest"/>.
    /// </summary>
    public WorkflowEnqueueRequest CreateEnqueueRequest(WorkflowRequest workflow, string? lockToken = null) =>
        new()
        {
            TenantId = $"{EngineAppFixture.DefaultOrg}:{EngineAppFixture.DefaultApp}",
            IdempotencyKey = $"idem-{Guid.NewGuid()}",
            Context = CreateDefaultContext(lockToken),
            Labels = new Dictionary<string, string>
            {
                ["org"] = EngineAppFixture.DefaultOrg,
                ["app"] = EngineAppFixture.DefaultApp,
            },
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
            TenantId = $"{EngineAppFixture.DefaultOrg}:{EngineAppFixture.DefaultApp}",
            IdempotencyKey = $"idem-{Guid.NewGuid()}",
            Context = CreateDefaultContext(lockToken),
            Labels = new Dictionary<string, string>
            {
                ["org"] = EngineAppFixture.DefaultOrg,
                ["app"] = EngineAppFixture.DefaultApp,
            },
            Workflows = [.. workflows],
        };

    private static JsonElement CreateDefaultContext(string? lockToken = null) =>
        JsonSerializer.SerializeToElement(
            new
            {
                Actor = new Actor { UserIdOrOrgNumber = "test-user" },
                LockToken = lockToken,
                Org = EngineAppFixture.DefaultOrg,
                App = EngineAppFixture.DefaultApp,
                InstanceOwnerPartyId = int.Parse(EngineAppFixture.DefaultPartyId),
                InstanceGuid = EngineAppFixture.DefaultInstanceGuid,
            }
        );

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
