using System.Diagnostics.Metrics;

namespace Altinn.Studio.Gateway.Api.Tests;

/// <summary>
/// Creates meters scoped to this factory, so a test listens only to the measurements of the code it set up.
/// </summary>
internal sealed class TestMeterFactory : IMeterFactory
{
    /// <summary>
    /// For tests that don't look at the measurements.
    /// </summary>
    public static readonly TestMeterFactory Shared = new();

    private readonly List<Meter> _meters = [];

    public Meter Create(MeterOptions options)
    {
        var meter = new Meter(options.Name, options.Version, options.Tags, scope: this);
        _meters.Add(meter);
        return meter;
    }

    public void Dispose()
    {
        foreach (var meter in _meters)
        {
            meter.Dispose();
        }
    }
}
