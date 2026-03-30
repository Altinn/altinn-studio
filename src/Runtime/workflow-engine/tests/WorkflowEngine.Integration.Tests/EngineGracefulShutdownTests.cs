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
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Tests that exercise the full graceful shutdown path: enqueue work, call
/// <see cref="IHost.StopAsync"/>, and verify final DB state.
/// Each test creates its own <see cref="EngineWebApplicationFactory{TProgram}"/> because shutdown is destructive.
/// The Postgres container and WireMock server are shared across all tests in this class.
/// </summary>
public sealed class EngineGracefulShutdownTests : IAsyncLifetime
{
    private const string TestNamespace = "ttd:shutdown-tests";

    private static string WorkflowsPath => $"/api/v1/{Uri.EscapeDataString(TestNamespace)}/workflows";

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
        _wireMock.Reset();
        _wireMock
            .Given(Request.Create().WithPath("/slow").UsingAnyMethod())
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(5)));

        await using var factory = CreateFactory();
        var workflowId = await EnqueueWorkflow(factory, CreateWebhookStep("/slow"));

        await WaitForStepProcessing(factory, workflowId);

        // Graceful shutdown — directly stops the host and all its services
        await factory.Services.GetRequiredService<IHost>().StopAsync(TestContext.Current.CancellationToken);

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
        _wireMock.Reset();
        _wireMock
            .Given(Request.Create().WithPath("/fast").UsingAnyMethod())
            .RespondWith(Response.Create().WithStatusCode(200));
        _wireMock
            .Given(Request.Create().WithPath("/slow2").UsingAnyMethod())
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(5)));

        await using var factory = CreateFactory();
        var workflowId = await EnqueueWorkflow(factory, CreateWebhookStep("/fast"), CreateWebhookStep("/slow2"));

        // Wait for step 1 to complete and step 2's slow HTTP call to start.
        // WaitForStepProcessing checks the second step specifically since step 1 completes instantly.
        await WaitForStepProcessing(factory, workflowId, stepIndex: 1);

        await factory.Services.GetRequiredService<IHost>().StopAsync(TestContext.Current.CancellationToken);

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
        _wireMock.Reset();
        _wireMock
            .Given(Request.Create().WithPath("/moderate").UsingAnyMethod())
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(5)));

        await using var factory = CreateFactory();
        var workflowId = await EnqueueWorkflow(factory, CreateWebhookStep("/moderate"));

        await WaitForStepProcessing(factory, workflowId);

        await factory.Services.GetRequiredService<IHost>().StopAsync(TestContext.Current.CancellationToken);

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
        using var client = factory.CreateClient();

        var request = new WorkflowEnqueueRequest
        {
            Context = JsonSerializer.SerializeToElement(new { test = "shutdown" }),
            Workflows = [new WorkflowRequest { OperationId = "shutdown-test", Steps = steps }],
        };

        using var msg = new HttpRequestMessage(HttpMethod.Post, WorkflowsPath)
        {
            Content = JsonContent.Create(request),
        };
        msg.Headers.Add(WorkflowMetadataConstants.Headers.IdempotencyKey, $"idem-{Guid.NewGuid()}");

        var response = await client.SendAsync(msg);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<WorkflowEnqueueResponse.Accepted>();
        Assert.NotNull(body);

        return body.Workflows.Single().DatabaseId;
    }

    /// <summary>
    /// Polls the database until the specified step (by processing order) reaches
    /// <see cref="PersistentItemStatus.Processing"/> status. Checking the DB rather than
    /// in-memory state guarantees the write buffer has flushed, which is the precondition
    /// the shutdown tests need before calling <see cref="IHost.StopAsync"/>.
    /// </summary>
    private async Task WaitForStepProcessing(
        EngineWebApplicationFactory<Program> factory,
        Guid workflowId,
        int stepIndex = 0,
        TimeSpan? timeout = null
    )
    {
        _ = factory; // kept in signature for consistency; DB is queried directly
        using var cts = new CancellationTokenSource(timeout ?? TimeSpan.FromSeconds(15));

        while (true)
        {
            cts.Token.ThrowIfCancellationRequested();

            await using var context = CreateDbContext();
            var step = await context
                .Steps.Where(s => s.JobId == workflowId && s.ProcessingOrder == stepIndex)
                .Select(s => new { s.Status })
                .SingleOrDefaultAsync(cts.Token);

            if (step?.Status == PersistentItemStatus.Processing)
                return;

            await Task.Delay(50, cts.Token);
        }
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
}
