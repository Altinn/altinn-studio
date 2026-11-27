using System.Diagnostics;
using System.Diagnostics.Metrics;
using System.Reflection;
using OpenTelemetry.Resources;

namespace Altinn.App.Api.Infrastructure.Telemetry;

/// <summary>
/// The resource every signal of an app carries, and the process start gauge, as
/// <c>docs/observability.md</c> asks of every service.
/// </summary>
internal static class AppTelemetryResource
{
    /// <summary>
    /// <c>service.version</c> when the runtime gives the app no version, as in a local run.
    /// </summary>
    internal const string LocalServiceVersion = "dev";

    /// <summary>
    /// The meter of <see cref="StartTimeMetricName"/>, named as in <c>src/common</c>'s <c>Workload</c>, which the
    /// libraries don't link since its types are public.
    /// </summary>
    internal const string WorkloadMeterName = "Altinn.Studio.Workload";

    /// <summary>
    /// The one metric every Studio service reports under the same name: when the process started.
    /// </summary>
    internal const string StartTimeMetricName = "altinn.workload.start_time";

    private static readonly Meter _workloadMeter = new(WorkloadMeterName);

    private static readonly double _startTime = ResolveProcessStartTime();

    /// <summary>
    /// <c>service.instance.id</c>, unless the deployment sets one: a UUID per process, so a restart in the same pod
    /// gets a new one. It identifies a process, not an Altinn instance.
    /// </summary>
    internal static string InstanceId { get; } = Guid.NewGuid().ToString();

    /// <summary>
    /// The version of the app libraries, as in the app's package reference, such as <c>9.0.0</c> or
    /// <c>9.1.0-preview.3</c>.
    /// </summary>
    internal static string LibraryVersion { get; } = ResolveLibraryVersion();

    /// <summary>
    /// The <c>altinn.workload.start_time</c> gauge, in seconds since the Unix epoch. Created once per process, so that
    /// every meter provider in it, as in tests with several hosts, sees the same gauge.
    /// </summary>
    internal static ObservableGauge<double> StartTime { get; } =
        _workloadMeter.CreateObservableGauge(
            StartTimeMetricName,
            static () => _startTime,
            unit: "s",
            description: "Process start time in seconds since the Unix epoch."
        );

    /// <summary>
    /// Builds the resource from the libraries' defaults, then lets <c>OTEL_SERVICE_NAME</c> and
    /// <c>OTEL_RESOURCE_ATTRIBUTES</c> override them, so that the runtime's <c>k8s.pod.uid</c> and anything else it
    /// sets reach the collectors.
    /// </summary>
    /// <param name="resource">The SDK's resource builder.</param>
    /// <param name="serviceOwner">The app's org, such as <c>ttd</c>.</param>
    /// <param name="app">The app's name without the org.</param>
    /// <param name="appVersion">The app's version from the runtime, if any.</param>
    internal static ResourceBuilder Configure(
        ResourceBuilder resource,
        string serviceOwner,
        string app,
        string? appVersion
    )
    {
        // service.name is the app's name without the org, as v8's Application Insights role name was, so that
        // cloud_RoleName and every query on it stay the same. No service.namespace: Application Insights would then
        // name the role "<namespace>.<name>".
        return resource
            .AddService(
                serviceName: app,
                serviceVersion: string.IsNullOrWhiteSpace(appVersion) ? LocalServiceVersion : appVersion,
                autoGenerateServiceInstanceId: false,
                serviceInstanceId: InstanceId
            )
            .AddAttributes([
                new(Core.Features.Telemetry.InternalLabels.ServiceOwner, serviceOwner),
                new(Core.Features.Telemetry.InternalLabels.App, app),
                new(Core.Features.Telemetry.InternalLabels.AppLibVersion, LibraryVersion),
            ])
            // Detected again after the defaults above, so that the deployment's values win.
            .AddEnvironmentVariableDetector();
    }

    private static string ResolveLibraryVersion()
    {
        Assembly assembly = typeof(Core.Features.Telemetry).Assembly;
        string? version = assembly.GetCustomAttribute<AssemblyInformationalVersionAttribute>()?.InformationalVersion;
        if (string.IsNullOrWhiteSpace(version))
        {
            version = assembly.GetName().Version?.ToString(3);
        }

        if (string.IsNullOrWhiteSpace(version))
        {
            return "unknown";
        }

        // The commit after '+' would give every build its own value.
        int metadata = version.IndexOf('+', StringComparison.Ordinal);
        return metadata < 0 ? version : version[..metadata];
    }

    private static double ResolveProcessStartTime()
    {
        using var process = Process.GetCurrentProcess();
        return new DateTimeOffset(process.StartTime.ToUniversalTime()).ToUnixTimeMilliseconds() / 1000d;
    }
}
