using System.Diagnostics.Metrics;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Moq;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Resilience;
using WorkflowEngine.Resilience.Models;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// Tests for the one thing the metrics collector was given in this step: the count behind the gauge that
/// alerts on a mailbox the deadline sweep never closed.
/// </summary>
public class MetricsCollectorTests
{
    private static readonly DateTimeOffset _now = new(2026, 8, 19, 12, 0, 0, TimeSpan.Zero);

    private static EngineSettings Settings(TimeSpan sweepInterval) =>
        new()
        {
            MetricsCollectionInterval = TimeSpan.FromSeconds(5),
            MailboxSweepInterval = sweepInterval,
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
            Concurrency = new ConcurrencySettings
            {
                MaxWorkers = 5,
                MaxDbOperations = 5,
                MaxHttpCalls = 5,
                BackpressureThreshold = 100,
            },
        };

    /// <summary>
    /// Runs the collector until it has asked for the overdue count once, and returns the cutoff it asked with. The
    /// collector's loop parks on a <see cref="FakeTimeProvider"/> delay after its first pass.
    /// </summary>
    private static async Task<(DateTimeOffset Cutoff, int Limit)> RunOnePass(TimeSpan sweepInterval, long overdue)
    {
        var settings = Settings(sweepInterval);
        var repository = new Mock<IEngineRepository>(MockBehavior.Strict);
        repository
            .Setup(r => r.CountWorkflowsByStatus(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowStatusCounts(new Dictionary<PersistentItemStatus, int>(), 0));

        var asked = new TaskCompletionSource<(DateTimeOffset, int)>(TaskCreationOptions.RunContinuationsAsynchronously);
        repository
            .Setup(r =>
                r.CountOverdueOpenMailboxes(It.IsAny<DateTimeOffset>(), It.IsAny<int>(), It.IsAny<CancellationToken>())
            )
            .Callback<DateTimeOffset, int, CancellationToken>((cutoff, limit, _) => asked.TrySetResult((cutoff, limit)))
            .ReturnsAsync(overdue);

        var engineStatus = new Mock<IEngineStatus>();
        using var limiter = new ConcurrencyLimiter(5, 5, 5);
        using var collector = new MetricsCollector(
            NullLogger<MetricsCollector>.Instance,
            engineStatus.Object,
            repository.Object,
            limiter,
            Options.Create(settings),
            new FakeTimeProvider(_now)
        );

        await collector.StartAsync(TestContext.Current.CancellationToken);
        var asked_ = await asked.Task.WaitAsync(TimeSpan.FromSeconds(10), TestContext.Current.CancellationToken);
        await collector.StopAsync(TestContext.Current.CancellationToken);
        return asked_;
    }

    [Fact]
    public async Task TheOverdueCutoff_IsNowLessOneSweepCadence()
    {
        // Without the grace the gauge would count every mailbox for the interval between its deadline and the tick
        // that closes it, so a healthy engine would read non-zero and nobody could alert on it. Two cadences are
        // exercised so a hard-coded constant cannot pass.
        Assert.Equal(_now - TimeSpan.FromMinutes(5), (await RunOnePass(TimeSpan.FromMinutes(5), overdue: 0)).Cutoff);
        Assert.Equal(_now - TimeSpan.FromMinutes(17), (await RunOnePass(TimeSpan.FromMinutes(17), overdue: 0)).Cutoff);
    }

    [Fact]
    public async Task TheOverdueCountIsAsked_ForABoundedNumberOfRows()
    {
        // The read runs on the metrics cadence and the incident it reports is a mass timeout, so an exact count
        // would be at its most expensive exactly when the gauge matters — and this pass shares one try/catch
        // with the engine's health gauge.
        Assert.Equal(10_000, (await RunOnePass(TimeSpan.FromMinutes(5), overdue: 0)).Limit);
    }

    [Fact]
    public async Task AFailingOverdueRead_DoesNotSuppressTheEnginesHealthGauge()
    {
        // The reason the mailbox read is the pass's *last* statement: one try/catch covers the whole pass, so a
        // read that throws abandons every gauge written after it. Ordered where it first landed, this test
        // fails — health is never written.
        var settings = Settings(TimeSpan.FromMinutes(5));
        var repository = new Mock<IEngineRepository>(MockBehavior.Strict);
        repository
            .Setup(r => r.CountWorkflowsByStatus(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new WorkflowStatusCounts(new Dictionary<PersistentItemStatus, int>(), 0));

        var attempted = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        repository
            .Setup(r =>
                r.CountOverdueOpenMailboxes(It.IsAny<DateTimeOffset>(), It.IsAny<int>(), It.IsAny<CancellationToken>())
            )
            .Callback(() => attempted.TrySetResult())
            .ThrowsAsync(new InvalidOperationException("database down"));

        var engineStatus = new Mock<IEngineStatus>();
        engineStatus.SetupGet(e => e.HealthLevel).Returns(EngineHealthLevel.Unhealthy);

        Metrics.SetHealthStatus(-1);

        using var limiter = new ConcurrencyLimiter(5, 5, 5);
        using var collector = new MetricsCollector(
            NullLogger<MetricsCollector>.Instance,
            engineStatus.Object,
            repository.Object,
            limiter,
            Options.Create(settings),
            new FakeTimeProvider(_now)
        );

        await collector.StartAsync(TestContext.Current.CancellationToken);
        await attempted.Task.WaitAsync(TimeSpan.FromSeconds(10), TestContext.Current.CancellationToken);
        await collector.StopAsync(TestContext.Current.CancellationToken);

        var observed = new List<long>();
        using var listener = new MeterListener
        {
            InstrumentPublished = (instrument, l) =>
            {
                if (instrument.Meter.Name == Metrics.Meter.Name && instrument.Name == "engine.health.status")
                    l.EnableMeasurementEvents(instrument);
            },
        };
        listener.SetMeasurementEventCallback<long>((_, measurement, _, _) => observed.Add(measurement));
        listener.Start();
        listener.RecordObservableInstruments();

        Assert.Equal((long)EngineHealthLevel.Unhealthy, Assert.Single(observed));
    }

    [Fact]
    public async Task TheGaugeReportsWhatTheCountReturned()
    {
        // Read back the way a scraper reads it: an observable gauge publishes nothing until something observes.
        var observed = new List<long>();
        using var listener = new MeterListener
        {
            InstrumentPublished = (instrument, l) =>
            {
                if (instrument.Meter.Name == Metrics.Meter.Name && instrument.Name == "engine.mailboxes.open.overdue")
                    l.EnableMeasurementEvents(instrument);
            },
        };
        listener.SetMeasurementEventCallback<long>((_, measurement, _, _) => observed.Add(measurement));
        listener.Start();

        await RunOnePass(TimeSpan.FromMinutes(5), overdue: 7);
        listener.RecordObservableInstruments();

        Assert.Equal(7, Assert.Single(observed));
    }
}
