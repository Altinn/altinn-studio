using Microsoft.AspNetCore.Hosting;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Data.Entities;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// Fixture for the handler's cooperative throttle parking: throttling is <em>enabled</em> so the
/// process selects the fetch-query variant with the <c>throttled_until</c> predicate at startup,
/// and the sweep interval is set to one hour so the sweep's own snapshot refresh never overwrites
/// the open breaker a test publishes directly on the <see cref="ThrottleStateView"/> singleton.
/// </summary>
public sealed class ThrottlingEngineAppFixture : EngineAppFixture<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder) =>
        builder.ConfigureAppConfiguration(
            (_, config) =>
                config.AddJsonStream(
                    """
                    {
                      "EngineSettings": {
                        "Throttling": {
                          "Enabled": true,
                          "SweepInterval": "01:00:00",
                          "InitialWindow": "00:10:00"
                        }
                      }
                    }
                    """.ToJsonStream()
                )
        );
}

[CollectionDefinition(Name)]
public sealed class ThrottlingEngineCollection : ICollectionFixture<ThrottlingEngineAppFixture>
{
    public const string Name = "WorkflowEngineThrottling";
}

/// <summary>
/// End-to-end test of the workflow handler's cooperation with the failure-storm circuit breaker:
/// a retryable failure in a namespace whose breaker is open in the handler's snapshot must stamp
/// <c>throttled_until</c> through the real write-back path, and the gated fetch must then skip the
/// workflow. The sweep's own state machine is covered in <c>WorkflowEngine.Repository.Tests</c>;
/// here the sweep is idle and the snapshot is published directly.
/// </summary>
[Collection(ThrottlingEngineCollection.Name)]
public sealed class ThrottleCooperationTests(ThrottlingEngineAppFixture fixture) : IAsyncLifetime
{
    private static readonly TimeSpan _window = TimeSpan.FromMinutes(10);

    private readonly EngineApiClient _client = new(fixture);
    private readonly TestHelpers _testHelpers = new(fixture);

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    [Fact]
    public async Task RetryableFailure_OpenBreaker_StampPersists_AndGatedFetchSkipsTheWorkflow()
    {
        var ct = TestContext.Current.CancellationToken;

        // Arrange — the callback target fails retryably on every attempt...
        fixture.WireMock.Reset();
        fixture.WireMock.Given(Request.Create().UsingAnyMethod()).RespondWith(Response.Create().WithStatusCode(500));

        // ... and the enqueue namespace has an OPEN breaker in the handler-facing snapshot. In
        // production only the sweep publishes; with the sweep interval at one hour it stays idle
        // for the whole test, so this snapshot is what every handler sees.
        fixture
            .Services.GetRequiredService<ThrottleStateView>()
            .Publish(
                new Dictionary<string, TimeSpan>(StringComparer.Ordinal)
                {
                    [EngineApiClient.DefaultNamespace] = _window,
                }
            );

        var enqueuedAt = DateTimeOffset.UtcNow;
        var response = await _client.Enqueue(
            _testHelpers.CreateEnqueueRequest(
                _testHelpers.CreateWorkflow("wf", [_testHelpers.CreateWebhookStep("/throttled-500")])
            )
        );
        var workflowId = response.Workflows.Single().DatabaseId;

        // Act — wait for the first attempt to fail and its write-back to land in the database.
        var parked = await WaitForRequeuedWorkflow(workflowId, ct);
        var observedAt = DateTimeOffset.UtcNow;

        // Assert — the handler's stamp persisted through the real write-back path: now + window,
        // jittered ±JitterFraction (bounds widened by the stamp landing between the two probes).
        Assert.NotNull(parked.ThrottledUntil);
        Assert.InRange(
            parked.ThrottledUntil.Value,
            enqueuedAt + (_window * (1 - ThrottlingSettings.JitterFraction)),
            observedAt + (_window * (1 + ThrottlingSettings.JitterFraction))
        );

        // The retry clock is untouched: backoff keeps the engine's ~100 ms constant delay instead
        // of being inflated to window scale — throttle effects live only in throttled_until.
        Assert.NotNull(parked.BackoffUntil);
        Assert.True(
            parked.BackoffUntil.Value <= observedAt.AddSeconds(5),
            $"BackoffUntil {parked.BackoffUntil:O} looks throttle-inflated; expected the normal ~100 ms retry delay"
        );

        // Let the backoff elapse with margin. The engine's poller runs the whole time — without
        // the throttle gate it would burn the remaining retries within a few hundred milliseconds.
        await Task.Delay(1500, ct);

        // The gated fetch skips the parked workflow entirely...
        var repo = fixture.Services.GetRequiredService<IEngineRepository>();
        var fetched = await repo.FetchAndLockWorkflows(10, ct);
        Assert.DoesNotContain(fetched, w => w.DatabaseId == workflowId);

        // ... so it is still parked on its first requeue: exactly one probe attempt happened.
        await using var context = fixture.GetDbContext();
        var after = await context.Workflows.AsNoTracking().SingleAsync(w => w.Id == workflowId, cancellationToken: ct);
        Assert.Equal(PersistentItemStatus.Requeued, after.Status);
        Assert.Equal(parked.ThrottledUntil, after.ThrottledUntil);

        var step = await context.Steps.AsNoTracking().SingleAsync(s => s.JobId == workflowId, cancellationToken: ct);
        Assert.Equal(1, step.RequeueCount);
    }

    /// <summary>
    /// Polls the database until the workflow's Requeued write-back has landed, returning the row.
    /// </summary>
    private async Task<WorkflowEntity> WaitForRequeuedWorkflow(Guid workflowId, CancellationToken ct)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        cts.CancelAfter(TimeSpan.FromSeconds(15));

        await using var context = fixture.GetDbContext();
        while (true)
        {
            cts.Token.ThrowIfCancellationRequested();

            var workflow = await context
                .Workflows.AsNoTracking()
                .SingleOrDefaultAsync(w => w.Id == workflowId, cancellationToken: cts.Token);

            if (workflow?.Status == PersistentItemStatus.Requeued)
                return workflow;

            await Task.Delay(100, cts.Token);
        }
    }
}
