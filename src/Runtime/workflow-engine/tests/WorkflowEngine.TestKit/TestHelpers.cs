using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using WorkflowEngine.Commands.Webhook;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.TestKit;

public sealed class TestHelpers(EngineAppFixture fixture)
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
            OperationId = path,
            Command = WebhookCommand.Create(
                new WebhookCommandData
                {
                    Uri = $"http://localhost:{fixture.WireMock.Port}{path}",
                    Payload = payload,
                    ContentType = contentType,
                },
                maxExecutionTime
            ),
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
    public WorkflowEnqueueRequest CreateEnqueueRequest(WorkflowRequest workflow) =>
        new()
        {
            Namespace = $"{EngineAppFixture.DefaultOrg}:{EngineAppFixture.DefaultApp}",
            IdempotencyKey = $"idem-{Guid.NewGuid()}",
            Context = CreateDefaultContext(),
            Labels = new Dictionary<string, string>
            {
                ["org"] = EngineAppFixture.DefaultOrg,
                ["app"] = EngineAppFixture.DefaultApp,
            },
            Workflows = [workflow],
        };

    /// <summary>
    /// Wraps a collection of <see cref="WorkflowRequest"/> in a <see cref="WorkflowEnqueueRequest"/>.
    /// </summary>
    public WorkflowEnqueueRequest CreateEnqueueRequest(IEnumerable<WorkflowRequest> workflows) =>
        new()
        {
            Namespace = $"{EngineAppFixture.DefaultOrg}:{EngineAppFixture.DefaultApp}",
            IdempotencyKey = $"idem-{Guid.NewGuid()}",
            Context = CreateDefaultContext(),
            Labels = new Dictionary<string, string>
            {
                ["org"] = EngineAppFixture.DefaultOrg,
                ["app"] = EngineAppFixture.DefaultApp,
            },
            Workflows = [.. workflows],
        };

    private static JsonElement CreateDefaultContext() =>
        JsonSerializer.SerializeToElement(new { Org = EngineAppFixture.DefaultOrg, App = EngineAppFixture.DefaultApp });

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
