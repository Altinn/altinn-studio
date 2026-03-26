using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
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
/// Integration tests for workflow cancellation. Each test creates its own
/// <see cref="EngineWebApplicationFactory{TProgram}"/> because cancellation timing
/// is sensitive and tests must not share in-flight state.
/// </summary>
public sealed class EngineCancellationTests : IAsyncLifetime
{
    private const string TestNamespace = "ttd:cancellation-tests";

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
    public async Task Cancel_InFlightWorkflow_WorkflowAndStepAreCanceled()
    {
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/slow-cancel").UsingAnyMethod())
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(5)));

        await using var factory = CreateFactory();
        var workflowId = await EnqueueWorkflow(factory, CreateWebhookStep("/slow-cancel"));

        // Wait until the step's command is actually executing
        await WaitForStepProcessing(factory, workflowId);

        // Cancel via the API
        using var client = factory.CreateClient();
        using var cancelResponse = await client.PostAsync(
            $"/api/v1/workflows/{workflowId}/cancel",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.Equal(HttpStatusCode.OK, cancelResponse.StatusCode);

        var cancelBody = await cancelResponse.Content.ReadFromJsonAsync<CancelWorkflowResponse>(
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(cancelBody);
        Assert.Equal(workflowId, cancelBody.WorkflowId);
        Assert.True(cancelBody.CanceledImmediately);

        // Wait for the engine to finish processing and persist the final state
        await WaitForTerminalStatus(workflowId);

        await using var context = CreateDbContext();
        var workflow = await context
            .Workflows.Include(w => w.Steps)
            .SingleAsync(w => w.Id == workflowId, cancellationToken: TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Canceled, workflow.Status);
        Assert.NotNull(workflow.CancellationRequestedAt);

        var step = Assert.Single(workflow.Steps);
        Assert.Equal(PersistentItemStatus.Canceled, step.Status);
    }

    [Fact]
    public async Task Cancel_InFlightMultiStep_CompletedStepsPreserved_CurrentStepCanceled()
    {
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/fast-cancel").UsingAnyMethod())
            .RespondWith(Response.Create().WithStatusCode(200));
        _wireMock
            .Given(Request.Create().WithPath("/slow-cancel-2").UsingAnyMethod())
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(5)));

        await using var factory = CreateFactory();
        var workflowId = await EnqueueWorkflow(
            factory,
            CreateWebhookStep("/fast-cancel"),
            CreateWebhookStep("/slow-cancel-2")
        );

        // Wait for step 2's command to start executing (step 1 completes instantly)
        await WaitForStepProcessing(factory, workflowId, stepIndex: 1);

        // Cancel via the API
        using var client = factory.CreateClient();
        using var cancelResponse = await client.PostAsync(
            $"/api/v1/workflows/{workflowId}/cancel",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.True(cancelResponse.IsSuccessStatusCode);

        await WaitForTerminalStatus(workflowId);

        await using var context = CreateDbContext();
        var workflow = await context
            .Workflows.Include(w => w.Steps.OrderBy(s => s.ProcessingOrder))
            .SingleAsync(w => w.Id == workflowId, cancellationToken: TestContext.Current.CancellationToken);

        Assert.Equal(PersistentItemStatus.Canceled, workflow.Status);

        var steps = workflow.Steps.OrderBy(s => s.ProcessingOrder).ToList();
        Assert.Equal(2, steps.Count);
        Assert.Equal(PersistentItemStatus.Completed, steps[0].Status);
        Assert.Equal(PersistentItemStatus.Canceled, steps[1].Status);
    }

    [Fact]
    public async Task Cancel_AlreadyCompletedWorkflow_Returns409()
    {
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/quick-done").UsingAnyMethod())
            .RespondWith(Response.Create().WithStatusCode(200));

        await using var factory = CreateFactory();
        var workflowId = await EnqueueWorkflow(factory, CreateWebhookStep("/quick-done"));

        // Wait for the workflow to complete
        await WaitForTerminalStatus(workflowId);

        // Try to cancel it — should get 409 Conflict
        using var client = factory.CreateClient();
        using var cancelResponse = await client.PostAsync(
            $"/api/v1/workflows/{workflowId}/cancel",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.Conflict, cancelResponse.StatusCode);
    }

    [Fact]
    public async Task Cancel_IdempotentSecondRequest_Returns202OrConflict()
    {
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/slow-idem").UsingAnyMethod())
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(5)));

        await using var factory = CreateFactory();
        var workflowId = await EnqueueWorkflow(factory, CreateWebhookStep("/slow-idem"));

        await WaitForStepProcessing(factory, workflowId);

        using var client = factory.CreateClient();

        // First cancel — should succeed
        using var firstResponse = await client.PostAsync(
            $"/api/v1/workflows/{workflowId}/cancel",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

        var firstBody = await firstResponse.Content.ReadFromJsonAsync<CancelWorkflowResponse>(
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(firstBody);

        // Wait for the engine to persist the cancellation
        await WaitForTerminalStatus(workflowId);

        // Second cancel — returns 202 (already cancelling) or 409 (already terminal)
        using var secondResponse = await client.PostAsync(
            $"/api/v1/workflows/{workflowId}/cancel",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.NotEqual(HttpStatusCode.OK, secondResponse.StatusCode);
        Assert.True(
            secondResponse.StatusCode is HttpStatusCode.Accepted or HttpStatusCode.Conflict,
            $"Expected 202 or 409, got {(int)secondResponse.StatusCode}"
        );
    }

    [Fact]
    public async Task Cancel_NonExistentWorkflow_Returns404()
    {
        await using var factory = CreateFactory();
        var fakeId = Guid.NewGuid();

        using var client = factory.CreateClient();
        using var cancelResponse = await client.PostAsync(
            $"/api/v1/workflows/{fakeId}/cancel",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.NotFound, cancelResponse.StatusCode);
    }

    // -- Helpers --

    /// <summary>
    /// Resets WireMock and adds a low-priority catch-all 200 stub.
    /// Stale requeued workflows from earlier tests may hit unexpected paths — the catch-all
    /// ensures they complete quickly instead of blocking worker slots with retries.
    /// </summary>
    private void SetupWireMock()
    {
        _wireMock.Reset();
        _wireMock
            .Given(Request.Create().UsingAnyMethod())
            .AtPriority(int.MaxValue)
            .RespondWith(Response.Create().WithStatusCode(200));
    }

    private EngineWebApplicationFactory<Program> CreateFactory() =>
        new(
            _postgres.GetConnectionString(),
            builder => builder.UseSetting("EngineSettings:Concurrency:MaxWorkers", "5")
        );

    private static async Task<Guid> EnqueueWorkflow(
        EngineWebApplicationFactory<Program> factory,
        params StepRequest[] steps
    )
    {
        using var client = factory.CreateClient();

        var request = new WorkflowEnqueueRequest
        {
            IdempotencyKey = $"idem-{Guid.NewGuid()}",
            Namespace = TestNamespace,
            CorrelationId = Guid.NewGuid(),
            Context = JsonSerializer.SerializeToElement(new { test = "cancellation" }),
            Workflows = [new WorkflowRequest { OperationId = "cancel-test", Steps = steps }],
        };

        var response = await client.PostAsJsonAsync("/api/v1/workflows", request);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<WorkflowEnqueueResponse.Accepted>();
        Assert.NotNull(body);

        return body.Workflows.Single().DatabaseId;
    }

    /// <summary>
    /// Polls the in-memory <see cref="InFlightTracker"/> until the specified step (by index)
    /// reaches <see cref="PersistentItemStatus.Processing"/> status. This confirms the command
    /// is actually executing — no fixed delays needed.
    /// </summary>
    private static async Task WaitForStepProcessing(
        EngineWebApplicationFactory<Program> factory,
        Guid workflowId,
        int stepIndex = 0,
        TimeSpan? timeout = null
    )
    {
        var tracker = factory.Services.GetRequiredService<InFlightTracker>();
        using var cts = new CancellationTokenSource(timeout ?? TimeSpan.FromSeconds(15));

        while (true)
        {
            cts.Token.ThrowIfCancellationRequested();

            if (
                tracker.TryGetWorkflow(workflowId, out var workflow)
                && workflow!.Steps.Count > stepIndex
                && workflow.Steps[stepIndex].Status == PersistentItemStatus.Processing
            )
                return;

            await Task.Delay(25, cts.Token);
        }
    }

    /// <summary>
    /// Polls the database until the workflow reaches a terminal status
    /// (Completed, Failed, Canceled, or DependencyFailed).
    /// </summary>
    private async Task WaitForTerminalStatus(Guid workflowId, TimeSpan? timeout = null)
    {
        using var cts = new CancellationTokenSource(timeout ?? TimeSpan.FromSeconds(15));
        while (true)
        {
            cts.Token.ThrowIfCancellationRequested();

            await using var context = CreateDbContext();
            var status = await context
                .Workflows.Where(w => w.Id == workflowId)
                .Select(w => w.Status)
                .SingleOrDefaultAsync(cts.Token);

            if (
                status
                is PersistentItemStatus.Completed
                    or PersistentItemStatus.Failed
                    or PersistentItemStatus.Canceled
                    or PersistentItemStatus.DependencyFailed
            )
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
