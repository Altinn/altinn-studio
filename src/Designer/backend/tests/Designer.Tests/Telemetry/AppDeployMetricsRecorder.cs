#nullable enable
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics.Metrics;
using System.Linq;
using Altinn.Studio.Designer.Telemetry;
using Microsoft.Extensions.DependencyInjection;

namespace Designer.Tests.Telemetry;

/// <summary>
/// Creates <see cref="AppDeployMetrics"/> on a meter factory of its own and records what they measure, so a test
/// sees only its own measurements while other tests run in parallel.
/// </summary>
internal sealed class AppDeployMetricsRecorder : IDisposable
{
    private readonly ServiceProvider _services;
    private readonly MeterListener _listener;
    private readonly ConcurrentQueue<RecordedAppDeployMeasurement> _measurements = new();

    public AppDeployMetricsRecorder()
    {
        _services = new ServiceCollection().AddMetrics().BuildServiceProvider();
        var meterFactory = _services.GetRequiredService<IMeterFactory>();
        Metrics = new AppDeployMetrics(meterFactory);

        _listener = new MeterListener
        {
            InstrumentPublished = (instrument, listener) =>
            {
                if (instrument.Meter.Scope == meterFactory)
                {
                    listener.EnableMeasurementEvents(instrument);
                }
            },
        };
        _listener.SetMeasurementEventCallback<double>((instrument, value, tags, _) => Enqueue(instrument, value, tags));
        _listener.SetMeasurementEventCallback<long>((instrument, value, tags, _) => Enqueue(instrument, value, tags));
        _listener.Start();
    }

    public AppDeployMetrics Metrics { get; }

    public IReadOnlyList<RecordedAppDeployMeasurement> Measurements(string instrumentName) =>
        [.. _measurements.Where(measurement => measurement.InstrumentName == instrumentName)];

    private void Enqueue(Instrument instrument, double value, ReadOnlySpan<KeyValuePair<string, object?>> tags) =>
        _measurements.Enqueue(
            new RecordedAppDeployMeasurement(
                instrument.Name,
                value,
                tags.ToArray().ToDictionary(tag => tag.Key, tag => tag.Value)
            )
        );

    public void Dispose()
    {
        _listener.Dispose();
        _services.Dispose();
    }
}

internal sealed record RecordedAppDeployMeasurement(
    string InstrumentName,
    double Value,
    IReadOnlyDictionary<string, object?> Tags
);
