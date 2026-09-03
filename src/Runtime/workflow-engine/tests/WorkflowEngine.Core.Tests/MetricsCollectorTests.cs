using System.Diagnostics.Metrics;
using Microsoft.Extensions.DependencyInjection;
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
/// Tests for what the metrics collector reads on the mailbox paths: the count behind the gauge that alerts on a
/// mailbox the deadline sweep never closed, and the depths of the three mailbox buffers.
/// </summary>
/// <remarks>
/// In the background-service collection with the buffer suites: the meter is process-global, so an assertion
/// here would otherwise see whatever they flushed in parallel.
/// </remarks>
[Collection("BackgroundServiceTests")]
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
            MailboxBuffers = new MailboxBufferSettings
            {
                Mint = BufferSettings(),
                Close = BufferSettings(),
                Delivery = BufferSettings(),
            },
        };

    private static BatchBufferSettings BufferSettings() =>
        new()
        {
            MaxBatchSize = 10,
            MaxQueueSize = 50,
            FlushConcurrency = 1,
        };

    /// <summary>
    /// The three buffers the collector reads its depth gauge from — never started, so what is submitted to one
    /// stays queued for the whole pass.
    /// </summary>
    private static (MailboxMintBuffer Mint, MailboxCloseBuffer Close, MailboxDeliveryBuffer Delivery) CreateBuffers(
        EngineSettings settings
    )
    {
        var options = Options.Create(settings);
        var scopeFactory = new Mock<IServiceScopeFactory>(MockBehavior.Strict).Object;

        return (
            new MailboxMintBuffer(scopeFactory, NullLogger<MailboxMintBuffer>.Instance, options),
            new MailboxCloseBuffer(scopeFactory, NullLogger<MailboxCloseBuffer>.Instance, options),
            new MailboxDeliveryBuffer(scopeFactory, NullLogger<MailboxDeliveryBuffer>.Instance, options)
        );
    }

    /// <summary>
    /// Runs the collector through one pass: its loop parks on a <see cref="FakeTimeProvider"/> delay after it.
    /// </summary>
    private static async Task<(DateTimeOffset Cutoff, int Limit)> RunOnePass(
        TimeSpan sweepInterval,
        long overdue,
        Action<MailboxMintBuffer, MailboxCloseBuffer, MailboxDeliveryBuffer>? queue = null
    )
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
        var buffers = CreateBuffers(settings);
        queue?.Invoke(buffers.Mint, buffers.Close, buffers.Delivery);

        using var limiter = new ConcurrencyLimiter(5, 5, 5);
        using var collector = new MetricsCollector(
            NullLogger<MetricsCollector>.Instance,
            engineStatus.Object,
            repository.Object,
            limiter,
            Options.Create(settings),
            new FakeTimeProvider(_now),
            buffers.Mint,
            buffers.Close,
            buffers.Delivery
        );

        await collector.StartAsync(TestContext.Current.CancellationToken);
        var asked_ = await asked.Task.WaitAsync(TimeSpan.FromSeconds(10), TestContext.Current.CancellationToken);
        await collector.StopAsync(TestContext.Current.CancellationToken);
        return asked_;
    }

    [Fact]
    public async Task TheOverdueCutoff_IsNowLessOneSweepCadence()
    {
        Assert.Equal(_now - TimeSpan.FromMinutes(5), (await RunOnePass(TimeSpan.FromMinutes(5), overdue: 0)).Cutoff);
        Assert.Equal(_now - TimeSpan.FromMinutes(17), (await RunOnePass(TimeSpan.FromMinutes(17), overdue: 0)).Cutoff);
    }

    [Fact]
    public async Task TheOverdueCountIsAsked_ForABoundedNumberOfRows()
    {
        Assert.Equal(10_000, (await RunOnePass(TimeSpan.FromMinutes(5), overdue: 0)).Limit);
    }

    [Fact]
    public async Task AFailingOverdueRead_DoesNotSuppressTheEnginesHealthGauge()
    {
        // One try/catch covers the whole pass, so a read that throws abandons every gauge written after it.
        // Ordered where the mailbox read first landed, this test fails — health is never written.
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

        var buffers = CreateBuffers(settings);

        using var limiter = new ConcurrencyLimiter(5, 5, 5);
        using var collector = new MetricsCollector(
            NullLogger<MetricsCollector>.Instance,
            engineStatus.Object,
            repository.Object,
            limiter,
            Options.Create(settings),
            new FakeTimeProvider(_now),
            buffers.Mint,
            buffers.Close,
            buffers.Delivery
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

    [Fact]
    public async Task TheDepthGauge_ReportsEachMailboxBuffersQueue_UnderItsOwnOperationTag()
    {
        using var meters = new MeterCollector();

        await RunOnePass(
            TimeSpan.FromMinutes(5),
            overdue: 0,
            queue: (mint, close, delivery) =>
            {
                // Discarded: no verdict is coming, and Enqueue runs synchronously up to its wait, which is what
                // leaves the request counted in the queue
                for (int i = 1; i <= 2; i++)
                {
                    _ = mint.Enqueue(
                        Guid.NewGuid(),
                        "test-ns",
                        $"key-{i}",
                        collectionKey: null,
                        TimeSpan.FromHours(1),
                        _now,
                        CancellationToken.None
                    );
                }

                _ = close.Enqueue(
                    Guid.NewGuid(),
                    "test-ns",
                    MailboxDisposedReason.Request,
                    _now,
                    CancellationToken.None
                );

                for (int i = 1; i <= 3; i++)
                {
                    _ = delivery.Enqueue(Guid.NewGuid(), "test-ns", $"msg-{i}", "{}", _now, CancellationToken.None);
                }
            }
        );

        meters.RecordObservableInstruments();

        Assert.Equal(
            new Dictionary<string, long>(StringComparer.Ordinal)
            {
                ["mint"] = 2,
                ["close"] = 1,
                ["delivery"] = 3,
            },
            meters.ByTag("engine.mailbox_buffer.depth", "operation")
        );
    }
}
