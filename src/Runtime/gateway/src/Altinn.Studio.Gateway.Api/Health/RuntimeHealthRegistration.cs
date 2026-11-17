using Altinn.Studio.Gateway.Api.Settings;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Health;

internal static class RuntimeHealthRegistration
{
    /// <summary>
    /// Tags the checks that the public health endpoint reports.
    /// </summary>
    public const string RuntimeTag = "runtime";

    /// <summary>
    /// Tags the checks that the kubelet's readiness probe runs.
    /// </summary>
    public const string ReadyTag = "ready";

    /// <summary>
    /// How much longer than one check a run of all of them may take. The checks run in parallel, and each one that
    /// takes too long must end as an unhealthy entry before the run is cancelled, or the run publishes nothing.
    /// </summary>
    private static readonly TimeSpan _runTimeoutMargin = TimeSpan.FromSeconds(5);

    /// <summary>
    /// Runs the runtime checks in the background with ASP.NET Core's health check publisher, and keeps their latest
    /// result in <see cref="RuntimeHealthReport"/>. The kubelet's probes don't run them: an unavailable dependency
    /// must not take the gateway out of rotation. The settings are read once, at startup, since the publisher's
    /// schedule doesn't change after it.
    /// </summary>
    public static IServiceCollection AddRuntimeHealth(this IServiceCollection services, IConfiguration configuration)
    {
        var section = configuration.GetSection(RuntimeHealthSettings.SectionName);
        services
            .AddOptions<RuntimeHealthSettings>()
            .Bind(section)
            .Validate(settings => settings.Timeout > TimeSpan.Zero, "RuntimeHealth.Timeout must be positive.")
            // The publisher starts a run every period, even while the last one runs, and an older run that finishes
            // last would replace a newer result.
            .Validate(
                settings => settings.Period > settings.Timeout + _runTimeoutMargin,
                "RuntimeHealth.Period must be longer than RuntimeHealth.Timeout plus 5 seconds, so runs don't overlap."
            )
            .ValidateOnStart();

        services
            .AddOptions<HealthCheckPublisherOptions>()
            .Configure<IOptions<RuntimeHealthSettings>>(
                (options, settings) =>
                {
                    options.Delay = TimeSpan.FromSeconds(1);
                    options.Period = settings.Value.Period;
                    options.Timeout = settings.Value.Timeout + _runTimeoutMargin;
                    options.Predicate = registration => registration.Tags.Contains(RuntimeTag);
                }
            );

        // A check that times out ends as an unhealthy entry, rather than cancelling the whole run. Post-configured,
        // since checks are registered with Configure, also after this.
        services
            .AddOptions<HealthCheckServiceOptions>()
            .PostConfigure<IOptions<RuntimeHealthSettings>>(
                (options, settings) =>
                {
                    foreach (var registration in options.Registrations.Where(r => r.Tags.Contains(RuntimeTag)))
                    {
                        registration.Timeout = settings.Value.Timeout;
                    }
                }
            );

        services.AddSingleton<RuntimeHealthReport>();
        services.AddSingleton<IHealthCheckPublisher>(sp => sp.GetRequiredService<RuntimeHealthReport>());

        var healthChecks = services
            .AddHealthChecks()
            .AddCheck<RuntimeHealthWarmupCheck>(RuntimeHealthWarmupCheck.Name, tags: [ReadyTag]);

        if (section.GetValue(nameof(RuntimeHealthSettings.CheckPdf3), defaultValue: true))
        {
            services.AddHttpClient(Pdf3HealthCheck.HttpClientName);
            healthChecks.AddCheck<Pdf3HealthCheck>(Pdf3HealthCheck.Name, tags: [RuntimeTag]);
        }

        return services;
    }
}

/// <summary>
/// Keeps a new gateway out of rotation until the runtime checks have run once, so the public health endpoint doesn't
/// answer unhealthy during a rollout.
/// </summary>
internal sealed class RuntimeHealthWarmupCheck(RuntimeHealthReport report) : IHealthCheck
{
    public const string Name = "runtime-health-warmup";

    public Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default
    ) =>
        Task.FromResult(
            report.HasRun
                ? HealthCheckResult.Healthy()
                : HealthCheckResult.Unhealthy("The runtime checks haven't run yet.")
        );
}
