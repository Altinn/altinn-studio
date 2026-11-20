using System.Diagnostics;
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
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// Tests for the gauges the metrics collector feeds, and for which of them a failing database read costs.
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
    /// Submits requests to the buffers and leaves them queued: <c>Enqueue</c> runs synchronously up to its wait for a
    /// verdict, which never comes from a buffer that is not started.
    /// </summary>
    private static void QueueRequests(
        (MailboxMintBuffer Mint, MailboxCloseBuffer Close, MailboxDeliveryBuffer Delivery) buffers,
        int mint,
        int close,
        int delivery
    )
    {
        for (int i = 1; i <= mint; i++)
        {
            _ = buffers.Mint.Enqueue(
                Guid.NewGuid(),
                "test-ns",
                $"key-{i}",
                collectionKey: null,
                TimeSpan.FromHours(1),
                _now,
                CancellationToken.None
            );
        }

        for (int i = 1; i <= close; i++)
        {
            _ = buffers.Close.Enqueue(
                Guid.NewGuid(),
                "test-ns",
                MailboxDisposedReason.Request,
                _now,
                CancellationToken.None
            );
        }

        for (int i = 1; i <= delivery; i++)
        {
            _ = buffers.Delivery.Enqueue(Guid.NewGuid(), "test-ns", $"msg-{i}", "{}", _now, CancellationToken.None);
        }
    }

    private static MetricsCollector CreateCollector(
        EngineSettings settings,
        IEngineRepository repository,
        IEngineStatus engineStatus,
        IConcurrencyLimiter limiter,
        (MailboxMintBuffer Mint, MailboxCloseBuffer Close, MailboxDeliveryBuffer Delivery) buffers
    ) =>
        new(
            NullLogger<MetricsCollector>.Instance,
            engineStatus,
            repository,
            limiter,
            Options.Create(settings),
            new FakeTimeProvider(_now),
            buffers.Mint,
            buffers.Close,
            buffers.Delivery
        );

    /// <summary>
    /// Runs the collector through one pass: its loop parks on a <see cref="FakeTimeProvider"/> delay after it.
    /// </summary>
    private static async Task<(DateTimeOffset Cutoff, int Limit)> RunOnePass(
        TimeSpan sweepInterval,
        long overdue,
        (int Mint, int Close, int Delivery) queued = default,
        EngineHealthStatus engineHealth = EngineHealthStatus.Running | EngineHealthStatus.Healthy
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
        engineStatus.SetupGet(e => e.Status).Returns(engineHealth);
        var buffers = CreateBuffers(settings);
        QueueRequests(buffers, queued.Mint, queued.Close, queued.Delivery);

        using var limiter = new ConcurrencyLimiter(5, 5, 5);
        using var collector = CreateCollector(settings, repository.Object, engineStatus.Object, limiter, buffers);

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
    public async Task TheHealthGauges_ReportTheEnginesHealth_WhileADatabaseReadHoldsUpThePass()
    {
        // In a database outage the pass's first database read fails, or is held until it times out, and nothing
        // retries it. The health gauges must not wait for it.
        var settings = Settings(TimeSpan.FromMinutes(5));
        var repository = new Mock<IEngineRepository>(MockBehavior.Strict);
        var reading = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        repository
            .Setup(r => r.CountWorkflowsByStatus(It.IsAny<CancellationToken>()))
            .Returns<CancellationToken>(async ct =>
            {
                reading.TrySetResult();
                await Task.Delay(Timeout.Infinite, ct);
                throw new UnreachableException();
            });

        var status = EngineHealthStatus.Running | EngineHealthStatus.Healthy;
        var engineStatus = new Mock<IEngineStatus>();
        engineStatus.SetupGet(e => e.Status).Returns(() => status);

        using var limiter = new ConcurrencyLimiter(5, 5, 5);
        using var collector = CreateCollector(
            settings,
            repository.Object,
            engineStatus.Object,
            limiter,
            CreateBuffers(settings)
        );

        await collector.StartAsync(TestContext.Current.CancellationToken);
        await reading.Task.WaitAsync(TimeSpan.FromSeconds(10), TestContext.Current.CancellationToken);

        // Read on both sides of the change: the callbacks are process-wide and outlive the test that registered
        // them, and one a neighbour left behind reads a status that never changes.
        var before = ReadHealth();
        status |= EngineHealthStatus.DatabaseUnavailable;
        var after = ReadHealth();

        await collector.StopAsync(TestContext.Current.CancellationToken);

        Assert.Equal(((long)EngineHealthLevel.Healthy, 0), before);
        Assert.Equal(((long)EngineHealthLevel.Degraded, 1), after);

        static (long Level, long DatabaseUnavailable) ReadHealth()
        {
            using var meters = new MeterCollector();
            meters.RecordObservableInstruments();
            return (
                Assert.Single(meters.Values("altinn.workflow_engine.health.status")),
                meters.ByTag("altinn.workflow_engine.health.reason", "altinn.workflow_engine.reason")[
                    "database_unavailable"
                ]
            );
        }
    }

    [Fact]
    public async Task TheSlotAndBufferDepthGauges_ReportCurrentValues_WhenTheFirstDatabaseReadFails()
    {
        var settings = Settings(TimeSpan.FromMinutes(5));
        var repository = new Mock<IEngineRepository>(MockBehavior.Strict);
        var reading = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        repository
            .Setup(r => r.CountWorkflowsByStatus(It.IsAny<CancellationToken>()))
            .Callback(reading.SetResult)
            .ThrowsAsync(new TimeoutException("database unreachable"));

        var buffers = CreateBuffers(settings);
        QueueRequests(buffers, mint: 4, close: 5, delivery: 6);

        using var limiter = new ConcurrencyLimiter(7, 11, 13);
        using var dbSlot = await limiter.AcquireDbSlot(cancellationToken: TestContext.Current.CancellationToken);
        using var httpSlot = await limiter.AcquireHttpSlot(cancellationToken: TestContext.Current.CancellationToken);
        await limiter.AcquireWorkerSlot(TestContext.Current.CancellationToken);

        using var collector = CreateCollector(
            settings,
            repository.Object,
            new Mock<IEngineStatus>().Object,
            limiter,
            buffers
        );
        using var meters = new MeterCollector();

        await collector.StartAsync(TestContext.Current.CancellationToken);
        await reading.Task.WaitAsync(TimeSpan.FromSeconds(10), TestContext.Current.CancellationToken);
        await collector.StopAsync(TestContext.Current.CancellationToken);
        meters.RecordObservableInstruments();

        string[] slotGauges =
        [
            "altinn.workflow_engine.slot.db.available",
            "altinn.workflow_engine.slot.db.used",
            "altinn.workflow_engine.slot.http.available",
            "altinn.workflow_engine.slot.http.used",
            "altinn.workflow_engine.slot.worker.available",
            "altinn.workflow_engine.slot.worker.used",
        ];
        Assert.Equal([6, 1, 10, 1, 12, 1], slotGauges.Select(gauge => Assert.Single(meters.Values(gauge))));
        Assert.Equal(
            new Dictionary<string, long>(StringComparer.Ordinal)
            {
                ["mint"] = 4,
                ["close"] = 5,
                ["delivery"] = 6,
            },
            meters.ByTag("altinn.workflow_engine.mailbox_buffer.depth", "altinn.workflow_engine.mailbox.operation")
        );
    }

    [Fact]
    public async Task AFailingOverdueRead_DoesNotSuppressTheWorkflowCountGauges()
    {
        var settings = Settings(TimeSpan.FromMinutes(5));
        var repository = new Mock<IEngineRepository>(MockBehavior.Strict);
        repository
            .Setup(r => r.CountWorkflowsByStatus(It.IsAny<CancellationToken>()))
            .ReturnsAsync(
                new WorkflowStatusCounts(
                    new Dictionary<PersistentItemStatus, int> { [PersistentItemStatus.Failed] = 23 },
                    0
                )
            );

        var asked = new TaskCompletionSource(TaskCreationOptions.RunContinuationsAsynchronously);
        repository
            .Setup(r =>
                r.CountOverdueOpenMailboxes(It.IsAny<DateTimeOffset>(), It.IsAny<int>(), It.IsAny<CancellationToken>())
            )
            .Callback(asked.SetResult)
            .ThrowsAsync(new TimeoutException("database unreachable"));

        using var limiter = new ConcurrencyLimiter(5, 5, 5);
        using var collector = CreateCollector(
            settings,
            repository.Object,
            new Mock<IEngineStatus>().Object,
            limiter,
            CreateBuffers(settings)
        );
        using var meters = new MeterCollector();

        await collector.StartAsync(TestContext.Current.CancellationToken);
        await asked.Task.WaitAsync(TimeSpan.FromSeconds(10), TestContext.Current.CancellationToken);
        await collector.StopAsync(TestContext.Current.CancellationToken);
        meters.RecordObservableInstruments();

        Assert.Equal(23, Assert.Single(meters.Values("altinn.workflow_engine.workflow.failed")));
    }

    [Fact]
    public async Task TheHealthReasonGauge_HasASeriesForEachConditionInTheDegradedMask_At1WhileItHolds()
    {
        using var meters = new MeterCollector();

        await RunOnePass(
            TimeSpan.FromMinutes(5),
            overdue: 0,
            engineHealth: EngineHealthStatus.Running
                | EngineHealthStatus.QueueFull
                | EngineHealthStatus.DatabaseUnavailable
        );
        meters.RecordObservableInstruments();

        Assert.Equal(
            new Dictionary<string, long>(StringComparer.Ordinal) { ["queue_full"] = 1, ["database_unavailable"] = 1 },
            meters.ByTag("altinn.workflow_engine.health.reason", "altinn.workflow_engine.reason")
        );
    }

    [Fact]
    public async Task TheGaugeReportsWhatTheCountReturned()
    {
        var observed = new List<long>();
        using var listener = new MeterListener
        {
            InstrumentPublished = (instrument, l) =>
            {
                if (
                    instrument.Meter.Name == Metrics.Meter.Name
                    && instrument.Name == "altinn.workflow_engine.mailbox.open.overdue"
                )
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

        await RunOnePass(TimeSpan.FromMinutes(5), overdue: 0, queued: (Mint: 2, Close: 1, Delivery: 3));

        meters.RecordObservableInstruments();

        Assert.Equal(
            new Dictionary<string, long>(StringComparer.Ordinal)
            {
                ["mint"] = 2,
                ["close"] = 1,
                ["delivery"] = 3,
            },
            meters.ByTag("altinn.workflow_engine.mailbox_buffer.depth", "altinn.workflow_engine.mailbox.operation")
        );
    }
}
