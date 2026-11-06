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
    private readonly ConcurrentQueue<RecordedDuration> _measurements = new();

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
        _listener.SetMeasurementEventCallback<double>(
            (instrument, value, tags, _) =>
                _measurements.Enqueue(
                    new RecordedDuration(
                        instrument.Name,
                        value,
                        tags.ToArray().ToDictionary(tag => tag.Key, tag => tag.Value)
                    )
                )
        );
        _listener.Start();
    }

    public AppDeployMetrics Metrics { get; }

    public IReadOnlyList<RecordedDuration> Measurements(string instrumentName) =>
        [.. _measurements.Where(measurement => measurement.InstrumentName == instrumentName)];

    public void Dispose()
    {
        _listener.Dispose();
        _services.Dispose();
    }
}

internal sealed record RecordedDuration(
    string InstrumentName,
    double Seconds,
    IReadOnlyDictionary<string, object?> Tags
);
