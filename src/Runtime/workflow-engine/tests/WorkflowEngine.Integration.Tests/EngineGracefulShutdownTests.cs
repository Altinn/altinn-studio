using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging.Abstractions;
using Testcontainers.PostgreSql;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WireMock.Server;
using WorkflowEngine.Commands.Webhook;
using WorkflowEngine.Core;
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Tests that exercise the full graceful shutdown path: enqueue work, trigger
/// <see cref="IHostApplicationLifetime.StopApplication"/>, and verify final DB state.
/// Each test creates its own <see cref="EngineWebApplicationFactory{TProgram}"/> because shutdown is destructive.
/// The Postgres container and WireMock server are shared across all tests in this class.
/// </summary>
public sealed class EngineGracefulShutdownTests : IAsyncLifetime
{
    private const string TestNamespace = "ttd:shutdown-tests";

    private readonly PostgreSqlContainer _postgres = new PostgreSqlBuilder("postgres:18").Build();
    private WireMockServer _wireMock = null!;

    public async ValueTask InitializeAsync()
    {
        await _postgres.StartAsync();
        await new DbMigrationService(NullLogger<DbMigrationService>.Instance).Migrate(_postgres.GetConnectionString());
        _wireMock = WireMockServer.Start();
    }

    public async ValueTask DisposeAsync()
    {
        _wireMock.Stop();
        _wireMock.Dispose();
        await _postgres.DisposeAsync();
    }

    [Fact]
    public async Task Shutdown_WhileWorkflowProcessing_WorkflowAndStepAreRequeued()
    {
        // Arrange — slow webhook so the workflow is in-flight during shutdown
        _wireMock.Reset();
        _wireMock
            .Given(Request.Create().WithPath("/slow").UsingAnyMethod())
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(30)));

        await using var factory = CreateFactory();
        var lifetime = factory.Services.GetRequiredService<IHostApplicationLifetime>();
        var engineStatus = factory.Services.GetRequiredService<IEngineStatus>();

        var workflowId = await EnqueueWorkflow(factory, CreateWebhookStep("/slow"));

        // Wait until the engine is actively processing the workflow
        await PollUntil(() => engineStatus.ActiveWorkerCount > 0);

        // Act — trigger graceful shutdown
        var stoppedTcs = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        lifetime.ApplicationStopped.Register(() => stoppedTcs.TrySetResult());
        lifetime.StopApplication();

        // Wait for the host to fully stop (the 30s worker drain + buffer flush)
        await stoppedTcs.Task.WaitAsync(TimeSpan.FromSeconds(45), TestContext.Current.CancellationToken);

        // Assert — query DB directly since the host is dead
        await using var context = CreateDbContext();
        var workflow = await context
            .Workflows.Include(w => w.Steps)
            .SingleAsync(w => w.Id == workflowId, cancellationToken: TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Requeued, workflow.Status);

        var step = Assert.Single(workflow.Steps);
        Assert.Equal(PersistentItemStatus.Requeued, step.Status);
    }

    [Fact]
    public async Task Shutdown_WhileOnSecondStep_CompletedFirstStepIsPreserved()
    {
        // Arrange — step 1 returns instantly, step 2 is slow
        _wireMock.Reset();
        _wireMock
            .Given(Request.Create().WithPath("/fast").UsingAnyMethod())
            .RespondWith(Response.Create().WithStatusCode(200));
        _wireMock
            .Given(Request.Create().WithPath("/slow").UsingAnyMethod())
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(30)));

        await using var factory = CreateFactory();
        var lifetime = factory.Services.GetRequiredService<IHostApplicationLifetime>();
        var engineStatus = factory.Services.GetRequiredService<IEngineStatus>();

        var workflowId = await EnqueueWorkflow(factory, CreateWebhookStep("/fast"), CreateWebhookStep("/slow"));

        // Wait until the engine is actively processing (step 2 should be in-flight)
        await PollUntil(() => engineStatus.ActiveWorkerCount > 0);

        // Give it a moment to complete step 1 and enter step 2
        await Task.Delay(500, TestContext.Current.CancellationToken);

        // Act
        var stoppedTcs = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        lifetime.ApplicationStopped.Register(() => stoppedTcs.TrySetResult());
        lifetime.StopApplication();

        await stoppedTcs.Task.WaitAsync(TimeSpan.FromSeconds(45), TestContext.Current.CancellationToken);

        // Assert
        await using var context = CreateDbContext();
        var workflow = await context
            .Workflows.Include(w => w.Steps.OrderBy(s => s.ProcessingOrder))
            .SingleAsync(w => w.Id == workflowId, cancellationToken: TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Requeued, workflow.Status);

        Assert.Equal(2, workflow.Steps.Count);
        var steps = workflow.Steps.OrderBy(s => s.ProcessingOrder).ToList();

        Assert.Equal(PersistentItemStatus.Completed, steps[0].Status);
        Assert.Equal(PersistentItemStatus.Requeued, steps[1].Status);
    }

    [Fact]
    public async Task Shutdown_InFlightWorkflow_IsAlwaysRequeued_EvenIfAlmostDone()
    {
        // The processor passes stoppingToken directly to workers, so cancellation is immediate.
        // The 30s drain window ensures the requeue + DB write completes, but does NOT let
        // the underlying HTTP call finish. Even a near-instant webhook gets requeued.
        _wireMock.Reset();
        _wireMock
            .Given(Request.Create().WithPath("/moderate").UsingAnyMethod())
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(1)));

        await using var factory = CreateFactory();
        var lifetime = factory.Services.GetRequiredService<IHostApplicationLifetime>();
        var engineStatus = factory.Services.GetRequiredService<IEngineStatus>();

        var workflowId = await EnqueueWorkflow(factory, CreateWebhookStep("/moderate"));

        // Wait until the engine picks up the workflow
        await PollUntil(() => engineStatus.ActiveWorkerCount > 0);

        // Act — trigger shutdown while the 1s webhook is still in-flight
        var stoppedTcs = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        lifetime.ApplicationStopped.Register(() => stoppedTcs.TrySetResult());
        lifetime.StopApplication();

        await stoppedTcs.Task.WaitAsync(TimeSpan.FromSeconds(45), TestContext.Current.CancellationToken);

        // Assert — even though the webhook was almost done, cancellation is immediate
        await using var context = CreateDbContext();
        var workflow = await context
            .Workflows.Include(w => w.Steps)
            .SingleAsync(w => w.Id == workflowId, cancellationToken: TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Requeued, workflow.Status);

        var step = Assert.Single(workflow.Steps);
        Assert.Equal(PersistentItemStatus.Requeued, step.Status);
    }

    // -- Helpers --

    private EngineWebApplicationFactory<Program> CreateFactory() =>
        new(
            _postgres.GetConnectionString(),
            builder => builder.UseSetting("EngineSettings:Concurrency:MaxWorkers", "2")
        );

    private static async Task<Guid> EnqueueWorkflow(
        EngineWebApplicationFactory<Program> factory,
        params StepRequest[] steps
    )
    {
        using var client = factory.CreateEngineClient();

        var request = new WorkflowEnqueueRequest
        {
            IdempotencyKey = $"idem-{Guid.NewGuid()}",
            Namespace = TestNamespace,
            CorrelationId = Guid.NewGuid(),
            Context = JsonSerializer.SerializeToElement(new { test = "shutdown" }),
            Workflows = [new WorkflowRequest { OperationId = "shutdown-test", Steps = steps }],
        };

        var response = await client.PostAsJsonAsync("/api/v1/workflows", request);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<WorkflowEnqueueResponse.Accepted>();
        Assert.NotNull(body);

        return body.Workflows.Single().DatabaseId;
    }

    private StepRequest CreateWebhookStep(string path) =>
        new()
        {
            OperationId = path,
            Command = WebhookCommand.Create(
                new WebhookCommandData { Uri = $"http://localhost:{_wireMock.Port}{path}" }
            ),
        };

    private EngineDbContext CreateDbContext()
    {
        var options = new DbContextOptionsBuilder<EngineDbContext>().UseNpgsql(_postgres.GetConnectionString()).Options;
        return new EngineDbContext(options);
    }

    private static async Task PollUntil(Func<bool> condition, TimeSpan? timeout = null)
    {
        using var cts = new CancellationTokenSource(timeout ?? TimeSpan.FromSeconds(10));
        while (!condition())
        {
            cts.Token.ThrowIfCancellationRequested();
            await Task.Delay(50, cts.Token);
        }
    }
}
