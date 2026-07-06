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
            $"{WorkflowsPath}/{workflowId}/resume?cascade=false",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.Equal(HttpStatusCode.OK, resumeResponse.StatusCode);

        var body = await resumeResponse.Content.ReadFromJsonAsync<ResumeWorkflowResponse>(
            TestContext.Current.CancellationToken
        );
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
        using var cancelResponse = await client.PostAsync(
            $"{WorkflowsPath}/{workflowId}/cancel",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.True(cancelResponse.IsSuccessStatusCode);

        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Canceled);

        // Reconfigure WireMock to respond fast
        _wireMock.Reset();
        SetupWireMock();

        // Resume
        using var resumeResponse = await client.PostAsync(
            $"{WorkflowsPath}/{workflowId}/resume?cascade=false",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
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

        using var enqueueMsg = new HttpRequestMessage(HttpMethod.Post, WorkflowsPath)
        {
            Content = JsonContent.Create(request),
        };
        enqueueMsg.Headers.Add(WorkflowMetadataConstants.Headers.IdempotencyKey, $"idem-{Guid.NewGuid()}");

        var enqueueResponse = await client.SendAsync(enqueueMsg, TestContext.Current.CancellationToken);
        enqueueResponse.EnsureSuccessStatusCode();

        var enqueueBody = await enqueueResponse.Content.ReadFromJsonAsync<WorkflowEnqueueResponse.Accepted>(
            TestContext.Current.CancellationToken
        );
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
            $"{WorkflowsPath}/{parentId}/resume?cascade=true",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.Equal(HttpStatusCode.OK, resumeResponse.StatusCode);

        var resumeBody = await resumeResponse.Content.ReadFromJsonAsync<ResumeWorkflowResponse>(
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(resumeBody);
        Assert.Equal(parentId, resumeBody.WorkflowId);
        Assert.Contains(childId, resumeBody.CascadeResumed);

        // Both should eventually complete
        await WaitForTerminalStatus(parentId, PersistentItemStatus.Completed);
        await WaitForTerminalStatus(childId, PersistentItemStatus.Completed);
    }

    [Fact]
    public async Task Abandon_FailedWorkflow_SuccessorEnqueuedAfterwardsRuns()
    {
        // A caller writing off a failed predecessor (e.g. a process transition abandoning a task whose
        // workflow failed terminally) marks it Abandoned, then enqueues the successor with an ordinary
        // dependency on it. Abandoned is terminal but not in the failed set, so the successor runs
        // instead of becoming DependencyFailed.
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/fail-parent-abandoned").UsingAnyMethod())
            .AtPriority(1)
            .RespondWith(Response.Create().WithStatusCode(500));

        await using var factory = CreateFactory();

        using var client = factory.CreateClient();
        var parentId = await EnqueueWorkflow(factory, CreateWebhookStep("/fail-parent-abandoned"));
        await WaitForTerminalStatus(parentId, PersistentItemStatus.Failed);

        using var abandonResponse = await client.PostAsync(
            $"{WorkflowsPath}/{parentId}/abandon",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.Equal(HttpStatusCode.OK, abandonResponse.StatusCode);

        var abandonBody = await abandonResponse.Content.ReadFromJsonAsync<AbandonWorkflowResponse>(
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(abandonBody);
        Assert.Equal(parentId, abandonBody.WorkflowId);
        await WaitForTerminalStatus(parentId, PersistentItemStatus.Abandoned);

        // Replaying the abandon is an idempotent success, not a conflict.
        using var replayResponse = await client.PostAsync(
            $"{WorkflowsPath}/{parentId}/abandon",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.Equal(HttpStatusCode.OK, replayResponse.StatusCode);

        // Successor enqueued after the marking, depending on the abandoned workflow by database ID.
        var successorId = await EnqueueDependentWorkflow(client, parentId, "/successor-step");
        await WaitForTerminalStatus(successorId, PersistentItemStatus.Completed);

        // Abandoning is a write-off, not a replacement: the predecessor's state is untouched by the run.
        await WaitForTerminalStatus(parentId, PersistentItemStatus.Abandoned);
    }

    [Fact]
    public async Task Abandon_DependencyFailedWorkflow_SuccessorEnqueuedAfterwardsRuns()
    {
        // Derived casualties can be written off too: when the head of a failed chain is DependencyFailed
        // (its own parent failed), abandoning that head lets a successor build past it while the root
        // cause stays Failed as historical record.
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/fail-grandparent-abandoned").UsingAnyMethod())
            .AtPriority(1)
            .RespondWith(Response.Create().WithStatusCode(500));

        await using var factory = CreateFactory();

        using var client = factory.CreateClient();
        var request = new WorkflowEnqueueRequest
        {
            Context = JsonSerializer.SerializeToElement(new { test = "abandon-dependency-failed" }),
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "grandparent",
                    OperationId = "grandparent-op",
                    Steps = [CreateWebhookStep("/fail-grandparent-abandoned")],
                },
                new WorkflowRequest
                {
                    Ref = "parent",
                    OperationId = "parent-op",
                    Steps = [CreateWebhookStep("/parent-step")],
                    DependsOn = ["grandparent"],
                },
            ],
        };

        using var enqueueMsg = new HttpRequestMessage(HttpMethod.Post, WorkflowsPath)
        {
            Content = JsonContent.Create(request),
        };
        enqueueMsg.Headers.Add(WorkflowMetadataConstants.Headers.IdempotencyKey, $"idem-{Guid.NewGuid()}");

        var enqueueResponse = await client.SendAsync(enqueueMsg, TestContext.Current.CancellationToken);
        enqueueResponse.EnsureSuccessStatusCode();

        var enqueueBody = await enqueueResponse.Content.ReadFromJsonAsync<WorkflowEnqueueResponse.Accepted>(
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(enqueueBody);

        var grandparentId = enqueueBody.Workflows.Single(w => w.Ref == "grandparent").DatabaseId;
        var parentId = enqueueBody.Workflows.Single(w => w.Ref == "parent").DatabaseId;

        await WaitForTerminalStatus(grandparentId, PersistentItemStatus.Failed);
        await WaitForTerminalStatus(parentId, PersistentItemStatus.DependencyFailed);

        using var abandonResponse = await client.PostAsync(
            $"{WorkflowsPath}/{parentId}/abandon",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.Equal(HttpStatusCode.OK, abandonResponse.StatusCode);
        await WaitForTerminalStatus(parentId, PersistentItemStatus.Abandoned);

        var successorId = await EnqueueDependentWorkflow(client, parentId, "/successor-step");
        await WaitForTerminalStatus(successorId, PersistentItemStatus.Completed);

        // The root cause is not part of the write-off.
        await WaitForTerminalStatus(grandparentId, PersistentItemStatus.Failed);
    }

    [Fact]
    public async Task Abandon_DoesNotReleaseExistingDependencyFailedDependent()
    {
        // Abandoning a workflow writes off its failure for FUTURE evaluations only. A dependent already
        // condemned to DependencyFailed expressed a success-required dependency that was never satisfied,
        // so the maintenance sweep must leave it parked (it only releases when every dependency Completed).
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/fail-parent-parked").UsingAnyMethod())
            .AtPriority(1)
            .RespondWith(Response.Create().WithStatusCode(500));

        // Aggressive sweep interval so a wrongful release would be observed within the assertion window.
        await using var factory = new EngineWebApplicationFactory<Program>(
            _postgres.GetConnectionString(),
            builder =>
            {
                builder.UseSetting("EngineSettings:Concurrency:MaxWorkers", "5");
                builder.UseSetting("EngineSettings:DefaultStepRetryStrategy:MaxRetries", "0");
                builder.UseSetting("EngineSettings:MaintenanceInterval", "00:00:00.2500000");
            }
        );

        using var client = factory.CreateClient();
        var request = new WorkflowEnqueueRequest
        {
            Context = JsonSerializer.SerializeToElement(new { test = "abandon-keeps-parked" }),
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "parent",
                    OperationId = "parent-op",
                    Steps = [CreateWebhookStep("/fail-parent-parked")],
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

        using var enqueueMsg = new HttpRequestMessage(HttpMethod.Post, WorkflowsPath)
        {
            Content = JsonContent.Create(request),
        };
        enqueueMsg.Headers.Add(WorkflowMetadataConstants.Headers.IdempotencyKey, $"idem-{Guid.NewGuid()}");

        var enqueueResponse = await client.SendAsync(enqueueMsg, TestContext.Current.CancellationToken);
        enqueueResponse.EnsureSuccessStatusCode();

        var enqueueBody = await enqueueResponse.Content.ReadFromJsonAsync<WorkflowEnqueueResponse.Accepted>(
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(enqueueBody);

        var parentId = enqueueBody.Workflows.Single(w => w.Ref == "parent").DatabaseId;
        var childId = enqueueBody.Workflows.Single(w => w.Ref == "child").DatabaseId;

        await WaitForTerminalStatus(parentId, PersistentItemStatus.Failed);
        await WaitForTerminalStatus(childId, PersistentItemStatus.DependencyFailed);

        using var abandonResponse = await client.PostAsync(
            $"{WorkflowsPath}/{parentId}/abandon",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.Equal(HttpStatusCode.OK, abandonResponse.StatusCode);
        await WaitForTerminalStatus(parentId, PersistentItemStatus.Abandoned);

        // Several sweep cycles pass; the child must still be parked.
        await Task.Delay(TimeSpan.FromSeconds(1.5), TestContext.Current.CancellationToken);
        await WaitForTerminalStatus(childId, PersistentItemStatus.DependencyFailed);
    }

    [Fact]
    public async Task Resume_AbandonedWorkflow_RunsToCompletion()
    {
        // Abandonment is a write-off, not a tombstone: the workflow can still be retried.
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/fail-then-resume-abandoned").UsingAnyMethod())
            .AtPriority(1)
            .RespondWith(Response.Create().WithStatusCode(500));

        await using var factory = CreateFactory();

        using var client = factory.CreateClient();
        var workflowId = await EnqueueWorkflow(factory, CreateWebhookStep("/fail-then-resume-abandoned"));
        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Failed);

        using var abandonResponse = await client.PostAsync(
            $"{WorkflowsPath}/{workflowId}/abandon",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.Equal(HttpStatusCode.OK, abandonResponse.StatusCode);
        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Abandoned);

        // Reconfigure WireMock to succeed, then resume.
        _wireMock.Reset();
        SetupWireMock();

        using var resumeResponse = await client.PostAsync(
            $"{WorkflowsPath}/{workflowId}/resume?cascade=false",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.Equal(HttpStatusCode.OK, resumeResponse.StatusCode);

        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Completed);
    }

    [Fact]
    public async Task Abandon_CompletedWorkflow_Returns409()
    {
        SetupWireMock();

        await using var factory = CreateFactory();
        var workflowId = await EnqueueWorkflow(factory, CreateWebhookStep("/quick-done-abandon"));

        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Completed);

        using var client = factory.CreateClient();
        using var abandonResponse = await client.PostAsync(
            $"{WorkflowsPath}/{workflowId}/abandon",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.Conflict, abandonResponse.StatusCode);
    }

    [Fact]
    public async Task Abandon_NonExistentWorkflow_Returns404()
    {
        await using var factory = CreateFactory();
        var fakeId = Guid.NewGuid();

        using var client = factory.CreateClient();
        using var abandonResponse = await client.PostAsync(
            $"{WorkflowsPath}/{fakeId}/abandon",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
        );

        Assert.Equal(HttpStatusCode.NotFound, abandonResponse.StatusCode);
    }

    [Fact]
    public async Task Resume_WithoutCascade_DependentSelfHealsViaMaintenanceSweep()
    {
        // Even without cascade, a dependent left in DependencyFailed must recover on its own once the
        // parent it depends on completes — the DbMaintenanceService dependency-recovery sweep re-enqueues it.
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/fail-parent-heal").UsingAnyMethod())
            .AtPriority(1)
            .RespondWith(Response.Create().WithStatusCode(500));

        // Run the maintenance sweep aggressively so the test does not wait a full minute.
        await using var factory = new EngineWebApplicationFactory<Program>(
            _postgres.GetConnectionString(),
            builder =>
            {
                builder.UseSetting("EngineSettings:Concurrency:MaxWorkers", "5");
                builder.UseSetting("EngineSettings:DefaultStepRetryStrategy:MaxRetries", "0");
                builder.UseSetting("EngineSettings:MaintenanceInterval", "00:00:00.2500000");
            }
        );

        using var client = factory.CreateClient();
        var request = new WorkflowEnqueueRequest
        {
            Context = JsonSerializer.SerializeToElement(new { test = "self-heal" }),
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "parent",
                    OperationId = "parent-op",
                    Steps = [CreateWebhookStep("/fail-parent-heal")],
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

        using var enqueueMsg = new HttpRequestMessage(HttpMethod.Post, WorkflowsPath)
        {
            Content = JsonContent.Create(request),
        };
        enqueueMsg.Headers.Add(WorkflowMetadataConstants.Headers.IdempotencyKey, $"idem-{Guid.NewGuid()}");

        var enqueueResponse = await client.SendAsync(enqueueMsg, TestContext.Current.CancellationToken);
        enqueueResponse.EnsureSuccessStatusCode();

        var enqueueBody = await enqueueResponse.Content.ReadFromJsonAsync<WorkflowEnqueueResponse.Accepted>(
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(enqueueBody);

        var parentId = enqueueBody.Workflows.Single(w => w.Ref == "parent").DatabaseId;
        var childId = enqueueBody.Workflows.Single(w => w.Ref == "child").DatabaseId;

        await WaitForTerminalStatus(parentId, PersistentItemStatus.Failed);
        await WaitForTerminalStatus(childId, PersistentItemStatus.DependencyFailed);

        // Reconfigure WireMock to succeed, then resume the parent WITHOUT cascade.
        _wireMock.Reset();
        SetupWireMock();

        using var resumeResponse = await client.PostAsync(
            $"{WorkflowsPath}/{parentId}/resume?cascade=false",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.Equal(HttpStatusCode.OK, resumeResponse.StatusCode);

        var resumeBody = await resumeResponse.Content.ReadFromJsonAsync<ResumeWorkflowResponse>(
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(resumeBody);
        Assert.Empty(resumeBody.CascadeResumed);

        // Parent completes from the resume; the child recovers only because the maintenance sweep
        // re-enqueues it once the parent dependency is Completed.
        await WaitForTerminalStatus(parentId, PersistentItemStatus.Completed);
        await WaitForTerminalStatus(childId, PersistentItemStatus.Completed, TimeSpan.FromSeconds(30));
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
            $"{WorkflowsPath}/{workflowId}/resume?cascade=false",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
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
            $"{WorkflowsPath}/{fakeId}/resume?cascade=false",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
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
            Context = JsonSerializer.SerializeToElement(new { test = "resume" }),
            Workflows = [new WorkflowRequest { OperationId = "resume-test", Steps = steps }],
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
    /// Enqueues a single workflow depending on an already-persisted workflow by database ID.
    /// </summary>
    private Task<Guid> EnqueueDependentWorkflow(HttpClient client, Guid dependsOnId, string path) =>
        EnqueueSingle(
            client,
            new WorkflowRequest
            {
                OperationId = "successor-op",
                Steps = [CreateWebhookStep(path)],
                DependsOn = [dependsOnId.ToString()],
            }
        );

    private static async Task<Guid> EnqueueSingle(HttpClient client, WorkflowRequest workflow)
    {
        var request = new WorkflowEnqueueRequest
        {
            Context = JsonSerializer.SerializeToElement(new { test = "abandon-successor" }),
            Workflows = [workflow],
        };

        using var msg = new HttpRequestMessage(HttpMethod.Post, WorkflowsPath)
        {
            Content = JsonContent.Create(request),
        };
        msg.Headers.Add(WorkflowMetadataConstants.Headers.IdempotencyKey, $"idem-{Guid.NewGuid()}");

        var response = await client.SendAsync(msg, TestContext.Current.CancellationToken);
        response.EnsureSuccessStatusCode();

        var body = await response.Content.ReadFromJsonAsync<WorkflowEnqueueResponse.Accepted>(
            TestContext.Current.CancellationToken
        );
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
