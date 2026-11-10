using System.Diagnostics.Metrics;

namespace Altinn.Studio.Gateway.Api.Tests;

/// <summary>
/// Records the measurements of meters created by its own <see cref="MeterFactory"/>, so a test sees only the code it
/// set up, even while other tests run.
/// </summary>
internal sealed class MetricRecorder : IDisposable
{
    private readonly MeterListener _listener = new();
    private readonly List<Measurement> _measurements = [];

    public MetricRecorder()
    {
        _listener.InstrumentPublished = (instrument, listener) =>
        {
            if (instrument.Meter.Scope == MeterFactory)
            {
                listener.EnableMeasurementEvents(instrument);
            }
        };
        _listener.SetMeasurementEventCallback<double>((instrument, value, tags, _) => Record(instrument, value, tags));
        _listener.SetMeasurementEventCallback<long>((instrument, value, tags, _) => Record(instrument, value, tags));
        _listener.Start();
    }

    public TestMeterFactory MeterFactory { get; } = new();

    public IReadOnlyList<Measurement> Measurements
    {
        get
        {
            lock (_measurements)
            {
                return [.. _measurements];
            }
        }
    }

    public void Dispose()
    {
        _listener.Dispose();
        MeterFactory.Dispose();
    }

    private void Record(Instrument instrument, double value, ReadOnlySpan<KeyValuePair<string, object?>> tags)
    {
        var tagDictionary = new Dictionary<string, object?>();
        foreach (var tag in tags)
        {
            tagDictionary[tag.Key] = tag.Value;
        }
        lock (_measurements)
        {
            _measurements.Add(new Measurement(instrument.Name, value, tagDictionary));
        }
    }

    internal sealed record Measurement(string Name, double Value, Dictionary<string, object?> Tags);
}
