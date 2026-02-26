using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Threading.Channels;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;

namespace Altinn.App.Tests.Common;

public static class TelemetrySinkDI
{
    public static IServiceCollection AddTelemetrySink(
        this IServiceCollection services,
        string org = "ttd",
        string name = "test",
        string version = "v1",
        Func<ActivitySource, bool>? additionalActivitySources = null,
        Func<Meter, bool>? additionalMeters = null,
        Func<Activity, bool>? filterActivities = null,
        Func<MetricMeasurement, bool>? filterMetrics = null
    )
    {
        var telemetryRegistration = services.FirstOrDefault(s => s.ServiceType == typeof(Telemetry));
        if (telemetryRegistration is not null)
            services.Remove(telemetryRegistration);

        services.AddSingleton(sp => new TelemetrySink(
            sp,
            org,
            name,
            version,
            telemetry: null,
            additionalActivitySources,
            additionalMeters,
            filterActivities,
            filterMetrics
        ));
        services.AddSingleton<Telemetry>(sp => sp.GetRequiredService<TelemetrySink>().Object);

        return services;
    }
}

public sealed record TelemetrySink : IDisposable
{
    private long _disposal = 0;
    public bool IsDisposed => Interlocked.Read(ref _disposal) == 1;

    public static ConcurrentDictionary<Scope, byte> Scopes { get; } = [];

    public Telemetry Object { get; }

    public ActivityListener ActivityListener { get; }

    public MeterListener MeterListener { get; }

    private readonly Channel<Activity> _serverActivities = Channel.CreateBounded<Activity>(
        new BoundedChannelOptions(1024)
        {
            SingleReader = false,
            SingleWriter = false,
            AllowSynchronousContinuations = false,
            FullMode = BoundedChannelFullMode.DropOldest,
        }
    );
    private readonly Channel<MetricMeasurement> _serverMetrics = Channel.CreateBounded<MetricMeasurement>(
        new BoundedChannelOptions(1024)
        {
            SingleReader = false,
            SingleWriter = false,
            AllowSynchronousContinuations = false,
            FullMode = BoundedChannelFullMode.DropOldest,
        }
    );

    private readonly Func<Activity, bool>? _filterActivities;
    private readonly Func<MetricMeasurement, bool>? _filterMetrics;
    private readonly TestId? _testId;

    public async Task<IReadOnlyList<Activity>> WaitForServerActivity(int n = 1, CancellationToken ct = default) =>
        await _serverActivities.Reader.ReadAllAsync(ct).Take(n).ToArrayAsync(ct);

    public async Task<IReadOnlyList<MetricMeasurement>> WaitForServerMetric(
        int n = 1,
        CancellationToken ct = default
    ) => await _serverMetrics.Reader.ReadAllAsync(ct).Take(n).ToArrayAsync(ct);

    public async Task<(
        IReadOnlyList<Activity> Activities,
        IReadOnlyList<MetricMeasurement> Metrics
    )> WaitForServerTelemetry(int n = 1, CancellationToken ct = default)
    {
        var activitiesTask = WaitForServerActivity(n, ct);
        var metricsTask = WaitForServerMetric(n, ct);
        await Task.WhenAll(activitiesTask, metricsTask);
        var activities = await activitiesTask;
        var metrics = await metricsTask;

        return (activities, metrics);
    }

    private readonly ConcurrentBag<Activity> _activities = [];
    private readonly ConcurrentDictionary<
        (string Name, string Meter),
        IReadOnlyList<MetricMeasurement>
    > _metricValues = [];
    private readonly IServiceProvider? _serviceProvider;

    public IEnumerable<Activity> CapturedActivities =>
        _activities.OrderBy(a => a.OperationName).ThenBy(a => a.StartTimeUtc).ToArray();

    public IReadOnlyDictionary<(string Name, string Meter), IReadOnlyList<MetricMeasurement>> CapturedMetrics =>
        _metricValues.ToDictionary();

    public TelemetrySnapshot GetSnapshot() => new(CapturedActivities, CapturedMetrics);

    public TelemetrySink(
        IServiceProvider? serviceProvider = null,
        string org = "ttd",
        string name = "test",
        string version = "v1",
        Telemetry? telemetry = null,
        Func<ActivitySource, bool>? additionalActivitySources = null,
        Func<Meter, bool>? additionalMeters = null,
        Func<Activity, bool>? filterActivities = null,
        Func<MetricMeasurement, bool>? filterMetrics = null
    )
    {
        _serviceProvider = serviceProvider;
        if (additionalActivitySources is not null)
            Assert.NotNull(_serviceProvider);
        if (additionalMeters is not null)
            Assert.NotNull(_serviceProvider);
        if (filterActivities is not null)
            Assert.NotNull(_serviceProvider);
        if (filterMetrics is not null)
            Assert.NotNull(_serviceProvider);

        _filterActivities = filterActivities;
        _filterMetrics = filterMetrics;

        _testId = serviceProvider?.GetService<TestId>();

        var appId = new AppIdentifier(org, name);
        var options = new AppSettings { AppVersion = version };

        Object = telemetry ?? new Telemetry(appId, Options.Create(options));

        ActivityListener = new ActivityListener()
        {
            ShouldListenTo = (activitySource) =>
            {
                if (IsDisposed)
                    return false;
                var sameSource = ReferenceEquals(activitySource, Object.ActivitySource);
                return sameSource || (additionalActivitySources?.Invoke(activitySource) ?? false);
            },
            Sample = (ref ActivityCreationOptions<ActivityContext> options) =>
            {
                if (IsDisposed)
                    return ActivitySamplingResult.None;
                return ActivitySamplingResult.AllDataAndRecorded;
            },
            ActivityStopped = activity =>
            {
                if (IsDisposed)
                    return;
                if (!TestIdActivityFilter(activity))
                    return;
                if (_filterActivities is not null && !_filterActivities(activity))
                    return;
                _activities.Add(activity);
                if (activity.Kind == ActivityKind.Server)
                    _serverActivities.Writer.TryWrite(activity);
            },
        };
        ActivitySource.AddActivityListener(ActivityListener);

        MeterListener = new MeterListener()
        {
            InstrumentPublished = (instrument, listener) =>
            {
                if (IsDisposed)
                    return;
                var sameSource = ReferenceEquals(instrument.Meter, Object.Meter);
                if (!sameSource && (additionalMeters is null || !additionalMeters(instrument.Meter)))
                    return;

                var key = (instrument.Name, instrument.Meter.Name);
                _metricValues.TryAdd(key, new List<MetricMeasurement>());
                listener.EnableMeasurementEvents(instrument, this);
            },
        };
        MeterListener.SetMeasurementEventCallback<double>(MeasurementRecordedDouble);
        MeterListener.SetMeasurementEventCallback<float>(static (i, m, t, s) => MeasurementRecordedDouble(i, m, t, s));

        MeterListener.SetMeasurementEventCallback<long>(static (i, m, t, s) => MeasurementRecordedDouble(i, m, t, s));
        MeterListener.SetMeasurementEventCallback<int>(static (i, m, t, s) => MeasurementRecordedDouble(i, m, t, s));
        MeterListener.SetMeasurementEventCallback<short>(static (i, m, t, s) => MeasurementRecordedDouble(i, m, t, s));
        MeterListener.SetMeasurementEventCallback<byte>(static (i, m, t, s) => MeasurementRecordedDouble(i, m, t, s));
        MeterListener.Start();
    }

    private static void MeasurementRecordedDouble(
        Instrument instrument,
        double measurement,
        ReadOnlySpan<KeyValuePair<string, object?>> tagSpan,
        object? state
    )
    {
        Debug.Assert(state is TelemetrySink);
        var self = (TelemetrySink)state!;
        if (self.IsDisposed)
            return;
        var key = (instrument.Name, instrument.Meter.Name);
        Debug.Assert(self._metricValues[key] is List<MetricMeasurement>);
        var measurements = (List<MetricMeasurement>)self._metricValues[key];

        var tags = new Dictionary<string, object?>(tagSpan.Length);
        for (int i = 0; i < tagSpan.Length; i++)
            tags.Add(tagSpan[i].Key, tagSpan[i].Value);
        foreach (var t in instrument.Tags ?? [])
            tags.Add(t.Key, t.Value);

        MetricMeasurement record = new(instrument.Name, instrument.Meter.Name, measurement, tags);
        if (!self.TestIdMetricFilter(record))
            return;
        if (self._filterMetrics is not null && !self._filterMetrics(record))
            return;

        measurements.Add(record);

        if (instrument.Name == "http.server.request.duration" && Math.Abs(measurement) > double.Epsilon)
            self._serverMetrics.Writer.TryWrite(record);
    }

    private bool TestIdActivityFilter(Activity activity)
    {
        var thisTestId = _testId;
        if (thisTestId is null)
            return true;

        var current = activity;
        do
        {
            if (current.GetTagItem(nameof(TestId)) is Guid testId && testId == thisTestId.Value)
                return true;
            current = current.Parent;
        } while (current is not null);

        return false;
    }

    private bool TestIdMetricFilter(MetricMeasurement metric)
    {
        var thisTestId = _testId;
        if (thisTestId is null)
            return true;

        if (metric.Tags.TryGetValue(nameof(TestId), out var testId) && testId is Guid id && id == thisTestId.Value)
            return true;

        return false;
    }

    public void Dispose()
    {
        if (Interlocked.CompareExchange(ref _disposal, 1, 0) == 0)
        {
            ActivityListener.Dispose();
            MeterListener.Dispose();
            Object.Dispose();

            foreach (var (scope, _) in Scopes)
            {
                scope.IsDisposed = true;
            }
        }
    }

    public sealed class Scope : IDisposable
    {
        public bool IsDisposed { get; set; }

        public void Dispose() => Assert.True(Scopes.TryRemove(this, out _));
    }

    public static Scope CreateScope()
    {
        var scope = new Scope();
        Assert.True(Scopes.TryAdd(scope, default));
        return scope;
    }
}

public sealed record MetricMeasurement(
    string Name,
    string MeterName,
    double Value,
    IReadOnlyDictionary<string, object?> Tags
);

public class TelemetrySnapshot(
    IEnumerable<Activity>? activities,
    IReadOnlyDictionary<(string Name, string Meter), IReadOnlyList<MetricMeasurement>>? metrics
)
{
    // Properties must be public to be accessible for Verify.Xunit
    public readonly IReadOnlyList<ActivityInfo>? Activities = activities
        ?.Select(a => new ActivityInfo(
            a.DisplayName,
            a.Kind,
            a.IdFormat,
            a.Status,
            a.TagObjects.OrderBy(t => t.Key).ToArray(),
            a.Events.OrderBy(e => e.Name).ToArray(),
            a.ParentId is not null
        ))
        .ToArray();
    public readonly IReadOnlyList<MetricInfo>? Metrics = metrics
        ?.Select(m => new MetricInfo(
            m.Key.Name,
            m.Key.Meter,
            m.Value.Where(m => Math.Abs(m.Value) > double.Epsilon)
                .Select(measurement => new MetricMeasurementInfo(
                    double.IsInteger(measurement.Value) ? measurement.Value : null,
                    measurement.Tags.OrderBy(t => t.Key).ToArray()
                ))
                .ToArray()
        ))
        .Where(m => m.Measurements.Count > 0)
        .ToArray();
}

public sealed record ActivityInfo(
    string Name,
    ActivityKind Kind,
    ActivityIdFormat IdFormat,
    ActivityStatusCode Status,
    IReadOnlyList<KeyValuePair<string, object?>> Tags,
    IReadOnlyList<ActivityEvent> Events,
    bool HasParent
);

public sealed record MetricInfo(string Name, string MeterName, IReadOnlyList<MetricMeasurementInfo> Measurements);

public sealed record MetricMeasurementInfo(double? Value, IReadOnlyList<KeyValuePair<string, object?>> Tags);
