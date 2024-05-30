using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.Metrics;
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
        Func<IServiceProvider, ActivitySource, bool>? shouldAlsoListenToActivities = null,
        Func<IServiceProvider, Meter, bool>? shouldAlsoListenToMetrics = null
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
            shouldAlsoListenToMetrics
        ));
        services.AddSingleton<Telemetry>(sp => sp.GetRequiredService<TelemetrySink>().Object);

        return services;
    }
}

public sealed record TelemetrySink : IDisposable
{
    public bool IsDisposed { get; private set; }

    public static ConcurrentDictionary<Scope, byte> Scopes { get; } = [];

    public Telemetry Object { get; }

    public ActivityListener ActivityListener { get; }

    public MeterListener MeterListener { get; }

    private readonly ConcurrentBag<Activity> _activities = [];
    private readonly ConcurrentDictionary<string, IReadOnlyList<MetricMeasurement>> _metricValues = [];
    private readonly IServiceProvider? _serviceProvider;

    public readonly record struct MetricMeasurement(long Value, IReadOnlyDictionary<string, object?> Tags);

    public IEnumerable<Activity> CapturedActivities => _activities;

    public IReadOnlyDictionary<string, IReadOnlyList<MetricMeasurement>> CapturedMetrics => _metricValues;

    public TelemetrySnapshot GetSnapshot() => new(CapturedActivities, CapturedMetrics);

    public TelemetrySnapshot GetSnapshot(Activity activity) =>
        new([activity], new Dictionary<string, IReadOnlyList<MetricMeasurement>>());

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
        Func<IServiceProvider, ActivitySource, bool>? shouldAlsoListenToActivities = null,
        Func<IServiceProvider, Meter, bool>? shouldAlsoListenToMetrics = null
    )
    {
        _serviceProvider = serviceProvider;
        if (shouldAlsoListenToActivities is not null)
            Assert.NotNull(_serviceProvider);
        if (shouldAlsoListenToMetrics is not null)
            Assert.NotNull(_serviceProvider);

        var appId = new AppIdentifier(org, name);
        var options = new AppSettings { AppVersion = version, };

        Object = telemetry ?? new Telemetry(appId, Options.Create(options));

        ActivityListener = new ActivityListener()
        {
            ShouldListenTo = (activitySource) =>
            {
                var sameSource = ReferenceEquals(activitySource, Object.ActivitySource);
                return sameSource || (shouldAlsoListenToActivities?.Invoke(_serviceProvider!, activitySource) ?? false);
            },
            Sample = (ref ActivityCreationOptions<ActivityContext> options) =>
                ActivitySamplingResult.AllDataAndRecorded,
            ActivityStarted = activity =>
            {
                _activities.Add(activity);
            },
        };
        ActivitySource.AddActivityListener(ActivityListener);

        MeterListener = new MeterListener()
        {
            InstrumentPublished = (instrument, listener) =>
            {
                var sameSource = ReferenceEquals(instrument.Meter, Object.Meter);
                if (
                    !sameSource
                    && (
                        shouldAlsoListenToMetrics is null
                        || !shouldAlsoListenToMetrics(serviceProvider!, instrument.Meter)
                    )
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
        ActivityListener.Dispose();
        MeterListener.Dispose();
        Object.Dispose();
        IsDisposed = true;

        foreach (var (scope, _) in Scopes)
        {
            scope.IsDisposed = true;
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
        Tags = a.TagObjects.Select(tag => new KeyValuePair<string, string?>(tag.Key, tag.Value?.ToString())),
        a.IdFormat,
        a.Status,
        a.Events,
        a.Kind
    });
    public readonly IEnumerable<KeyValuePair<string, IReadOnlyList<MetricMeasurement>>>? Metrics = metrics
        ?.Select(m => new KeyValuePair<string, IReadOnlyList<MetricMeasurement>>(m.Key, m.Value))
        .Where(x => x.Value.Count != 0);
}
