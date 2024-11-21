using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Runtime.CompilerServices;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using OpenTelemetry.Metrics;
using OpenTelemetry.Trace;
using static Altinn.App.Common.Tests.TelemetrySink;

namespace Altinn.App.Common.Tests;

public static class TelemetryDI
{
    public static IServiceCollection AddTelemetrySink(
        this IServiceCollection services,
        string org = "ttd",
        string name = "test",
        string version = "v1",
        Func<TestId?, ActivitySource, bool>? shouldAlsoListenToActivities = null,
        Func<TestId?, Meter, bool>? shouldAlsoListenToMetrics = null,
        Func<TestId?, Activity, bool>? activityFilter = null
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
            activityFilter
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

    public async Task WaitForServerActivity() => await _serverActivityTcs.Task;

    private readonly ConcurrentBag<Activity> _activities = [];
    private readonly ConcurrentDictionary<string, IReadOnlyList<MetricMeasurement>> _metricValues = [];
    private readonly IServiceProvider? _serviceProvider;

    public readonly record struct MetricMeasurement(long Value, IReadOnlyDictionary<string, object?> Tags);

    public IEnumerable<Activity> CapturedActivities =>
        _activities.OrderBy(a => a.OperationName).ThenBy(a => a.StartTimeUtc).ToArray();

    public IReadOnlyDictionary<string, IReadOnlyList<MetricMeasurement>> CapturedMetrics => _metricValues;

    public TelemetrySnapshot GetSnapshot() => new(CapturedActivities, CapturedMetrics);

    public TelemetrySnapshot GetSnapshot(Activity activity) =>
        new([activity], new Dictionary<string, IReadOnlyList<MetricMeasurement>>());

    public TelemetrySnapshot GetSnapshot(IEnumerable<Activity> activities) =>
        new(activities, new Dictionary<string, IReadOnlyList<MetricMeasurement>>());

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
        TryFlush();
        var task = Verify(GetSnapshot(activities), settings: settings, sourceFile: sourceFile);
        if (configure is not null)
            task = configure(task);
        await task;
    }

    public void TryFlush()
    {
        Assert.NotNull(_serviceProvider);

        var meterProvider = _serviceProvider.GetService<MeterProvider>();
        var traceProvider = _serviceProvider.GetService<TracerProvider>();
        Assert.NotNull(meterProvider);
        Assert.NotNull(traceProvider);

        _ = meterProvider.ForceFlush(25);
        _ = traceProvider.ForceFlush(25);
    }

    public TelemetrySink(
        IServiceProvider? serviceProvider = null,
        string org = "ttd",
        string name = "test",
        string version = "v1",
        Telemetry? telemetry = null,
        Func<TestId?, ActivitySource, bool>? shouldAlsoListenToActivities = null,
        Func<TestId?, Meter, bool>? shouldAlsoListenToMetrics = null,
        Func<TestId?, Activity, bool>? activityFilter = null
    )
    {
        _serviceProvider = serviceProvider;
        if (shouldAlsoListenToActivities is not null)
            Assert.NotNull(_serviceProvider);
        if (shouldAlsoListenToMetrics is not null)
            Assert.NotNull(_serviceProvider);
        if (activityFilter is not null)
            Assert.NotNull(_serviceProvider);

        var testId = serviceProvider?.GetService<TestId>();

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
                return sameSource || (shouldAlsoListenToActivities?.Invoke(testId, activitySource) ?? false);
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

                if (activityFilter is not null && !activityFilter(testId, activity))
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
                    && (shouldAlsoListenToMetrics is null || !shouldAlsoListenToMetrics(testId, instrument.Meter))
                )
                {
                    return;
                }

                _metricValues.TryAdd(instrument.Name, new List<MetricMeasurement>());
                listener.EnableMeasurementEvents(instrument, this);
            },
        };
        MeterListener.SetMeasurementEventCallback<long>(
            static (instrument, measurement, tagSpan, state) =>
            {
                Debug.Assert(state is not null);
                var self = (TelemetrySink)state!;
                if (self.IsDisposed)
                    return;
                Debug.Assert(self._metricValues[instrument.Name] is List<MetricMeasurement>);
                var measurements = (List<MetricMeasurement>)self._metricValues[instrument.Name];
                var tags = new Dictionary<string, object?>(tagSpan.Length);
                for (int i = 0; i < tagSpan.Length; i++)
                {
                    tags.Add(tagSpan[i].Key, tagSpan[i].Value);
                }

                foreach (var t in instrument.Tags ?? [])
                {
                    tags.Add(t.Key, t.Value);
                }

                measurements.Add(new(measurement, tags));
            }
        );
        MeterListener.Start();
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

        public void Dispose() => Scopes.TryRemove(this, out _).Should().BeTrue();
    }

    public static Scope CreateScope()
    {
        var scope = new Scope();
        Scopes.TryAdd(scope, default).Should().BeTrue();
        return scope;
    }
}

public class TelemetrySnapshot(
    IEnumerable<Activity>? activities,
    IReadOnlyDictionary<string, IReadOnlyList<MetricMeasurement>>? metrics
)
{
    // Properties must be public to be accessible for Verify.Xunit
    public readonly IEnumerable<object>? Activities = activities?.Select(a => new
    {
        ActivityName = a.DisplayName,
        Tags = a
            .TagObjects.Select(tag => new KeyValuePair<string, string?>(tag.Key, tag.Value?.ToString()))
            .Where(tag => tag.Key != "_MS.ProcessedByMetricExtractors")
            .OrderBy(tag => tag.Key)
            .ToList(),
        a.IdFormat,
        a.Status,
        a.Events,
        a.Kind,
    });
    public readonly IEnumerable<KeyValuePair<string, IReadOnlyList<MetricMeasurement>>>? Metrics = metrics
        ?.Select(m => new KeyValuePair<string, IReadOnlyList<MetricMeasurement>>(m.Key, m.Value))
        .Where(x => x.Value.Count != 0);
}
