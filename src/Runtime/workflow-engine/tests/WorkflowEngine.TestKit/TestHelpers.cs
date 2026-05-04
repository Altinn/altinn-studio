using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using WorkflowEngine.Commands.Webhook;
using WorkflowEngine.Core;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

// CA1822: Mark members as static
#pragma warning disable CA1822

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
        RetryStrategy? retryStrategy = null,
        Dictionary<string, string>? labels = null
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
            Labels = labels,
        };

    /// <summary>
    /// Builds a <see cref="WorkflowRequest"/> with the supplied steps.
    /// </summary>
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
    public WorkflowEnqueueRequest CreateEnqueueRequest(WorkflowRequest workflow, bool includeContext = true) =>
        new()
        {
            Context = includeContext ? CreateDefaultContext() : null,
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
    public WorkflowEnqueueRequest CreateEnqueueRequest(
        IEnumerable<WorkflowRequest> workflows,
        bool includeContext = true
    ) =>
        new()
        {
            Context = includeContext ? CreateDefaultContext() : null,
            Labels = new Dictionary<string, string>
            {
                ["org"] = EngineAppFixture.DefaultOrg,
                ["app"] = EngineAppFixture.DefaultApp,
            },
            Workflows = [.. workflows],
        };

    private static JsonElement CreateDefaultContext() =>
        JsonSerializer.SerializeToElement(new { Org = EngineAppFixture.DefaultOrg, App = EngineAppFixture.DefaultApp });

    /// <summary>
    /// Polls the in-memory <see cref="InFlightTracker"/> until a step on the specified workflow
    /// reaches <paramref name="expectedStatus"/>. This checks the live object reference held by
    /// the processing pipeline — no database round-trip required.
    /// Useful for waiting until a step's command is actually executing (status = Processing)
    /// before triggering shutdown or cancellation in tests.
    /// </summary>
    public async Task WaitForInMemoryStepStatus(
        Guid workflowId,
        PersistentItemStatus expectedStatus,
        int stepIndex = 0,
        TimeSpan? timeout = null
    )
    {
        var tracker = fixture.Services.GetRequiredService<InFlightTracker>();
        using var cts = new CancellationTokenSource(timeout ?? TimeSpan.FromSeconds(15));

        while (true)
        {
            cts.Token.ThrowIfCancellationRequested();

            if (
                tracker.TryGetWorkflow(workflowId, out var workflow)
                && workflow!.Steps.Count > stepIndex
                && workflow.Steps[stepIndex].Status == expectedStatus
            )
                return;

            await Task.Delay(25, cts.Token);
        }
    }

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
