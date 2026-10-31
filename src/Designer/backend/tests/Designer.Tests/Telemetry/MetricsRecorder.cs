#nullable enable
using System;
using System.Collections.Concurrent;
using System.Collections.Generic;
using System.Diagnostics.Metrics;
using System.Linq;
using Microsoft.Extensions.DependencyInjection;

namespace Designer.Tests.Telemetry;

/// <summary>
/// Creates a metrics class on a meter factory of its own and records what it measures, so a test sees only its own
/// measurements while other tests run in parallel.
/// </summary>
internal sealed class MetricsRecorder<TMetrics> : IDisposable
{
    private readonly ServiceProvider _services;
    private readonly MeterListener _listener;
    private readonly ConcurrentQueue<RecordedMeasurement> _measurements = new();

    public MetricsRecorder(Func<IMeterFactory, TMetrics> createMetrics)
    {
        _services = new ServiceCollection().AddMetrics().BuildServiceProvider();
        var meterFactory = _services.GetRequiredService<IMeterFactory>();
        Metrics = createMetrics(meterFactory);

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
        _listener.SetMeasurementEventCallback<long>(
            (instrument, value, tags, _) =>
                _measurements.Enqueue(
                    new RecordedMeasurement(
                        instrument.Name,
                        value,
                        tags.ToArray().ToDictionary(tag => tag.Key, tag => tag.Value)
                    )
                )
        );
        _listener.Start();
    }

    public TMetrics Metrics { get; }

    public IReadOnlyList<RecordedMeasurement> Measurements(string instrumentName) =>
        [.. _measurements.Where(measurement => measurement.InstrumentName == instrumentName)];

    /// <summary>
    /// Collects the observable instruments, and returns what one of them reports now.
    /// </summary>
    public IReadOnlyList<RecordedMeasurement> Observe(string instrumentName)
    {
        int recordedBefore = _measurements.Count;
        _listener.RecordObservableInstruments();
        return
        [
            .. _measurements.Skip(recordedBefore).Where(measurement => measurement.InstrumentName == instrumentName),
        ];
    }

    public void Dispose()
    {
        _listener.Dispose();
        _services.Dispose();
    }
}

internal sealed record RecordedMeasurement(
    string InstrumentName,
    long Value,
    IReadOnlyDictionary<string, object?> Tags
);
