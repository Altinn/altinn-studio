using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using WorkflowEngine.Data.Services;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Repository.Tests;

/// <summary>
/// Pins the fail-open freshness contract of <see cref="ThrottleStateView"/>: a published snapshot
/// is served while fresh and reads as empty once older than
/// <see cref="ThrottleStateView.StaleSnapshotSweepMultiplier"/> sweep intervals — a replica whose
/// sweep loop has died must lose its power to park, not keep exercising a frozen view.
/// </summary>
public sealed class ThrottleStateViewTests
{
    private static readonly TimeSpan _sweepInterval = TimeSpan.FromSeconds(30);

    private static readonly IReadOnlyDictionary<string, TimeSpan> _oneOpenBreaker = new Dictionary<string, TimeSpan>(
        StringComparer.Ordinal
    )
    {
        ["stormy-namespace"] = TimeSpan.FromMinutes(10),
    };

    private static ThrottleStateView CreateView(FakeTimeProvider timeProvider) =>
        new(
            timeProvider,
            Options.Create(
                new EngineSettings
                {
                    DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
                    MaxStepCommandTimeout = TimeSpan.FromHours(2),
                    DefaultStepRetryStrategy = RetryStrategy.None(),
                    DatabaseCommandTimeout = TimeSpan.FromSeconds(30),
                    DatabaseRetryStrategy = RetryStrategy.None(),
                    MetricsCollectionInterval = TimeSpan.FromSeconds(5),
                    MaxWorkflowsPerRequest = 100,
                    MaxStepsPerWorkflow = 50,
                    MaxLabels = 50,
                    HeartbeatInterval = TimeSpan.FromSeconds(3),
                    StaleWorkflowThreshold = TimeSpan.FromSeconds(15),
                    MaxReclaimCount = 3,
                    Concurrency = new ConcurrencySettings
                    {
                        MaxWorkers = 10,
                        MaxDbOperations = 50,
                        MaxHttpCalls = 50,
                    },
                    Throttling = new ThrottlingSettings { SweepInterval = _sweepInterval },
                }
            )
        );

    [Fact]
    public void OpenBreakers_NothingPublished_ReadsEmpty()
    {
        var view = CreateView(new FakeTimeProvider());

        Assert.Empty(view.OpenBreakers);
    }

    [Fact]
    public void OpenBreakers_FreshSnapshot_IsServed()
    {
        var timeProvider = new FakeTimeProvider();
        var view = CreateView(timeProvider);

        view.Publish(_oneOpenBreaker);
        timeProvider.Advance(_sweepInterval);

        var breaker = Assert.Single(view.OpenBreakers);
        Assert.Equal("stormy-namespace", breaker.Key);
    }

    [Fact]
    public void OpenBreakers_AtTheStalenessBound_IsStillServed()
    {
        var timeProvider = new FakeTimeProvider();
        var view = CreateView(timeProvider);

        view.Publish(_oneOpenBreaker);
        timeProvider.Advance(ThrottleStateView.StaleSnapshotSweepMultiplier * _sweepInterval);

        Assert.Single(view.OpenBreakers);
    }

    [Fact]
    public void OpenBreakers_PastTheStalenessBound_ReadsEmpty()
    {
        var timeProvider = new FakeTimeProvider();
        var view = CreateView(timeProvider);

        view.Publish(_oneOpenBreaker);
        timeProvider.Advance(
            (ThrottleStateView.StaleSnapshotSweepMultiplier * _sweepInterval) + TimeSpan.FromSeconds(1)
        );

        Assert.Empty(view.OpenBreakers);
    }

    [Fact]
    public void Publish_AfterGoingStale_ServesAgain()
    {
        var timeProvider = new FakeTimeProvider();
        var view = CreateView(timeProvider);

        view.Publish(_oneOpenBreaker);
        timeProvider.Advance((ThrottleStateView.StaleSnapshotSweepMultiplier + 1) * _sweepInterval);
        Assert.Empty(view.OpenBreakers);

        view.Publish(_oneOpenBreaker);

        Assert.Single(view.OpenBreakers);
    }
}
