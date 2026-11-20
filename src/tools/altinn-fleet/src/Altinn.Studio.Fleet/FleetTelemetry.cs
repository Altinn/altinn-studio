using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Reflection;

namespace Altinn.Studio.Fleet;

/// <summary>
/// The traces and metrics a sync records, named <see cref="Name"/>. A host that collects them, such as one with
/// OpenTelemetry, listens to that name. Without a listener they cost next to nothing.
/// </summary>
public sealed class FleetTelemetry : IDisposable
{
    /// <summary>The name of the activity source and the meter.</summary>
    public const string Name = "Altinn.Studio.Fleet";

    private readonly Meter _meter;

    /// <summary>Creates the source and meter, the meter from a factory when the host has one.</summary>
    public FleetTelemetry(IMeterFactory? meterFactory = null)
    {
        Version =
            typeof(FleetTelemetry)
                .Assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()
                ?.InformationalVersion
            ?? "unknown";
        ActivitySource = new ActivitySource(Name, Version);
        _meter = meterFactory?.Create(Name, Version) ?? new Meter(Name, Version);
        AppsFetched = _meter.CreateCounter<long>("fleet.apps.fetched", "{app}", "Apps downloaded and extracted.");
        AppsFailed = _meter.CreateCounter<long>("fleet.apps.failed", "{app}", "Apps that could not be fetched.");
        BytesExtracted = _meter.CreateCounter<long>("fleet.bytes.extracted", "By", "Bytes written to app folders.");
        FetchDuration = _meter.CreateHistogram<double>("fleet.fetch.duration", "s", "Time to fetch one app.");
        SyncDuration = _meter.CreateHistogram<double>("fleet.sync.duration", "s", "Time to sync one environment.");
    }

    /// <summary>The tool's version.</summary>
    public string Version { get; }

    internal ActivitySource ActivitySource { get; }

    internal Counter<long> AppsFetched { get; }

    internal Counter<long> AppsFailed { get; }

    internal Counter<long> BytesExtracted { get; }

    internal Histogram<double> FetchDuration { get; }

    internal Histogram<double> SyncDuration { get; }

    /// <inheritdoc />
    public void Dispose()
    {
        ActivitySource.Dispose();
        _meter.Dispose();
    }
}
