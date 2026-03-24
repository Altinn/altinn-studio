using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Core.Tests;

[Collection("BackgroundServiceTests")]
public class HeartbeatServiceTests
{
    private static Workflow DummyWorkflow() =>
        new()
        {
            OperationId = "heartbeat-test",
            IdempotencyKey = "heartbeat-test-key",
            Namespace = "test-ns",
            Steps = [],
        };

    private static EngineSettings DefaultSettings(TimeSpan? heartbeatInterval = null) =>
        new()
        {
            DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
            DefaultStepRetryStrategy = RetryStrategy.None(),
            DatabaseCommandTimeout = TimeSpan.FromSeconds(10),
            DatabaseRetryStrategy = RetryStrategy.None(),
            MetricsCollectionInterval = TimeSpan.FromSeconds(5),
            MaxWorkflowsPerRequest = 100,
            MaxStepsPerWorkflow = 50,
            MaxLabels = 50,
            HeartbeatInterval = heartbeatInterval ?? TimeSpan.FromMilliseconds(50),
            StaleWorkflowThreshold = TimeSpan.FromSeconds(15),
            MaxReclaimCount = 3,
            Concurrency = new()
            {
                MaxWorkers = 5,
                MaxDbOperations = 5,
                MaxHttpCalls = 5,
            },
        };

    [Fact]
    public async Task HeartbeatService_CallsBatchUpdateHeartbeats_AfterInterval()
    {
        var tracker = new InFlightTracker(TimeProvider.System);
        var repo = new Mock<IEngineRepository>();
        var settings = Options.Create(DefaultSettings());
        var service = new HeartbeatService(
            tracker,
            repo.Object,
            settings,
            TimeProvider.System,
            NullLogger<HeartbeatService>.Instance
        );

        var id1 = Guid.NewGuid();
        var id2 = Guid.NewGuid();
        tracker.TryAdd(id1, new CancellationTokenSource(), DummyWorkflow());
        tracker.TryAdd(id2, new CancellationTokenSource(), DummyWorkflow());

        using var cts = new CancellationTokenSource();
        _ = service.StartAsync(cts.Token);

        // Wait for at least one heartbeat cycle
        await Task.Delay(200, TestContext.Current.CancellationToken);

        repo.Verify(
            r =>
                r.BatchUpdateHeartbeats(
                    It.Is<IReadOnlyList<Guid>>(ids => ids.Count == 2),
                    It.IsAny<CancellationToken>()
                ),
            Times.AtLeastOnce
        );

        cts.Cancel();
        tracker.TryRemove(id1, out _);
        tracker.TryRemove(id2, out _);
        using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        await service.StopAsync(stopCts.Token);
    }

    [Fact]
    public async Task HeartbeatService_ContinuesAfterStoppingToken_UntilTrackerEmpty()
    {
        var tracker = new InFlightTracker(TimeProvider.System);
        var repo = new Mock<IEngineRepository>();
        var settings = Options.Create(DefaultSettings());
        var service = new HeartbeatService(
            tracker,
            repo.Object,
            settings,
            TimeProvider.System,
            NullLogger<HeartbeatService>.Instance
        );

        var id = Guid.NewGuid();
        tracker.TryAdd(id, new CancellationTokenSource(), DummyWorkflow());

        using var cts = new CancellationTokenSource();
        _ = service.StartAsync(cts.Token);

        // Wait for at least one heartbeat
        await Task.Delay(200, TestContext.Current.CancellationToken);

        // Cancel the stopping token — simulates shutdown
        cts.Cancel();

        // Reset the mock to only track calls after shutdown
        repo.Invocations.Clear();

        // Wait for another heartbeat cycle — service should keep running
        await Task.Delay(200, TestContext.Current.CancellationToken);

        // Verify heartbeat was still called after shutdown signal
        repo.Verify(
            r => r.BatchUpdateHeartbeats(It.IsAny<IReadOnlyList<Guid>>(), It.IsAny<CancellationToken>()),
            Times.AtLeastOnce
        );

        // Now empty the tracker — service should exit
        tracker.TryRemove(id, out _);
        using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        await service.StopAsync(stopCts.Token);
    }

    [Fact]
    public async Task HeartbeatService_SkipsDbCall_WhenTrackerEmpty()
    {
        var tracker = new InFlightTracker(TimeProvider.System);
        var repo = new Mock<IEngineRepository>();
        var settings = Options.Create(DefaultSettings());
        var service = new HeartbeatService(
            tracker,
            repo.Object,
            settings,
            TimeProvider.System,
            NullLogger<HeartbeatService>.Instance
        );

        using var cts = new CancellationTokenSource();
        _ = service.StartAsync(cts.Token);

        // Wait for several heartbeat cycles with nothing in-flight
        await Task.Delay(200, TestContext.Current.CancellationToken);

        repo.Verify(
            r => r.BatchUpdateHeartbeats(It.IsAny<IReadOnlyList<Guid>>(), It.IsAny<CancellationToken>()),
            Times.Never
        );

        cts.Cancel();
        using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        await service.StopAsync(stopCts.Token);
    }

    [Fact]
    public async Task HeartbeatService_SurvivesExceptions()
    {
        var tracker = new InFlightTracker(TimeProvider.System);
        var repo = new Mock<IEngineRepository>();
        var settings = Options.Create(DefaultSettings());
        var service = new HeartbeatService(
            tracker,
            repo.Object,
            settings,
            TimeProvider.System,
            NullLogger<HeartbeatService>.Instance
        );

        var id = Guid.NewGuid();
        tracker.TryAdd(id, new CancellationTokenSource(), DummyWorkflow());

        var callCount = 0;
        repo.Setup(r => r.BatchUpdateHeartbeats(It.IsAny<IReadOnlyList<Guid>>(), It.IsAny<CancellationToken>()))
            .Returns<IReadOnlyList<Guid>, CancellationToken>(
                (_, _) =>
                {
                    var count = Interlocked.Increment(ref callCount);
                    if (count == 1)
                        throw new InvalidOperationException("Transient DB error");
                    return Task.CompletedTask;
                }
            );

        using var cts = new CancellationTokenSource();
        _ = service.StartAsync(cts.Token);

        // Wait for at least two heartbeat cycles
        await Task.Delay(300, TestContext.Current.CancellationToken);

        Assert.True(callCount >= 2, $"Expected at least 2 calls but got {callCount}");

        cts.Cancel();
        tracker.TryRemove(id, out _);
        using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
        await service.StopAsync(stopCts.Token);
    }
}
