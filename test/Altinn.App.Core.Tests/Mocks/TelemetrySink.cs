using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using Altinn.App.Core.Configuration;
using Altinn.App.Core.Features;
using Altinn.App.Core.Models;
using FluentAssertions;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Options;
using static Altinn.App.Core.Tests.Mocks.TelemetrySink;

namespace Altinn.App.Core.Tests.Mocks;

internal sealed record TelemetrySink : IDisposable
{
    internal bool IsDisposed { get; private set; }

    internal static ConcurrentDictionary<Scope, byte> Scopes { get; } = [];

    internal Telemetry Object { get; }

    internal ActivityListener ActivityListener { get; }

    internal MeterListener MeterListener { get; }

    private readonly ConcurrentBag<Activity> _activities = [];
    private readonly ConcurrentDictionary<string, IReadOnlyList<MetricMeasurement>> _metricValues = [];

    internal readonly record struct MetricMeasurement(long Value, IReadOnlyDictionary<string, object?> Tags);

    internal IEnumerable<Activity> CapturedActivities => _activities;

    internal IReadOnlyDictionary<string, IReadOnlyList<MetricMeasurement>> CapturedMetrics => _metricValues;

    internal TelemetrySnapshot GetSnapshot() => new(CapturedActivities, CapturedMetrics);

    internal TelemetrySink(string org = "ttd", string name = "test", string version = "v1")
    {
        var appId = new AppIdentifier(org, name);
        var options = new AppSettings { AppVersion = version, };

        Object = new Telemetry(appId, Options.Create(options));

        ActivityListener = new ActivityListener()
        {
            ShouldListenTo = (activitySource) =>
            {
                var sameSource = ReferenceEquals(activitySource, Object.ActivitySource);
                return sameSource;
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
                if (!sameSource)
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

    internal sealed class Scope : IDisposable
    {
        public bool IsDisposed { get; internal set; }

        public void Dispose() => Scopes.TryRemove(this, out _).Should().BeTrue();
    }

    internal static Scope CreateScope()
    {
        var scope = new Scope();
        Scopes.TryAdd(scope, default).Should().BeTrue();
        return scope;
    }
}

internal class TelemetrySnapshot(
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

internal static class TelemetryDI
{
    internal static IServiceCollection AddTelemetrySink(this IServiceCollection services)
    {
        services.AddSingleton(_ => new TelemetrySink());
        services.AddSingleton<Telemetry>(sp => sp.GetRequiredService<TelemetrySink>().Object);
        return services;
    }
}

public class TelemetryDITests
{
    [Theory]
    [InlineData(true)]
    [InlineData(false)]
    public void TelemetryFake_Is_Disposed(bool materialize)
    {
        using var scope = TelemetrySink.CreateScope();
        scope.IsDisposed.Should().BeFalse();

        var services = new ServiceCollection();
        services.AddTelemetrySink();
        var sp = services.BuildServiceProvider(
            new ServiceProviderOptions { ValidateOnBuild = true, ValidateScopes = true, }
        );

        if (materialize)
        {
            var fake = sp.GetRequiredService<TelemetrySink>();
            fake.IsDisposed.Should().BeFalse();
            scope.IsDisposed.Should().BeFalse();
            sp.Dispose();
            fake.IsDisposed.Should().BeTrue();
            scope.IsDisposed.Should().BeTrue();
        }
        else
        {
            scope.IsDisposed.Should().BeFalse();
            sp.Dispose();
            scope.IsDisposed.Should().BeFalse();
        }
    }
}
