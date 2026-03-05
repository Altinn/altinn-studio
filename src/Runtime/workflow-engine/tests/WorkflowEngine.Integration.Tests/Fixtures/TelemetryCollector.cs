using System.Collections.Concurrent;
using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Globalization;
using WorkflowEngine.Telemetry;

namespace WorkflowEngine.Integration.Tests.Fixtures;

/// <summary>
/// Collects OpenTelemetry activities and meter measurements in-process for test assertions.
/// Registers an <see cref="ActivityListener"/> on <see cref="Metrics.Source"/> and a
/// <see cref="MeterListener"/> on <see cref="Metrics.Meter"/>.
/// </summary>
internal sealed class TelemetryCollector : IDisposable
{
    private readonly ActivityListener _activityListener;
    private readonly MeterListener _meterListener;

    public ConcurrentBag<Activity> Activities { get; } = [];
    public ConcurrentBag<(string Name, object Value, KeyValuePair<string, object?>[] Tags)> Measurements { get; } = [];

    public TelemetryCollector()
    {
        _activityListener = new ActivityListener
        {
            ShouldListenTo = source => source.Name == Metrics.Source.Name,
            Sample = (ref _) => ActivitySamplingResult.AllDataAndRecorded,
            ActivityStopped = activity => Activities.Add(activity),
        };
        ActivitySource.AddActivityListener(_activityListener);

        _meterListener = new MeterListener();
        _meterListener.InstrumentPublished = (instrument, listener) =>
        {
            if (instrument.Meter.Name == Metrics.Meter.Name)
                listener.EnableMeasurementEvents(instrument);
        };

        _meterListener.SetMeasurementEventCallback<long>(
            (instrument, measurement, tags, _) => Measurements.Add((instrument.Name, measurement, tags.ToArray()))
        );
        _meterListener.SetMeasurementEventCallback<double>(
            (instrument, measurement, tags, _) => Measurements.Add((instrument.Name, measurement, tags.ToArray()))
        );

        _meterListener.Start();
    }

    /// <summary>
    /// Returns all collected activities with the given operation name.
    /// </summary>
    public IReadOnlyList<Activity> GetActivities(string operationName) =>
        Activities.Where(a => a.OperationName == operationName).ToList();

    /// <summary>
    /// Returns all collected activities whose operation name starts with the given prefix.
    /// </summary>
    public IReadOnlyList<Activity> GetActivitiesStartingWith(string prefix) =>
        Activities.Where(a => a.OperationName.StartsWith(prefix, StringComparison.Ordinal)).ToList();

    /// <summary>
    /// Returns all measurements recorded for the given instrument name.
    /// </summary>
    public IReadOnlyList<(string Name, object Value, KeyValuePair<string, object?>[] Tags)> GetMeasurements(
        string instrumentName
    ) => Measurements.Where(m => m.Name == instrumentName).ToList();

    /// <summary>
    /// Returns the sum of all long counter measurements for the given instrument name.
    /// </summary>
    public long GetCounterTotal(string instrumentName) =>
        Measurements
            .Where(m => m.Name == instrumentName)
            .Sum(m => Convert.ToInt64(m.Value, CultureInfo.InvariantCulture));

    /// <summary>
    /// Returns true if at least one measurement was recorded for the given instrument name.
    /// </summary>
    public bool HasMeasurement(string instrumentName) => Measurements.Any(m => m.Name == instrumentName);

    public void Dispose()
    {
        _activityListener.Dispose();
        _meterListener.Dispose();
    }
}
