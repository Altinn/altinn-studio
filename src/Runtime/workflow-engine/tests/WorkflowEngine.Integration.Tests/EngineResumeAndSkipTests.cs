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
using WorkflowEngine.TestApp;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Integration tests for the caller-driven terminal transitions — workflow resume and the operator skip.
/// Each test creates its own <see cref="EngineWebApplicationFactory{TProgram}"/> because their
/// timing is sensitive and tests must not share in-flight state.
/// </summary>
public sealed class EngineResumeAndSkipTests : IAsyncLifetime
{
    private const string TestNamespace = "ttd:resume-tests";
    private const string SkipReason = "Written off by the operator";

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
        Assert.Equal(HttpStatusCode.Accepted, resumeResponse.StatusCode);

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
        Assert.Equal(HttpStatusCode.Accepted, resumeResponse.StatusCode);

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
        Assert.Equal(HttpStatusCode.Accepted, resumeResponse.StatusCode);

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
    public async Task Skip_FailedWorkflow_SuccessorEnqueuedAfterwardsRuns()
    {
        // An operator writing off a failed predecessor skips it, then enqueues the successor with an
        // ordinary dependency on it. Skipped is terminal but not in the failed set, so the successor runs
        // instead of becoming DependencyFailed.
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/fail-parent-skipped").UsingAnyMethod())
            .AtPriority(1)
            .RespondWith(Response.Create().WithStatusCode(500));

        await using var factory = CreateFactory();

        using var client = factory.CreateClient();
        var parentId = await EnqueueWorkflow(factory, CreateWebhookStep("/fail-parent-skipped"));
        await WaitForTerminalStatus(parentId, PersistentItemStatus.Failed);

        using var collector = new TelemetryCollector();
        using var skipResponse = await PostSkip(client, parentId, SkipReason);
        Assert.Equal(HttpStatusCode.Accepted, skipResponse.StatusCode);

        var skipBody = await skipResponse.Content.ReadFromJsonAsync<SkipWorkflowResponse>(
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(skipBody);
        Assert.Equal(parentId, skipBody.WorkflowId);
        await WaitForTerminalStatus(parentId, PersistentItemStatus.Skipped);

        // Counted on each skip counter, tagged manual to tell the operator's skip from a command's. Contains
        // rather than Single: the meter is process-wide and this class runs in parallel with the shared
        // collection, whose dashboard test also skips a workflow by hand.
        Assert.Contains(
            collector.GetMeasurements("engine.workflows.execution.skipped"),
            m =>
                m.Value is 1L
                && m.Tags.Any(t => t.Key == "reason" && (string?)t.Value == "manual")
                && m.Tags.Any(t => t.Key == "is_head" && (string?)t.Value == "unset")
        );
        Assert.Contains(
            collector.GetMeasurements("engine.steps.execution.skipped"),
            m => m.Value is 1L && m.Tags.Any(t => t.Key == "reason" && (string?)t.Value == "manual")
        );

        // The failed step is Skipped with the operator's reason; its error history still says why it failed.
        var parent = await GetWorkflow(client, parentId);
        Assert.Null(parent.BackoffUntil);
        var step = Assert.Single(parent.Steps);
        Assert.Equal(PersistentItemStatus.Skipped, step.Status);
        Assert.Equal(SkipReason, step.SkipReason);
        Assert.NotNull(step.ErrorHistory);
        Assert.NotEmpty(step.ErrorHistory);

        // Replaying the skip is an idempotent 200 (vs. 202 for the effecting call above), not a conflict,
        // and reports the original skip time — not the replay time. (Millisecond tolerance covers the
        // microsecond truncation of the timestamptz round-trip.)
        using var replayResponse = await PostSkip(client, parentId, SkipReason);
        Assert.Equal(HttpStatusCode.OK, replayResponse.StatusCode);
        var replayBody = await replayResponse.Content.ReadFromJsonAsync<SkipWorkflowResponse>(
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(replayBody);
        Assert.Equal(skipBody.SkippedAt, replayBody.SkippedAt, TimeSpan.FromMilliseconds(1));

        // Successor enqueued after the skip, depending on the skipped workflow by database ID.
        var successorId = await EnqueueDependentWorkflow(client, parentId, "/successor-step");
        await WaitForTerminalStatus(successorId, PersistentItemStatus.Completed);

        // Skipping is a write-off, not a replacement: the predecessor's state is untouched by the run.
        await WaitForTerminalStatus(parentId, PersistentItemStatus.Skipped);
    }

    [Fact]
    public async Task Skip_DependencyFailedWorkflow_SuccessorEnqueuedAfterwardsRuns()
    {
        // Derived casualties can be written off too: when the head of a failed chain is DependencyFailed
        // (its own parent failed), skipping that head lets a successor build past it while the root
        // cause stays Failed as historical record.
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/fail-grandparent-skipped").UsingAnyMethod())
            .AtPriority(1)
            .RespondWith(Response.Create().WithStatusCode(500));

        await using var factory = CreateFactory();

        using var client = factory.CreateClient();
        var request = new WorkflowEnqueueRequest
        {
            Context = JsonSerializer.SerializeToElement(new { test = "skip-dependency-failed" }),
            Workflows =
            [
                new WorkflowRequest
                {
                    Ref = "grandparent",
                    OperationId = "grandparent-op",
                    Steps = [CreateWebhookStep("/fail-grandparent-skipped")],
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

        using var skipResponse = await PostSkip(client, parentId, SkipReason);
        Assert.Equal(HttpStatusCode.Accepted, skipResponse.StatusCode);
        await WaitForTerminalStatus(parentId, PersistentItemStatus.Skipped);

        // The never-run step takes the status and the reason, so the row reads like a command's skip.
        var step = Assert.Single((await GetWorkflow(client, parentId)).Steps);
        Assert.Equal(PersistentItemStatus.Skipped, step.Status);
        Assert.Equal(SkipReason, step.SkipReason);

        var successorId = await EnqueueDependentWorkflow(client, parentId, "/successor-step");
        await WaitForTerminalStatus(successorId, PersistentItemStatus.Completed);

        // The root cause is not part of the write-off.
        await WaitForTerminalStatus(grandparentId, PersistentItemStatus.Failed);
    }

    [Fact]
    public async Task Skip_ReleasesExistingDependencyFailedDependent()
    {
        // A skipped upstream satisfies a dependency exactly like a completed one, so a dependent already
        // parked in DependencyFailed behind it is re-enqueued by the recovery sweep and runs.
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/fail-parent-parked").UsingAnyMethod())
            .AtPriority(1)
            .RespondWith(Response.Create().WithStatusCode(500));

        // Aggressive sweep interval so the release is observed within the assertion window.
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
            Context = JsonSerializer.SerializeToElement(new { test = "skip-releases-parked" }),
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

        using var skipResponse = await PostSkip(client, parentId, SkipReason);
        Assert.Equal(HttpStatusCode.Accepted, skipResponse.StatusCode);
        await WaitForTerminalStatus(parentId, PersistentItemStatus.Skipped);

        // The sweep releases the child, which then runs against the catch-all 200 stub.
        await WaitForTerminalStatus(childId, PersistentItemStatus.Completed, TimeSpan.FromSeconds(30));
        await WaitForTerminalStatus(parentId, PersistentItemStatus.Skipped);
    }

    [Fact]
    public async Task Skip_CanceledWorkflow_EndsSkipped()
    {
        // A cancel caught mid-flight leaves a Canceled workflow with a step that never completed; an
        // operator skip without a reason settles it as Skipped with a null skipReason.
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/slow-then-skipped").UsingAnyMethod())
            .AtPriority(1)
            .RespondWith(Response.Create().WithStatusCode(200).WithDelay(TimeSpan.FromSeconds(5)));

        await using var factory = CreateFactory();
        var workflowId = await EnqueueWorkflow(factory, CreateWebhookStep("/slow-then-skipped"));
        await WaitForStepProcessing(factory, workflowId);

        using var client = factory.CreateClient();
        using var cancelResponse = await client.PostAsync(
            $"{WorkflowsPath}/{workflowId}/cancel",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.True(cancelResponse.IsSuccessStatusCode);
        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Canceled);

        using var skipResponse = await PostSkip(client, workflowId);
        Assert.Equal(HttpStatusCode.Accepted, skipResponse.StatusCode);
        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Skipped);

        var step = Assert.Single((await GetWorkflow(client, workflowId)).Steps);
        Assert.Equal(PersistentItemStatus.Skipped, step.Status);
        Assert.Null(step.SkipReason);
    }

    [Fact]
    public async Task Resume_SkippedWorkflow_Returns409()
    {
        // A skip is irreversible: the workflow is not resumable. If the work should run, the failed
        // workflow has to be resumed instead of skipped.
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/fail-then-resume-skipped").UsingAnyMethod())
            .AtPriority(1)
            .RespondWith(Response.Create().WithStatusCode(500));

        await using var factory = CreateFactory();

        using var client = factory.CreateClient();
        var workflowId = await EnqueueWorkflow(factory, CreateWebhookStep("/fail-then-resume-skipped"));
        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Failed);

        using var skipResponse = await PostSkip(client, workflowId, SkipReason);
        Assert.Equal(HttpStatusCode.Accepted, skipResponse.StatusCode);
        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Skipped);

        using var resumeResponse = await client.PostAsync(
            $"{WorkflowsPath}/{workflowId}/resume?cascade=false",
            content: null,
            cancellationToken: TestContext.Current.CancellationToken
        );
        Assert.Equal(HttpStatusCode.Conflict, resumeResponse.StatusCode);
        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Skipped);
    }

    [Fact]
    public async Task Skip_CompletedWorkflow_Returns409()
    {
        SetupWireMock();

        await using var factory = CreateFactory();
        var workflowId = await EnqueueWorkflow(factory, CreateWebhookStep("/quick-done-skip"));

        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Completed);

        using var client = factory.CreateClient();
        using var skipResponse = await PostSkip(client, workflowId, SkipReason);

        Assert.Equal(HttpStatusCode.Conflict, skipResponse.StatusCode);
    }

    [Fact]
    public async Task Skip_KeepsIdempotencyKey_ReplaySameBodyDedupsOntoSkipped()
    {
        // A skip is a write-off, not a retry ticket: the enqueue fingerprint stays, so an identical replay
        // keeps deduplicating onto the skipped workflow (200) for as long as the key row is retained.
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/fail-key-kept-replay").UsingAnyMethod())
            .AtPriority(1)
            .RespondWith(Response.Create().WithStatusCode(500));

        await using var factory = CreateFactory();
        using var client = factory.CreateClient();

        var idempotencyKey = $"idem-{Guid.NewGuid()}";
        using var enqueueResponse = await PostEnqueue(
            client,
            CreateWebhookStep("/fail-key-kept-replay"),
            idempotencyKey
        );
        Assert.Equal(HttpStatusCode.Created, enqueueResponse.StatusCode);
        var workflowId = await ReadSingleWorkflowId(enqueueResponse);
        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Failed);

        // Sanity: while the failure stands, an identical replay deduplicates onto the existing workflow.
        using var dedupResponse = await PostEnqueue(client, CreateWebhookStep("/fail-key-kept-replay"), idempotencyKey);
        Assert.Equal(HttpStatusCode.OK, dedupResponse.StatusCode);
        Assert.Equal(workflowId, await ReadSingleWorkflowId(dedupResponse));

        using var skipResponse = await PostSkip(client, workflowId, SkipReason);
        Assert.Equal(HttpStatusCode.Accepted, skipResponse.StatusCode);
        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Skipped);

        // Reconfigure WireMock to succeed: nothing re-executes, because nothing new is created.
        _wireMock.Reset();
        SetupWireMock();

        using var replayResponse = await PostEnqueue(
            client,
            CreateWebhookStep("/fail-key-kept-replay"),
            idempotencyKey
        );
        Assert.Equal(HttpStatusCode.OK, replayResponse.StatusCode);
        Assert.Equal(workflowId, await ReadSingleWorkflowId(replayResponse));
        Assert.Equal(PersistentItemStatus.Skipped, (await GetWorkflow(client, workflowId)).OverallStatus);
    }

    [Fact]
    public async Task Skip_KeepsIdempotencyKey_SameKeyDifferentBodyConflicts()
    {
        // The kept fingerprint also keeps refusing a corrected body under the same key: the caller must
        // use a new key, exactly as after a completed workflow.
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/fail-key-kept-conflict").UsingAnyMethod())
            .AtPriority(1)
            .RespondWith(Response.Create().WithStatusCode(500));

        await using var factory = CreateFactory();
        using var client = factory.CreateClient();

        var idempotencyKey = $"idem-{Guid.NewGuid()}";
        using var enqueueResponse = await PostEnqueue(
            client,
            CreateWebhookStep("/fail-key-kept-conflict"),
            idempotencyKey
        );
        Assert.Equal(HttpStatusCode.Created, enqueueResponse.StatusCode);
        var workflowId = await ReadSingleWorkflowId(enqueueResponse);
        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Failed);

        using var skipResponse = await PostSkip(client, workflowId, SkipReason);
        Assert.Equal(HttpStatusCode.Accepted, skipResponse.StatusCode);
        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Skipped);

        using var conflictResponse = await PostEnqueue(client, CreateWebhookStep("/corrected-step"), idempotencyKey);
        Assert.Equal(HttpStatusCode.Conflict, conflictResponse.StatusCode);
        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Skipped);
    }

    [Fact]
    public async Task Skip_NonExistentWorkflow_Returns404()
    {
        await using var factory = CreateFactory();
        var fakeId = Guid.NewGuid();

        using var client = factory.CreateClient();
        using var skipResponse = await PostSkip(client, fakeId, SkipReason);

        Assert.Equal(HttpStatusCode.NotFound, skipResponse.StatusCode);
    }

    [Fact]
    public async Task Skip_AlreadySkippedByCommand_ReturnsOk()
    {
        // One status, one replay rule: a workflow a command's skip outcome ended answers the operator's
        // skip with an idempotent 200 and keeps the command's reason.
        SetupWireMock();

        await using var factory = CreateFactory();
        var workflowId = await EnqueueWorkflow(
            factory,
            new StepRequest
            {
                OperationId = "skip-by-command",
                Command = CommandDefinition.Create(
                    "test-skip",
                    new SkippingCommandData { Reason = "acquireConcurrencyConflict" }
                ),
            }
        );
        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Skipped);

        using var client = factory.CreateClient();
        using var skipResponse = await PostSkip(client, workflowId, SkipReason);
        Assert.Equal(HttpStatusCode.OK, skipResponse.StatusCode);

        var step = Assert.Single((await GetWorkflow(client, workflowId)).Steps);
        Assert.Equal("acquireConcurrencyConflict", step.SkipReason);
    }

    [Fact]
    public async Task Skip_BlankReason_WritesNullReason()
    {
        // Unlike fail, skip invents no default text: a whitespace-only reason is recorded as none.
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/fail-blank-skip-reason").UsingAnyMethod())
            .AtPriority(1)
            .RespondWith(Response.Create().WithStatusCode(500));

        await using var factory = CreateFactory();
        using var client = factory.CreateClient();
        var workflowId = await EnqueueWorkflow(factory, CreateWebhookStep("/fail-blank-skip-reason"));
        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Failed);

        using var skipResponse = await PostSkip(client, workflowId, "   ");
        Assert.Equal(HttpStatusCode.Accepted, skipResponse.StatusCode);
        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Skipped);

        var step = Assert.Single((await GetWorkflow(client, workflowId)).Steps);
        Assert.Equal(PersistentItemStatus.Skipped, step.Status);
        Assert.Null(step.SkipReason);
    }

    [Fact]
    public async Task Skip_OverLongReason_Returns400()
    {
        SetupWireMock();
        _wireMock
            .Given(Request.Create().WithPath("/fail-long-skip-reason").UsingAnyMethod())
            .AtPriority(1)
            .RespondWith(Response.Create().WithStatusCode(500));

        await using var factory = CreateFactory();
        using var client = factory.CreateClient();
        var workflowId = await EnqueueWorkflow(factory, CreateWebhookStep("/fail-long-skip-reason"));
        await WaitForTerminalStatus(workflowId, PersistentItemStatus.Failed);

        using var skipResponse = await PostSkip(
            client,
            workflowId,
            new string('x', SkipWorkflowRequest.MaxReasonLength + 1)
        );

        Assert.Equal(HttpStatusCode.BadRequest, skipResponse.StatusCode);
        Assert.Equal(PersistentItemStatus.Failed, (await GetWorkflow(client, workflowId)).OverallStatus);
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
        Assert.Equal(HttpStatusCode.Accepted, resumeResponse.StatusCode);

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

    /// <summary>
    /// Posts a single-workflow enqueue request with an explicit idempotency key and returns the
    /// raw response, so tests can assert on 201 Created vs 200 Existing vs 409 Conflict.
    /// </summary>
    private static async Task<HttpResponseMessage> PostEnqueue(
        HttpClient client,
        StepRequest step,
        string idempotencyKey
    )
    {
        var request = new WorkflowEnqueueRequest
        {
            Context = JsonSerializer.SerializeToElement(new { test = "skip-key-kept" }),
            Workflows = [new WorkflowRequest { OperationId = "key-release-op", Steps = [step] }],
        };

        using var msg = new HttpRequestMessage(HttpMethod.Post, WorkflowsPath)
        {
            Content = JsonContent.Create(request),
        };
        msg.Headers.Add(WorkflowMetadataConstants.Headers.IdempotencyKey, idempotencyKey);

        return await client.SendAsync(msg, TestContext.Current.CancellationToken);
    }

    /// <summary>
    /// Posts a skip request, with the body omitted when <paramref name="reason"/> is null, and returns the
    /// raw response so tests can assert on 202 vs 200 vs 409 vs 400.
    /// </summary>
    private static Task<HttpResponseMessage> PostSkip(HttpClient client, Guid workflowId, string? reason = null) =>
        reason is null
            ? client.PostAsync(
                $"{WorkflowsPath}/{workflowId}/skip",
                content: null,
                cancellationToken: TestContext.Current.CancellationToken
            )
            : client.PostAsJsonAsync(
                $"{WorkflowsPath}/{workflowId}/skip",
                new SkipWorkflowRequest { Reason = reason },
                TestContext.Current.CancellationToken
            );

    /// <summary>
    /// Reads a workflow with its steps through the status endpoint.
    /// </summary>
    private static async Task<WorkflowStatusResponse> GetWorkflow(HttpClient client, Guid workflowId)
    {
        var workflow = await client.GetFromJsonAsync<WorkflowStatusResponse>(
            $"{WorkflowsPath}/{workflowId}",
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(workflow);
        return workflow;
    }

    /// <summary>
    /// Reads the single workflow database ID from an accepted enqueue response.
    /// </summary>
    private static async Task<Guid> ReadSingleWorkflowId(HttpResponseMessage response)
    {
        var body = await response.Content.ReadFromJsonAsync<WorkflowEnqueueResponse.Accepted>(
            TestContext.Current.CancellationToken
        );
        Assert.NotNull(body);
        return body.Workflows.Single().DatabaseId;
    }

    private static async Task<Guid> EnqueueSingle(HttpClient client, WorkflowRequest workflow)
    {
        var request = new WorkflowEnqueueRequest
        {
            Context = JsonSerializer.SerializeToElement(new { test = "skip-successor" }),
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
