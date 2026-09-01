using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using WireMock.RequestBuilders;
using WireMock.ResponseBuilders;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Integration.Tests.Fixtures;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;
using WorkflowEngine.TestKit;

namespace WorkflowEngine.Integration.Tests;

/// <summary>
/// End-to-end tests of the throttle manual-override endpoints against a host with throttling
/// <em>enabled</em> (shares <see cref="ThrottlingEngineAppFixture"/> — sweep interval one hour, so
/// the sweep stays idle and every state change observed here came from the endpoints). Covers
/// force-trip (trip + canaries + parking), force-clear (stamp clearing + the lingering closed
/// row), idempotent replays, and the GET observability shapes.
/// </summary>
[Collection(ThrottlingEngineCollection.Name)]
public sealed class ThrottleOverrideEndpointTests(ThrottlingEngineAppFixture fixture) : IAsyncLifetime
{
    /// <summary>Matches the fixture's InitialWindow ("00:10:00").</summary>
    private static readonly TimeSpan _initialWindow = TimeSpan.FromMinutes(10);

    /// <summary>The default CanaryCount (the fixture does not override it).</summary>
    private const int CanaryCount = 3;

    private readonly EngineApiClient _client = new(fixture);
    private readonly TestHelpers _testHelpers = new(fixture);

    public async ValueTask InitializeAsync()
    {
        await fixture.Reset();

        // The fixture is shared with tests that publish an open breaker directly onto the
        // handler-facing snapshot (ThrottleCooperationTests); start from a clean slate so
        // cooperative parking cannot interfere with the counts asserted here.
        fixture
            .Services.GetRequiredService<ThrottleStateView>()
            .Publish(new Dictionary<string, TimeSpan>(StringComparer.Ordinal));
    }

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    [Fact]
    public async Task ForceTrip_TripsBreaker_SelectsCanaries_AndParksTheRest()
    {
        var ct = TestContext.Current.CancellationToken;
        var ns = UniqueNamespace();
        var workflowIds = await SeedRequeuedWorkflows(ns, count: 5);

        using var response = await _client.TripThrottleRaw(ns);
        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);

        var body = await EngineApiClient.AssertSuccessAndDeserialize<NamespaceThrottleResponse>(response);
        Assert.Equal(ns, body.Namespace);
        Assert.Equal(NamespaceThrottleState.Tripped, body.State);
        Assert.Equal(_initialWindow, body.CurrentWindow);
        Assert.Equal(CanaryCount, body.CanaryCount);
        Assert.Equal(5, body.LastRequeuedCount);
        Assert.Equal(5, body.LastActiveCount);

        // Canaries stay on the normal retry schedule; the rest of the horde is parked.
        await using var context = fixture.GetDbContext();
        var stamps = await context
            .Workflows.AsNoTracking()
            .Where(w => workflowIds.Contains(w.Id))
            .Select(w => w.ThrottledUntil)
            .ToListAsync(ct);
        Assert.Equal(5, stamps.Count);
        Assert.Equal(5 - CanaryCount, stamps.Count(s => s is not null));

        // The override published the open breaker to this replica's handler snapshot immediately.
        var view = fixture.Services.GetRequiredService<ThrottleStateView>();
        Assert.Equal(_initialWindow, Assert.Single(view.TrippedBreakers, b => b.Key == ns).Value);

        // Observability endpoints report the same state.
        var fetched = await _client.GetThrottle(ns);
        Assert.NotNull(fetched);
        Assert.Equal(NamespaceThrottleState.Tripped, fetched.State);

        var listed = await _client.ListThrottles();
        Assert.Contains(listed, t => t.Namespace == ns && t.State == NamespaceThrottleState.Tripped);
    }

    [Fact]
    public async Task ForceTrip_AlreadyOpen_ReTripsWith202()
    {
        var ns = UniqueNamespace();
        await SeedRequeuedWorkflows(ns, count: 4);

        using (var first = await _client.TripThrottleRaw(ns))
        {
            Assert.Equal(HttpStatusCode.Accepted, first.StatusCode);
        }

        // Documented as unconditional: a second force-trip re-trips (initial window, fresh canaries).
        using var second = await _client.TripThrottleRaw(ns);
        Assert.Equal(HttpStatusCode.Accepted, second.StatusCode);
        var body = await EngineApiClient.AssertSuccessAndDeserialize<NamespaceThrottleResponse>(second);
        Assert.Equal(NamespaceThrottleState.Tripped, body.State);
        Assert.Equal(_initialWindow, body.CurrentWindow);
    }

    [Fact]
    public async Task ForceTrip_EmptyNamespace_TripsWithNothingToPark()
    {
        // Nothing enqueued in the namespace at all: the breaker still trips (state row written,
        // zero canaries, zero parked) — an operator may pre-emptively open before a storm builds.
        var ns = UniqueNamespace();

        using var response = await _client.TripThrottleRaw(ns);

        Assert.Equal(HttpStatusCode.Accepted, response.StatusCode);
        var body = await EngineApiClient.AssertSuccessAndDeserialize<NamespaceThrottleResponse>(response);
        Assert.Equal(NamespaceThrottleState.Tripped, body.State);
        Assert.Equal(0, body.CanaryCount);
        Assert.Equal(0, body.LastRequeuedCount);
    }

    [Fact]
    public async Task ForceClear_ClearsAllStamps_AndRowLingersClosed()
    {
        var ct = TestContext.Current.CancellationToken;
        var ns = UniqueNamespace();
        var workflowIds = await SeedRequeuedWorkflows(ns, count: 5);

        using (var open = await _client.TripThrottleRaw(ns))
        {
            Assert.Equal(HttpStatusCode.Accepted, open.StatusCode);
        }

        using var close = await _client.ClearThrottleRaw(ns);
        Assert.Equal(HttpStatusCode.Accepted, close.StatusCode);
        var body = await EngineApiClient.AssertSuccessAndDeserialize<NamespaceThrottleResponse>(close);
        Assert.Equal(NamespaceThrottleState.Clear, body.State);
        Assert.Equal(0, body.CanaryCount);

        // Every throttled_until stamp in the namespace is cleared immediately...
        await using var context = fixture.GetDbContext();
        var stamped = await context
            .Workflows.AsNoTracking()
            .CountAsync(w => workflowIds.Contains(w.Id) && w.ThrottledUntil != null, ct);
        Assert.Equal(0, stamped);

        // ... the breaker leaves the handler-facing open set...
        var view = fixture.Services.GetRequiredService<ThrottleStateView>();
        Assert.DoesNotContain(ns, view.TrippedBreakers.Keys);

        // ... and the state row lingers Closed (grace period) instead of being deleted.
        var fetched = await _client.GetThrottle(ns);
        Assert.NotNull(fetched);
        Assert.Equal(NamespaceThrottleState.Clear, fetched.State);
    }

    [Fact]
    public async Task ForceClear_AlreadyClear_IsIdempotent200()
    {
        var ns = UniqueNamespace();
        await SeedRequeuedWorkflows(ns, count: 4);

        using (var open = await _client.TripThrottleRaw(ns))
        {
            Assert.Equal(HttpStatusCode.Accepted, open.StatusCode);
        }
        using (var close = await _client.ClearThrottleRaw(ns))
        {
            Assert.Equal(HttpStatusCode.Accepted, close.StatusCode);
        }

        using var replay = await _client.ClearThrottleRaw(ns);
        Assert.Equal(HttpStatusCode.OK, replay.StatusCode);
        var body = await EngineApiClient.AssertSuccessAndDeserialize<NamespaceThrottleResponse>(replay);
        Assert.Equal(NamespaceThrottleState.Clear, body.State);
    }

    [Fact]
    public async Task ForceClear_UnknownNamespace_Returns404()
    {
        using var response = await _client.ClearThrottleRaw(UniqueNamespace());
        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }

    [Fact]
    public async Task Get_UnknownNamespace_Returns404_AndEmptyListIs204()
    {
        using var get = await _client.GetThrottleRaw(UniqueNamespace());
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);

        using var list = await _client.ListThrottlesRaw();
        Assert.Equal(HttpStatusCode.NoContent, list.StatusCode);
    }

    private static string UniqueNamespace() => $"throttle-ops-{Guid.NewGuid():N}";

    /// <summary>
    /// Enqueues <paramref name="count"/> workflows against a failing callback target and waits
    /// until all of them are parked in <c>Requeued</c>. The two-minute constant retry interval
    /// keeps them stably parked (no mid-test attempt can race the override), and the 24h
    /// MaxDuration keeps the deadline clamp far away so parking stamps land unclamped.
    /// </summary>
    private async Task<HashSet<Guid>> SeedRequeuedWorkflows(string ns, int count)
    {
        fixture.WireMock.Reset();
        fixture.WireMock.Given(Request.Create().UsingAnyMethod()).RespondWith(Response.Create().WithStatusCode(500));

        var retryStrategy = RetryStrategy.Constant(
            interval: TimeSpan.FromMinutes(2),
            maxDuration: TimeSpan.FromHours(24)
        );
        var workflows = Enumerable
            .Range(0, count)
            .Select(i =>
                _testHelpers.CreateWorkflow(
                    $"wf-{i}",
                    [_testHelpers.CreateWebhookStep($"/throttled-{i}", retryStrategy: retryStrategy)]
                )
            );

        var response = await _client.Enqueue(_testHelpers.CreateEnqueueRequest(workflows), ns: ns);
        var ids = response.Workflows.Select(w => w.DatabaseId).ToHashSet();

        // Wait for the first (failed) attempt of every workflow to be written back.
        await WaitForRequeued(ids);
        return ids;
    }

    private async Task WaitForRequeued(HashSet<Guid> workflowIds)
    {
        using var cts = CancellationTokenSource.CreateLinkedTokenSource(TestContext.Current.CancellationToken);
        cts.CancelAfter(TimeSpan.FromSeconds(20));

        await using var context = fixture.GetDbContext();
        while (true)
        {
            cts.Token.ThrowIfCancellationRequested();

            var requeued = await context
                .Workflows.AsNoTracking()
                .CountAsync(w => workflowIds.Contains(w.Id) && w.Status == PersistentItemStatus.Requeued, cts.Token);
            if (requeued == workflowIds.Count)
                return;

            await Task.Delay(100, cts.Token);
        }
    }
}

/// <summary>
/// The override endpoints against the default host, where throttling is <em>disabled</em>
/// (ships dark): force actions are rejected with a 409 explaining why (with the feature off the
/// fetch gate ignores <c>throttled_until</c>, so a force-trip would be inert), while the GET
/// observability endpoints keep working.
/// </summary>
[Collection(EngineAppCollection.Name)]
public sealed class ThrottleOverrideDisabledTests(EngineAppFixture<Program> fixture) : IAsyncLifetime
{
    private readonly EngineApiClient _client = new(fixture);

    public async ValueTask InitializeAsync() => await fixture.Reset();

    public ValueTask DisposeAsync()
    {
        _client.Dispose();
        return ValueTask.CompletedTask;
    }

    [Fact]
    public async Task ForceTrip_ThrottlingDisabled_Returns409WithExplanation()
    {
        using var response = await _client.TripThrottleRaw();

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.Contains("Throttling is disabled", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task ForceClear_ThrottlingDisabled_Returns409WithExplanation()
    {
        using var response = await _client.ClearThrottleRaw();

        Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync(TestContext.Current.CancellationToken);
        Assert.Contains("Throttling is disabled", body, StringComparison.Ordinal);
    }

    [Fact]
    public async Task Observability_WorksWhileDisabled()
    {
        using var get = await _client.GetThrottleRaw();
        Assert.Equal(HttpStatusCode.NotFound, get.StatusCode);

        using var list = await _client.ListThrottlesRaw();
        Assert.Equal(HttpStatusCode.NoContent, list.StatusCode);
    }
}
