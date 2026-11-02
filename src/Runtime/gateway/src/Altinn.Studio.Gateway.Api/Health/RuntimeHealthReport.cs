using Altinn.Studio.Gateway.Api.Settings;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Health;

/// <summary>
/// Keeps the latest result of the runtime checks, which the health check publisher runs in the background. The
/// public health endpoint answers from it, so a probe doesn't run the checks and can't put load on the cluster.
/// </summary>
internal sealed class RuntimeHealthReport(TimeProvider timeProvider, IOptionsMonitor<RuntimeHealthSettings> settings)
    : IHealthCheckPublisher
{
    /// <summary>
    /// How many periods the latest report may be old before the checks count as stopped.
    /// </summary>
    private const int MaxAgeInPeriods = 3;

    private Snapshot? _latest;

    /// <summary>
    /// Whether the checks have run at least once.
    /// </summary>
    public bool HasRun => Volatile.Read(ref _latest) is not null;

    public Task PublishAsync(HealthReport report, CancellationToken cancellationToken)
    {
        Volatile.Write(ref _latest, new Snapshot(report, timeProvider.GetUtcNow()));
        return Task.CompletedTask;
    }

    /// <summary>
    /// The latest report, or an unhealthy one without entries when the checks haven't run yet or have stopped
    /// running.
    /// </summary>
    public HealthReport Current
    {
        get
        {
            var latest = Volatile.Read(ref _latest);
            if (latest is null)
            {
                return Unhealthy;
            }

            var maxAge = settings.CurrentValue.Period * MaxAgeInPeriods;
            return timeProvider.GetUtcNow() - latest.PublishedAt > maxAge ? Unhealthy : latest.Report;
        }
    }

    private static HealthReport Unhealthy =>
        new(new Dictionary<string, HealthReportEntry>(), HealthStatus.Unhealthy, TimeSpan.Zero);

    private sealed record Snapshot(HealthReport Report, DateTimeOffset PublishedAt);
}
