using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Moq;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// Tests for the gauges and the engine count the finished workflow count feeds, and for its cadence.
/// </summary>
/// <remarks>
/// In the background-service collection: the gauges are process-global.
/// </remarks>
[Collection("BackgroundServiceTests")]
public class FinishedWorkflowCountCollectorTests
{
    private static readonly DateTimeOffset _now = new(2026, 11, 26, 12, 0, 0, TimeSpan.Zero);

    private static readonly string[] _gauges =
    [
        "altinn.workflow_engine.workflow.failed",
        "altinn.workflow_engine.workflow.successful",
        "altinn.workflow_engine.workflow.finished",
    ];

    private static EngineSettings Settings() =>
        new()
        {
            MetricsCollectionInterval = TimeSpan.FromSeconds(5),
            FinishedWorkflowCountCollectionInterval = TimeSpan.FromMinutes(1),
            DefaultStepCommandTimeout = TimeSpan.FromSeconds(30),
            MaxStepCommandTimeout = TimeSpan.FromHours(2),
            DefaultStepRetryStrategy = RetryStrategy.None(),
            DatabaseCommandTimeout = TimeSpan.FromSeconds(10),
            DatabaseRetryStrategy = RetryStrategy.None(),
            MaxWorkflowsPerRequest = 100,
            MaxStepsPerWorkflow = 50,
            MaxLabels = 50,
            HeartbeatInterval = TimeSpan.FromSeconds(3),
            StaleWorkflowThreshold = TimeSpan.FromSeconds(15),
            MaxReclaimCount = 3,
        };

    [Fact]
    public async Task FailedCountsFailedCanceledAndDependencyFailed_FinishedAddsCompleted_AndAbandonedAndIncompleteAreInNeither()
    {
        var ct = TestContext.Current.CancellationToken;
        var repository = new Mock<IEngineRepository>(MockBehavior.Strict);
        repository
            .Setup(r => r.CountWorkflowsByStatus(It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new Dictionary<PersistentItemStatus, int>
                {
                    [PersistentItemStatus.Enqueued] = 1_000,
                    [PersistentItemStatus.Held] = 2_000,
                    [PersistentItemStatus.Completed] = 100,
                    [PersistentItemStatus.Failed] = 1,
                    [PersistentItemStatus.Canceled] = 2,
                    [PersistentItemStatus.DependencyFailed] = 4,
                    [PersistentItemStatus.Abandoned] = 8,
                }
            );
        var engineStatus = new Mock<IEngineStatus>();
        var reported = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        engineStatus.Setup(e => e.UpdateFailedWorkflowCount(It.IsAny<int>())).Callback(reported.SetResult);

        using var collector = new FinishedWorkflowCountCollector(
            NullLogger<FinishedWorkflowCountCollector>.Instance,
            engineStatus.Object,
            repository.Object,
            Options.Create(Settings()),
            new FakeTimeProvider(_now)
        );

        await collector.StartAsync(ct);
        await reported.Task.WaitAsync(TimeSpan.FromSeconds(10), ct);
        var gauges = ReadGauges();
        await collector.StopAsync(ct);

        Assert.Equal([7, 100, 107], gauges);
        engineStatus.Verify(e => e.UpdateFailedWorkflowCount(7), Times.Once);
    }

    [Fact]
    public async Task TheCollector_ReadsOnItsOwnInterval_AndAFailedReadLeavesTheGaugesAndTheEngineAtTheLastCountsRead()
    {
        var ct = TestContext.Current.CancellationToken;
        var time = new DelayWatchingTimeProvider(_now);
        var reads = 0;
        using var readStarted = new SemaphoreSlim(0);

        // The first read answers, the second fails, the third never returns: once it has started, the second pass
        // is over.
        var repository = new Mock<IEngineRepository>(MockBehavior.Strict);
        repository
            .Setup(r => r.CountWorkflowsByStatus(It.IsAny<CancellationToken>()))
            .Returns<CancellationToken>(async token =>
            {
                reads++;
                readStarted.Release();
                switch (reads)
                {
                    case 1:
                        return new Dictionary<PersistentItemStatus, int>
                        {
                            [PersistentItemStatus.Completed] = 10,
                            [PersistentItemStatus.Failed] = 3,
                        };
                    case 2:
                        throw new TimeoutException("database unreachable");
                    default:
                        await Task.Delay(Timeout.Infinite, token);
                        throw new InvalidOperationException("unreachable");
                }
            });
        var engineStatus = new Mock<IEngineStatus>();

        using var collector = new FinishedWorkflowCountCollector(
            NullLogger<FinishedWorkflowCountCollector>.Instance,
            engineStatus.Object,
            repository.Object,
            Options.Create(Settings()),
            time
        );

        await collector.StartAsync(ct);
        await readStarted.WaitAsync(TimeSpan.FromSeconds(10), ct);

        await time.DelayStarted.WaitAsync(TimeSpan.FromSeconds(10), ct);
        time.Advance(TimeSpan.FromSeconds(59));
        var readEarly = await readStarted.WaitAsync(TimeSpan.FromMilliseconds(200), ct);
        time.Advance(TimeSpan.FromSeconds(1));
        Assert.True(await readStarted.WaitAsync(TimeSpan.FromSeconds(10), ct), "read 2 did not start");

        await time.DelayStarted.WaitAsync(TimeSpan.FromSeconds(10), ct);
        time.Advance(TimeSpan.FromMinutes(1));
        Assert.True(await readStarted.WaitAsync(TimeSpan.FromSeconds(10), ct), "read 3 did not start");

        var gauges = ReadGauges();
        await collector.StopAsync(ct);

        Assert.False(readEarly, "the collector read again before FinishedWorkflowCountCollectionInterval had passed");
        Assert.Equal([3, 10, 13], gauges);
        engineStatus.Verify(e => e.UpdateFailedWorkflowCount(3), Times.Once);
        engineStatus.VerifyNoOtherCalls();
    }

    private static long[] ReadGauges()
    {
        using var meters = new MeterCollector();
        meters.RecordObservableInstruments();
        return [.. _gauges.Select(gauge => Assert.Single(meters.Values(gauge)))];
    }
}
