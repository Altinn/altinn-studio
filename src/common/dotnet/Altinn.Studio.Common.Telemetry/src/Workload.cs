using System;
using System.Diagnostics;
using System.Diagnostics.Metrics;

namespace Altinn.Studio.Common.Telemetry;

/// <summary>
/// How a process identifies itself and reports when it started, the same in every Studio service, as the
/// observability standard decides. Together they give a dashboard the
/// processes reporting, a mark for each restart or scale-up, and, as the earliest start per <c>service.version</c>, a
/// mark for each deploy.
/// </summary>
public static class Workload
{
    /// <summary>
    /// The one metric every service reports under the same name, outside its own <c>altinn.&lt;service&gt;.</c>
    /// namespace.
    /// </summary>
    public const string StartTimeMetricName = "altinn.workload.start_time";

    private static readonly Meter _meter = new("Altinn.Studio.Workload");

    private static readonly double _startTime = ResolveProcessStartTime();

    /// <summary>
    /// The <c>service.instance.id</c> resource attribute when the deployment sets none in <c>OTEL_RESOURCE_ATTRIBUTES</c>:
    /// a UUID generated once per process, so a restart gets a new one even inside the same pod. Every trace, metric and
    /// log the process exports carries the same value. It identifies a process, not an Altinn instance.
    /// </summary>
    public static string InstanceId { get; } = Guid.NewGuid().ToString();

    /// <summary>
    /// The <c>altinn.workload.start_time</c> gauge: the process start time in seconds since the Unix epoch, reported at
    /// every collection whether or not the service is doing anything. <see cref="AltinnStudioOpenTelemetry"/> adds its
    /// meter. It's created once per process, so that every meter provider in the process sees one gauge, as with
    /// several test hosts.
    /// </summary>
    public static ObservableGauge<double> StartTime { get; } =
        _meter.CreateObservableGauge(
            StartTimeMetricName,
            static () => _startTime,
            unit: "s",
            description: "Process start time in seconds since the Unix epoch."
        );

    private static double ResolveProcessStartTime()
    {
        using var process = Process.GetCurrentProcess();
        return new DateTimeOffset(process.StartTime.ToUniversalTime()).ToUnixTimeMilliseconds() / 1000d;
    }
}
