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
using WorkflowEngine.Data.Context;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Integration tests for workflow resume. Each test creates its own
/// <see cref="EngineWebApplicationFactory{TProgram}"/> because resume timing
/// is sensitive and tests must not share in-flight state.
/// </summary>
public sealed class EngineResumeTests : IAsyncLifetime
{
    private const string TestNamespace = "ttd:resume-tests";

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
    public async Task Resume_FailedWorkflow_CompletesSuccessfully()
    {
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/will-fail").UsingAnyMethod())
            .AtPriority(1)
            .RespondWith(Response.Create().WithStatusCode(500));

        await using var factory = CreateFactory();
        var workflowId = await EnqueueWorkflow(factory, CreateWebhookStep("/will-fail"));

        // Wait for the workflow to fail (MaxRetries: 0 means immediate failure)
        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Failed);

        // Reconfigure WireMock to succeed
        _wireMock.Reset();
        SetupWireMock();

        // Resume via the API
        using var client = factory.CreateClient();
        using var resumeResponse = await client.PostAsync(
            $"/api/v1/workflows/{workflowId}/resume?cascade=false",
            content: null
        );
        Assert.Equal(HttpStatusCode.OK, resumeResponse.StatusCode);

        var body = await resumeResponse.Content.ReadFromJsonAsync<ResumeWorkflowResponse>();
        Assert.NotNull(body);
        Assert.Equal(workflowId, body.WorkflowId);
        Assert.Empty(body.CascadeResumed);

        // Wait for the workflow to complete
        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Completed);

        await using var context = CreateDbContext();
        var workflow = await context
            .Workflows.Include(w => w.Steps)
            .SingleAsync(w => w.Id == workflowId, cancellationToken: TestContext.Current.CancellationToken);
        Assert.Equal(PersistentItemStatus.Completed, workflow.Status);
    }

    [Fact]
    public async Task Resume_CanceledWorkflow_CompletesSuccessfully()
    {
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/slow-resume").UsingAnyMethod())
            .AtPriority(1)
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(5)));

        await using var factory = CreateFactory();
        var workflowId = await EnqueueWorkflow(factory, CreateWebhookStep("/slow-resume"));

        // Wait for step to start processing, then cancel
        await WaitForStepProcessing(factory, workflowId);

        using var client = factory.CreateClient();
        using var cancelResponse = await client.PostAsync($"/api/v1/workflows/{workflowId}/cancel", content: null);
        Assert.True(cancelResponse.IsSuccessStatusCode);

        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Canceled);

        // Reconfigure WireMock to respond fast
        _wireMock.Reset();
        SetupWireMock();

        // Resume
        using var resumeResponse = await client.PostAsync(
            $"/api/v1/workflows/{workflowId}/resume?cascade=false",
            content: null
        );
        Assert.Equal(HttpStatusCode.OK, resumeResponse.StatusCode);

        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Completed);
    }

    [Fact]
    public async Task Resume_WithCascade_ResumesDependentWorkflows()
    {
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/fail-parent").UsingAnyMethod())
            .AtPriority(1)
            .RespondWith(Response.Create().WithStatusCode(500));

        await using var factory = CreateFactory();

        // Enqueue A (will fail) and B (depends on A, will DependencyFail)
        using var client = factory.CreateClient();
        var request = new WorkflowEnqueueRequest
        {
            IdempotencyKey = $"idem-{Guid.NewGuid()}",
            Namespace = TestNamespace,
            CorrelationId = Guid.NewGuid(),
            Context = JsonSerializer.SerializeToElement(new { test = "cascade-resume" }),
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "parent",
                    OperationId = "parent-op",
                    Steps = [CreateWebhookStep("/fail-parent")],
                },
                new WorkflowRequest
                {
                    Ref = "child",
                    OperationId = "child-op",
                    Steps = [CreateWebhookStep("/child-step")],
                    DependsOn = ["parent"],
                },
            ],
        };

        var enqueueResponse = await client.PostAsJsonAsync("/api/v1/workflows", request);
        enqueueResponse.EnsureSuccessStatusCode();

        var enqueueBody = await enqueueResponse.Content.ReadFromJsonAsync<WorkflowEnqueueResponse.Accepted>();
        Assert.NotNull(enqueueBody);

        var parentId = enqueueBody.Workflows.Single(w => w.Ref == "parent").DatabaseId;
        var childId = enqueueBody.Workflows.Single(w => w.Ref == "child").DatabaseId;

        // Wait for parent to fail and child to become DependencyFailed
        await WaitForTerminalStatus(parentId, PersistentItemStatus.Failed);
        await WaitForTerminalStatus(childId, PersistentItemStatus.DependencyFailed);

        // Reconfigure WireMock to succeed
        _wireMock.Reset();
        SetupWireMock();

        // Resume parent with cascade
        using var resumeResponse = await client.PostAsync(
            $"/api/v1/workflows/{parentId}/resume?cascade=true",
            content: null
        );
        Assert.Equal(HttpStatusCode.OK, resumeResponse.StatusCode);

        var resumeBody = await resumeResponse.Content.ReadFromJsonAsync<ResumeWorkflowResponse>();
        Assert.NotNull(resumeBody);
        Assert.Equal(parentId, resumeBody.WorkflowId);
        Assert.Contains(childId, resumeBody.CascadeResumed);

        // Both should eventually complete
        await WaitForTerminalStatus(parentId, PersistentItemStatus.Completed);
        await WaitForTerminalStatus(childId, PersistentItemStatus.Completed);
    }

    [Fact]
    public async Task Resume_CompletedWorkflow_Returns409()
    {
        SetupWireMock();

        await using var factory = CreateFactory();
        var workflowId = await EnqueueWorkflow(factory, CreateWebhookStep("/quick-done"));

        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Completed);

        using var client = factory.CreateClient();
        using var resumeResponse = await client.PostAsync(
            $"/api/v1/workflows/{workflowId}/resume?cascade=false",
            content: null
        );

        Assert.Equal(HttpStatusCode.Conflict, resumeResponse.StatusCode);
    }

    [Fact]
    public async Task Resume_NonExistentWorkflow_Returns404()
    {
        await using var factory = CreateFactory();
        var fakeId = Guid.NewGuid();

        using var client = factory.CreateClient();
        using var resumeResponse = await client.PostAsync(
            $"/api/v1/workflows/{fakeId}/resume?cascade=false",
            content: null
        );

        Assert.Equal(HttpStatusCode.NotFound, resumeResponse.StatusCode);
    }

    // -- Helpers --

    /// <summary>
    /// Resets WireMock and adds a low-priority catch-all 200 stub.
    /// </summary>
    private void SetupWireMock()
    {
        _wireMock
            .Given(Request.Create().UsingAnyMethod())
            .AtPriority(int.MaxValue)
            .RespondWith(Response.Create().WithStatusCode(200));
    }

    private EngineWebApplicationFactory<Program> CreateFactory() =>
        new(
            _postgres.GetConnectionString(),
            builder =>
            {
                builder.UseSetting("EngineSettings:Concurrency:MaxWorkers", "5");
                // No retries so workflows fail immediately on first error
                builder.UseSetting("EngineSettings:DefaultStepRetryStrategy:MaxRetries", "0");
            }
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
            Context = JsonSerializer.SerializeToElement(new { test = "resume" }),
            Workflows = [new WorkflowRequest { OperationId = "resume-test", Steps = steps }],
        };

        var response = await client.PostAsJsonAsync("/api/v1/workflows", request);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<WorkflowEnqueueResponse.Accepted>();
        Assert.NotNull(body);

        return body.Workflows.Single().DatabaseId;
    }

    /// <summary>
    /// Polls the in-memory <see cref="Core.InFlightTracker"/> until the specified step
    /// reaches <see cref="PersistentItemStatus.Processing"/> status.
    /// </summary>
    private static async Task WaitForStepProcessing(
        EngineWebApplicationFactory<Program> factory,
        Guid workflowId,
        int stepIndex = 0,
        TimeSpan? timeout = null
    )
    {
        var tracker = factory.Services.GetRequiredService<WorkflowEngine.Core.InFlightTracker>();
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
    /// Polls the database until the workflow reaches the expected terminal status.
    /// </summary>
    private async Task WaitForTerminalStatus(
        Guid workflowId,
        PersistentItemStatus expectedStatus,
        TimeSpan? timeout = null
    )
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

            if (status == expectedStatus)
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
