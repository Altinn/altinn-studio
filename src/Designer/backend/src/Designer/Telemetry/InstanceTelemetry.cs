using System;
using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace Altinn.Studio.Designer.Telemetry;

internal sealed class InstanceTelemetry : IDisposable
{
    public const string MeterName = "studio-designer";
    public const string StartTimeMetricName = "altinn.workload.start_time";

    public static readonly string ServiceInstanceId = Guid.NewGuid().ToString();

    private readonly Meter _meter = new(MeterName);

    public InstanceTelemetry()
    {
        using Process process = Process.GetCurrentProcess();
        double startTime = new DateTimeOffset(process.StartTime.ToUniversalTime()).ToUnixTimeMilliseconds() / 1000d;
        _meter.CreateObservableGauge(
            StartTimeMetricName,
            () => startTime,
            unit: "s",
            description: "Process start time in seconds since the Unix epoch."
        );
    }

    public void Dispose() => _meter.Dispose();
}
