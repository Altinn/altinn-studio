using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging.Abstractions;
using Microsoft.Extensions.Options;
using Moq;
using OpenTelemetry;
using OpenTelemetry.Metrics;
using WorkflowEngine.Data;
using WorkflowEngine.Data.Repository;
using WorkflowEngine.Models;
using WorkflowEngine.Telemetry;
using WorkflowEngine.Telemetry.Extensions;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// Tests for the per-namespace workflow gauge: which series it reports, and what a failed read leaves it at.
/// </summary>
/// <remarks>
/// In the background-service collection: the gauge is process-global.
/// </remarks>
[Collection("BackgroundServiceTests")]
public class WorkflowCountCollectorTests
{
    private static readonly DateTimeOffset _now = new(2026, 11, 26, 12, 0, 0, TimeSpan.Zero);

    /// <summary>
    /// The status values of the gauge, as dashboards query them.
    /// </summary>
    private static readonly string[] _statuses =
    [
        "scheduled",
        "enqueued",
        "processing",
        "requeued",
        "waiting",
        "held",
        "failed",
        "canceled",
        "dependency_failed",
    ];

    /// <summary>
    /// Every status of each of <paramref name="namespaces"/> at zero, but for <paramref name="counts"/>.
    /// </summary>
    private static Dictionary<(string Namespace, string Status), long> Grid(
        IEnumerable<string> namespaces,
        params (string Namespace, string Status, long Count)[] counts
    )
    {
        var grid = namespaces
            .SelectMany(ns => _statuses.Select(status => (ns, status)))
            .ToDictionary(key => key, _ => 0L);
        foreach (var (ns, status, count) in counts)
            grid[(ns, status)] = count;
        return grid;
    }

    private static Dictionary<(string Namespace, string Status), long> AsGrid(
        IEnumerable<(string Namespace, string Status, long Count)> series
    ) => series.ToDictionary(s => (s.Namespace, s.Status), s => s.Count);

    private static NamespaceStatusCount Count(
        string ns,
        PersistentItemStatus status,
        int count,
        bool scheduled = false
    ) => new(ns, status, scheduled, count);

    [Fact]
    public void EveryNamespaceGetsASeriesForEveryStatus_ZeroWhereItHasNone_WithScheduledApartFromEnqueued()
    {
        var series = WorkflowCountCollector.ToSeries(
            [
                Count("ttd/a", PersistentItemStatus.Enqueued, 2, scheduled: true),
                Count("ttd/a", PersistentItemStatus.Enqueued, 3),
                Count("ttd/a", PersistentItemStatus.DependencyFailed, 1),
                Count("ttd/b", PersistentItemStatus.Canceled, 4),
            ],
            []
        );

        Assert.Equal(
            Grid(
                ["ttd/a", "ttd/b"],
                ("ttd/a", "scheduled", 2),
                ("ttd/a", "enqueued", 3),
                ("ttd/a", "dependency_failed", 1),
                ("ttd/b", "canceled", 4)
            ),
            AsGrid(series)
        );
    }

    [Fact]
    public void ANamespaceKeepsItsSeriesAtZero_OnceItHasNoWorkflowsLeft()
    {
        HashSet<string> named = [];
        WorkflowCountCollector.ToSeries([Count("ttd/a", PersistentItemStatus.Failed, 1)], named);

        var series = WorkflowCountCollector.ToSeries([Count("ttd/b", PersistentItemStatus.Waiting, 1)], named);

        Assert.Equal(Grid(["ttd/a", "ttd/b"], ("ttd/b", "waiting", 1)), AsGrid(series));
    }

    [Fact]
    public void NamespacesBeyondTheCap_AreCountedUnderOther_WhileTheNamespacesNamedEarlierKeepTheirSeries()
    {
        string[] named =
        [
            .. Enumerable.Range(0, WorkflowCountCollector.MaxNamedNamespaces).Select(i => $"ttd/app-{i:D4}"),
        ];
        NamespaceStatusCount[] first = [.. named.Select(ns => Count(ns, PersistentItemStatus.Failed, 1))];
        HashSet<string> namedSoFar = [];
        WorkflowCountCollector.ToSeries(first, namedSoFar);

        // Ordered before the named namespaces, so a cap that picked the first namespaces of each read would take them.
        var series = WorkflowCountCollector.ToSeries(
            [
                .. first,
                Count("aaa/one", PersistentItemStatus.Failed, 2),
                Count("aaa/two", PersistentItemStatus.Failed, 3),
            ],
            namedSoFar
        );

        Assert.Equal(
            Grid([.. named, "_OTHER"], [.. named.Select(ns => (ns, "failed", 1L)), ("_OTHER", "failed", 5L)]),
            AsGrid(series)
        );
    }

    [Fact]
    public void ARead_ThatCrossesTheCap_NamesTheNamespacesThatComeFirstInOrdinalOrder()
    {
        // Replicas that start together over a database already past the cap must name the same namespaces, whatever
        // order the read returns them in.
        string[] namespaces =
        [
            .. Enumerable.Range(0, WorkflowCountCollector.MaxNamedNamespaces + 2).Select(i => $"ttd/app-{i:D4}"),
        ];

        var series = WorkflowCountCollector.ToSeries(
            [.. namespaces.Reverse().Select(ns => Count(ns, PersistentItemStatus.Failed, 1))],
            []
        );

        Assert.Equal(
            [.. namespaces.Take(WorkflowCountCollector.MaxNamedNamespaces), "_OTHER"],
            series.Select(s => s.Namespace).Distinct().ToHashSet()
        );
    }

    [Fact]
    public async Task TheCollector_ReadsOnItsOwnInterval_AndAFailedReadLeavesTheGaugeAtTheLastCountsRead()
    {
        var ct = TestContext.Current.CancellationToken;
        var settings = new EngineSettings
        {
            MetricsCollectionInterval = TimeSpan.FromSeconds(5),
            WorkflowCountCollectionInterval = TimeSpan.FromSeconds(15),
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
        var time = new DelayWatchingTimeProvider(_now);
        var reads = 0;
        using var readStarted = new SemaphoreSlim(0);

        // The first read answers, the second fails, the third never returns: once it has started, the second pass
        // is over.
        var repository = new Mock<IEngineRepository>(MockBehavior.Strict);
        repository
            .Setup(r => r.CountIncompleteAndFailedWorkflowsByNamespace(It.IsAny<CancellationToken>()))
            .Returns<CancellationToken>(async token =>
            {
                reads++;
                readStarted.Release();
                switch (reads)
                {
                    case 1:
                        return [Count("ttd/a", PersistentItemStatus.Failed, 1)];
                    case 2:
                        throw new TimeoutException("database unreachable");
                    default:
                        await Task.Delay(Timeout.Infinite, token);
                        throw new InvalidOperationException("unreachable");
                }
            });

        using var collector = new WorkflowCountCollector(
            NullLogger<WorkflowCountCollector>.Instance,
            repository.Object,
            Options.Create(settings),
            time
        );

        await collector.StartAsync(ct);
        await readStarted.WaitAsync(TimeSpan.FromSeconds(10), ct);

        await time.DelayStarted.WaitAsync(TimeSpan.FromSeconds(10), ct);
        time.Advance(TimeSpan.FromSeconds(14));
        var readEarly = await readStarted.WaitAsync(TimeSpan.FromMilliseconds(200), ct);
        time.Advance(TimeSpan.FromSeconds(1));
        Assert.True(await readStarted.WaitAsync(TimeSpan.FromSeconds(10), ct), "read 2 did not start");

        await time.DelayStarted.WaitAsync(TimeSpan.FromSeconds(10), ct);
        time.Advance(TimeSpan.FromSeconds(15));
        Assert.True(await readStarted.WaitAsync(TimeSpan.FromSeconds(10), ct), "read 3 did not start");

        var gauge = ReadGauge();
        await collector.StopAsync(ct);

        Assert.False(readEarly, "the collector read again before WorkflowCountCollectionInterval had passed");
        Assert.Equal(Grid(["ttd/a"], ("ttd/a", "failed", 1)), gauge);
    }

    [Fact]
    public void TheMostSeriesTheCollectorReports_AreExportedWhole()
    {
        using var exporter = new WorkflowCountExporter();
        using var reader = new BaseExportingMetricReader(exporter);
        var services = new ServiceCollection();
        var config = new ConfigurationBuilder().Build();
        services.AddSingleton<IConfiguration>(config);
        services.AddTelemetry(config);
        services.ConfigureOpenTelemetryMeterProvider(builder => builder.AddReader(reader));
        using var sp = services.BuildServiceProvider();
        _ = sp.GetRequiredService<MeterProvider>();

        NamespaceStatusCount[] counts =
        [
            .. Enumerable
                .Range(0, WorkflowCountCollector.MaxNamedNamespaces + 1)
                .Select(i => Count($"ttd/app-{i:D4}", PersistentItemStatus.Failed, 1)),
        ];
        Metrics.SetWorkflowCounts(WorkflowCountCollector.ToSeries(counts, []));
        reader.Collect();

        Assert.Equal((WorkflowCountCollector.MaxNamedNamespaces + 1) * _statuses.Length, exporter.Points.Count);
        Assert.DoesNotContain(exporter.Points, point => point.Tags.ContainsKey("otel.metric.overflow"));
        Assert.Equal(counts.Length, exporter.Points.Sum(point => point.Value));
    }

    private static Dictionary<(string Namespace, string Status), long> ReadGauge()
    {
        using var meters = new MeterCollector();
        meters.RecordObservableInstruments();
        return meters
            .Measurements("altinn.workflow_engine.workflow.count")
            .ToDictionary(
                m =>
                    (
                        (string)m.Tags.Single(t => t.Key == "altinn.workflow_engine.namespace").Value!,
                        (string)m.Tags.Single(t => t.Key == "altinn.workflow_engine.workflow.status").Value!
                    ),
                m => m.Value
            );
    }

    /// <summary>
    /// Keeps the points of the per-namespace workflow gauge, with their attributes.
    /// </summary>
    private sealed class WorkflowCountExporter : BaseExporter<Metric>
    {
        public List<(long Value, Dictionary<string, object?> Tags)> Points { get; } = [];

        public override ExportResult Export(in Batch<Metric> batch)
        {
            foreach (var metric in batch)
            {
                if (metric.Name != "altinn.workflow_engine.workflow.count")
                    continue;

                foreach (ref readonly var point in metric.GetMetricPoints())
                {
                    var tags = new Dictionary<string, object?>(StringComparer.Ordinal);
                    foreach (var tag in point.Tags)
                        tags[tag.Key] = tag.Value;
                    Points.Add((point.GetGaugeLastValueLong(), tags));
                }
            }

            return ExportResult.Success;
        }
    }
}
