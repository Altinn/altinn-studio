using System.Collections.Concurrent;
using System.Diagnostics.Metrics;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Core.Tests;

/// <summary>
/// Collects every <see cref="long"/> measurement the engine's meter publishes, with its tags, for tests
/// asserting on a counter's tagged series. Local rather than the TestKit's collector, which this project does
/// not reference.
/// </summary>
/// <remarks>
/// The meter is process-global, so an exact-total assertion holds only if nothing else records into that same
/// instrument while the test runs. Which is why the classes asserting on <c>engine.mailbox_buffer.*</c> all
/// share the background-service collection; a test asserting on a further instrument has to establish the same
/// thing for itself.
/// </remarks>
internal sealed class MeterCollector : IDisposable
{
    private readonly MeterListener _listener;
    private readonly ConcurrentBag<(string Name, long Value, KeyValuePair<string, object?>[] Tags)> _taken = [];

    public MeterCollector()
    {
        _listener = new MeterListener
        {
            InstrumentPublished = (instrument, listener) =>
            {
                if (instrument.Meter.Name == Metrics.Meter.Name)
                    listener.EnableMeasurementEvents(instrument);
            },
        };
        _listener.SetMeasurementEventCallback<long>(
            (instrument, measurement, tags, _) => _taken.Add((instrument.Name, measurement, tags.ToArray()))
        );
        _listener.Start();
    }

    /// <summary>
    /// Takes one reading of every observable instrument on the meter. Gauges publish nothing on their own, so a
    /// test asserting on one calls this after the code that set it has run.
    /// </summary>
    public void RecordObservableInstruments() => _listener.RecordObservableInstruments();

    /// <summary>
    /// The totals <paramref name="instrumentName"/> recorded, summed per distinct value of
    /// <paramref name="tagKey"/>.
    /// </summary>
    public Dictionary<string, long> ByTag(string instrumentName, string tagKey) =>
        _taken
            .Where(m => m.Name == instrumentName)
            .GroupBy(m => (string)m.Tags.Single(t => t.Key == tagKey).Value!)
            .ToDictionary(g => g.Key, g => g.Sum(m => m.Value), StringComparer.Ordinal);

    public void Dispose() => _listener.Dispose();
}
