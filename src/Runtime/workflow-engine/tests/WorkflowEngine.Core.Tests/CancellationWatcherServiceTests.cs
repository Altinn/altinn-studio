using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience.Models;

namespace WorkflowEngine.Core.Tests;

[Collection("BackgroundServiceTests")]
public class CancellationWatcherServiceTests
{
    private static Workflow DummyWorkflow() =>
        new()
        {
            OperationId = "watcher-test",
            IdempotencyKey = "watcher-test-key",
            Namespace = "test-ns",
            Steps = [],
        };

    private static EngineSettings DefaultSettings(TimeSpan? watcherInterval = null) =>
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
            HeartbeatInterval = TimeSpan.FromSeconds(3),
            StaleWorkflowThreshold = TimeSpan.FromSeconds(15),
            MaxReclaimCount = 3,
            CancellationWatcherInterval = watcherInterval ?? TimeSpan.FromMilliseconds(50),
            Concurrency = new ConcurrencySettings
            {
                MaxWorkers = 5,
                MaxDbOperations = 5,
                MaxHttpCalls = 5,
            },
        };

    [Fact]
    public async Task PollsCancellations_AndTriggersCts()
    {
        var tracker = new InFlightTracker(TimeProvider.System);
        var repo = new Mock<IEngineRepository>();
        var settings = Options.Create(DefaultSettings());

        var workflow = DummyWorkflow();
        var id = Guid.NewGuid();
        using var workflowCts = new CancellationTokenSource();
        tracker.TryAdd(id, workflowCts, workflow);

        // When polled, return the workflow as pending cancellation
        repo.Setup(r => r.GetPendingCancellations(It.IsAny<IReadOnlyList<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync((IReadOnlyList<Guid> ids, CancellationToken _) => ids.Where(x => x == id).ToList());

        using var service = new CancellationWatcherService(
            tracker,
            repo.Object,
            settings,
            NullLogger<CancellationWatcherService>.Instance
        );

        using var cts = new CancellationTokenSource();
        _ = service.StartAsync(cts.Token);

        try
        {
            // Wait for at least one poll cycle
            await Task.Delay(200, TestContext.Current.CancellationToken);

            Assert.True(workflowCts.IsCancellationRequested);
            Assert.NotNull(workflow.CancellationRequestedAt);
        }
        finally
        {
            await cts.CancelAsync();
            tracker.Remove(id);
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await service.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task SkipsDbCall_WhenTrackerEmpty()
    {
        var tracker = new InFlightTracker(TimeProvider.System);
        var repo = new Mock<IEngineRepository>();
        var settings = Options.Create(DefaultSettings());

        using var service = new CancellationWatcherService(
            tracker,
            repo.Object,
            settings,
            NullLogger<CancellationWatcherService>.Instance
        );

        using var cts = new CancellationTokenSource();
        _ = service.StartAsync(cts.Token);

        try
        {
            // Wait for several poll cycles
            await Task.Delay(200, TestContext.Current.CancellationToken);

            repo.Verify(
                r => r.GetPendingCancellations(It.IsAny<IReadOnlyList<Guid>>(), It.IsAny<CancellationToken>()),
                Times.Never
            );
        }
        finally
        {
            await cts.CancelAsync();
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await service.StopAsync(stopCts.Token);
        }
    }

    [Fact]
    public async Task SurvivesTransientErrors()
    {
        var tracker = new InFlightTracker(TimeProvider.System);
        var repo = new Mock<IEngineRepository>();
        var settings = Options.Create(DefaultSettings());

        var workflow = DummyWorkflow();
        var id = Guid.NewGuid();
        using var workflowCts = new CancellationTokenSource();
        tracker.TryAdd(id, workflowCts, workflow);

        var callCount = 0;
        repo.Setup(r => r.GetPendingCancellations(It.IsAny<IReadOnlyList<Guid>>(), It.IsAny<CancellationToken>()))
            .Returns<IReadOnlyList<Guid>, CancellationToken>(
                (ids, _) =>
                {
                    var count = Interlocked.Increment(ref callCount);
                    if (count == 1)
                        throw new InvalidOperationException("Transient DB error");

                    return Task.FromResult<IReadOnlyList<Guid>>(ids.Where(x => x == id).ToList());
                }
            );

        using var service = new CancellationWatcherService(
            tracker,
            repo.Object,
            settings,
            NullLogger<CancellationWatcherService>.Instance
        );

        using var cts = new CancellationTokenSource();
        _ = service.StartAsync(cts.Token);

        try
        {
            // Wait for multiple poll cycles
            await Task.Delay(300, TestContext.Current.CancellationToken);

            Assert.True(callCount >= 2, $"Expected at least 2 calls but got {callCount}");
            Assert.True(workflowCts.IsCancellationRequested);
        }
        finally
        {
            await cts.CancelAsync();
            tracker.Remove(id);
            using var stopCts = new CancellationTokenSource(TimeSpan.FromSeconds(10));
            await service.StopAsync(stopCts.Token);
        }
    }
}
