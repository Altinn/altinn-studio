using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Testcontainers.PostgreSql;
using WireMock;
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
/// Simulates a worker that fires a webhook (external side effect) and then discovers
/// its lease has been revoked. The write-back must be rejected; the worker must exit
/// cleanly without overwriting the new owner's state.
/// </summary>
public sealed class EngineLeaseTokenTests : IAsyncLifetime
{
    private const string TestNamespace = "ttd:lease-token-tests";

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
    public async Task Worker_LosesLeaseMidStep_WritebackRejected_StateSurvives()
    {
        using var telemetry = new TelemetryCollector();

        // The WireMock callback swaps in this token behind the worker's back.
        // After the worker's writeback is rejected, this token must still be on the row.
        var swappedInToken = Guid.NewGuid();

        // Bridges the webhook callback (sync, different thread) to the test's async flow.
        var workflowIdKnown = new TaskCompletionSource<Guid>(TaskCreationOptions.RunContinuationsAsynchronously);
        var webhookHit = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);

        _wireMock.Reset();
        _wireMock
            .Given(Request.Create().WithPath("/zombie").UsingAnyMethod())
            .RespondWith(
                Response
                    .Create()
                    .WithCallback(_ =>
                    {
                        var id = workflowIdKnown.Task.GetAwaiter().GetResult();
                        using var ctx = CreateDbContext();
#pragma warning disable CA1849 // WireMock callback is sync; async alternative requires a different overload
                        ctx.Database.ExecuteSqlInterpolated(
                            $"""UPDATE "engine"."Workflows" SET "LeaseToken" = {swappedInToken} WHERE "Id" = {id}"""
                        );
#pragma warning restore CA1849
                        webhookHit.TrySetResult();
                        return new ResponseMessage { StatusCode = 200 };
                    })
            );

        await using var factory = CreateFactory();

        // Act
        var workflowId = await EnqueueWorkflow(factory, CreateWebhookStep("/zombie"));
        workflowIdKnown.SetResult(workflowId);

        // Webhook fires → callback swaps token → webhook returns 200 → worker attempts
        // writeback → CAS fails → LeaseLostException → processor exits cleanly.
        await webhookHit.Task.WaitAsync(TimeSpan.FromSeconds(15), TestContext.Current.CancellationToken);

        // The lease-lost counter should tick when the worker's writeback is rejected.
        await telemetry.WaitForCounterTotal("engine.workflows.execution.lease_lost", minValue: 1);

        // Assert: DB state reflects the reclaim, not the zombie's intended completion.
        await AssertZombieWritebackRejected(workflowId, swappedInToken);
    }

    // -- Helpers --

    private async Task AssertZombieWritebackRejected(Guid workflowId, Guid expectedToken)
    {
        // Give the writeback attempt time to land and be rejected.
        await Task.Delay(500, TestContext.Current.CancellationToken);

        await using var context = CreateDbContext();
        var wf = await context
            .Workflows.Include(w => w.Steps)
            .SingleAsync(w => w.Id == workflowId, TestContext.Current.CancellationToken);

        Assert.NotEqual(PersistentItemStatus.Completed, wf.Status);
        Assert.Equal(expectedToken, wf.LeaseToken);
        Assert.All(wf.Steps, s => Assert.NotEqual(PersistentItemStatus.Completed, s.Status));
    }

    private EngineWebApplicationFactory<Program> CreateFactory() =>
        new(
            _postgres.GetConnectionString(),
            builder => builder.UseSetting("EngineSettings:Concurrency:MaxWorkers", "1")
        );

    private static async Task<Guid> EnqueueWorkflow(
        EngineWebApplicationFactory<Program> factory,
        params StepRequest[] steps
    )
    {
        using var client = factory.CreateClient();
        var request = new WorkflowEnqueueRequest
        {
            Context = JsonSerializer.SerializeToElement(new { test = "lease-token" }),
            Workflows = [new WorkflowRequest { OperationId = "lease-test", Steps = steps }],
        };
        using var msg = new HttpRequestMessage(HttpMethod.Post, WorkflowsPath);
        msg.Content = JsonContent.Create(request);
        msg.Headers.Add(WorkflowMetadataConstants.Headers.IdempotencyKey, $"idem-{Guid.NewGuid()}");

        var response = await client.SendAsync(msg);
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
}
