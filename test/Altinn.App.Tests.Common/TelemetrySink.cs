using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Runtime.CompilerServices;
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
        Func<TestId?, ActivitySource, bool>? shouldAlsoListenToActivities = null,
        Func<TestId?, Meter, bool>? shouldAlsoListenToMetrics = null,
        Func<TestId?, Activity, bool>? activityFilter = null,
        Func<TestId?, MetricMeasurement, bool>? metricFilter = null
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
            shouldAlsoListenToActivities,
            shouldAlsoListenToMetrics,
            activityFilter,
            metricFilter
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

    private bool _waitForServerActivity = true;
    private readonly TaskCompletionSource _serverActivityTcs = new(TaskCreationOptions.RunContinuationsAsynchronously);

    private readonly Func<TestId?, Activity, bool>? _activityFilter;
    private readonly Func<TestId?, MetricMeasurement, bool>? _metricFilter;
    private readonly TestId? _testId;

    public async Task WaitForServerActivity() => await _serverActivityTcs.Task;

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

    public TelemetrySnapshot GetSnapshot(Activity activity) =>
        new([activity], new Dictionary<(string Name, string Meter), IReadOnlyList<MetricMeasurement>>());

    public TelemetrySnapshot GetSnapshot(IEnumerable<Activity> activities) =>
        new(activities, new Dictionary<(string Name, string Meter), IReadOnlyList<MetricMeasurement>>());

    public async Task Snapshot(
        Func<SettingsTask, SettingsTask>? configure = null,
        VerifySettings? settings = null,
        [CallerFilePath] string sourceFile = ""
    ) => await SnapshotInternal(configure, settings, sourceFile);

    public async Task Snapshot(
        Activity activity,
        Func<SettingsTask, SettingsTask>? configure = null,
        VerifySettings? settings = null,
        [CallerFilePath] string sourceFile = ""
    ) => await SnapshotActivitiesInternal([activity], configure, settings, sourceFile);

    public async Task SnapshotActivities(
        Func<SettingsTask, SettingsTask>? configure = null,
        VerifySettings? settings = null,
        [CallerFilePath] string sourceFile = ""
    )
    {
        if (_waitForServerActivity)
            await _serverActivityTcs.Task;
        await SnapshotActivitiesInternal(CapturedActivities, configure, settings, sourceFile);
    }

    private async Task SnapshotActivitiesInternal(
        IEnumerable<Activity> activities,
        Func<SettingsTask, SettingsTask>? configure = null,
        VerifySettings? settings = null,
        [CallerFilePath] string sourceFile = ""
    )
    {
        var task = Verify(GetSnapshot(activities), settings: settings, sourceFile: sourceFile);
        if (configure is not null)
            task = configure(task);
        await task;
    }

    private async Task SnapshotInternal(
        Func<SettingsTask, SettingsTask>? configure = null,
        VerifySettings? settings = null,
        [CallerFilePath] string sourceFile = ""
    )
    {
        var task = Verify(GetSnapshot(), settings: settings, sourceFile: sourceFile);
        if (configure is not null)
            task = configure(task);
        await task;
    }

    public TelemetrySink(
        IServiceProvider? serviceProvider = null,
        string org = "ttd",
        string name = "test",
        string version = "v1",
        Telemetry? telemetry = null,
        Func<TestId?, ActivitySource, bool>? shouldAlsoListenToActivities = null,
        Func<TestId?, Meter, bool>? shouldAlsoListenToMetrics = null,
        Func<TestId?, Activity, bool>? activityFilter = null,
        Func<TestId?, MetricMeasurement, bool>? metricFilter = null
    )
    {
        _serviceProvider = serviceProvider;
        if (shouldAlsoListenToActivities is not null)
            Assert.NotNull(_serviceProvider);
        if (shouldAlsoListenToMetrics is not null)
            Assert.NotNull(_serviceProvider);
        if (activityFilter is not null)
            Assert.NotNull(_serviceProvider);
        if (metricFilter is not null)
            Assert.NotNull(_serviceProvider);

        _activityFilter = activityFilter;
        _metricFilter = metricFilter;

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
                return sameSource || (shouldAlsoListenToActivities?.Invoke(_testId, activitySource) ?? false);
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

                if (_activityFilter is not null && !_activityFilter(_testId, activity))
                    return;
                _activities.Add(activity);
                if (activity.Kind == ActivityKind.Server)
                    _serverActivityTcs.TrySetResult();
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
                if (
                    !sameSource
                    && (shouldAlsoListenToMetrics is null || !shouldAlsoListenToMetrics(_testId, instrument.Meter))
                )
                {
                    return;
                }

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
        Debug.Assert(state is not null);
        var self = (TelemetrySink)state!;
        if (self.IsDisposed)
            return;
        var key = (instrument.Name, instrument.Meter.Name);
        Debug.Assert(self._metricValues[key] is List<MetricMeasurement>);
        var measurements = (List<MetricMeasurement>)self._metricValues[key];
        var tags = new Dictionary<string, object?>(tagSpan.Length);
        for (int i = 0; i < tagSpan.Length; i++)
        {
            tags.Add(tagSpan[i].Key, tagSpan[i].Value);
        }

        foreach (var t in instrument.Tags ?? [])
        {
            tags.Add(t.Key, t.Value);
        }

        MetricMeasurement record = new(instrument.Name, instrument.Meter.Name, measurement, tags);
        if (self._metricFilter is not null && !self._metricFilter(self._testId, record))
            return;

        measurements.Add(record);
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
