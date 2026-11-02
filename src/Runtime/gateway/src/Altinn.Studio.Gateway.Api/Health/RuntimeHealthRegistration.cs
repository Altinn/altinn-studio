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
    /// Runs the runtime checks in the background with ASP.NET Core's health check publisher, and keeps their latest
    /// result in <see cref="RuntimeHealthReport"/>. The kubelet's probes don't run them: an unavailable dependency
    /// must not take the gateway out of rotation.
    /// </summary>
    public static IServiceCollection AddRuntimeHealth(this IServiceCollection services, IConfiguration configuration)
    {
        var section = configuration.GetSection(RuntimeHealthSettings.SectionName);
        services
            .AddOptions<RuntimeHealthSettings>()
            .Bind(section)
            .Validate(settings => settings.Pdf3Url.IsAbsoluteUri, "RuntimeHealth.Pdf3Url must be an absolute URI.")
            .Validate(
                settings => settings.Period >= TimeSpan.FromSeconds(1) && settings.Timeout > TimeSpan.Zero,
                "RuntimeHealth.Period must be at least a second, and RuntimeHealth.Timeout positive."
            )
            .ValidateOnStart();

        services
            .AddOptions<HealthCheckPublisherOptions>()
            .Configure<IOptions<RuntimeHealthSettings>>(
                (options, settings) =>
                {
                    options.Delay = TimeSpan.FromSeconds(1);
                    options.Period = settings.Value.Period;
                    options.Timeout = settings.Value.Timeout;
                    options.Predicate = registration => registration.Tags.Contains(RuntimeTag);
                }
            );

        services.AddSingleton<RuntimeHealthReport>();
        services.AddSingleton<IHealthCheckPublisher>(sp => sp.GetRequiredService<RuntimeHealthReport>());

        var healthChecks = services
            .AddHealthChecks()
            .AddCheck<RuntimeHealthWarmupCheck>(RuntimeHealthWarmupCheck.Name, tags: [ReadyTag]);

        if (section.GetValue(nameof(RuntimeHealthSettings.CheckPdf3), defaultValue: true))
        {
            services.AddHttpClient(
                Pdf3HealthCheck.HttpClientName,
                (sp, client) =>
                    client.Timeout = sp.GetRequiredService<
                        IOptionsMonitor<RuntimeHealthSettings>
                    >().CurrentValue.Timeout
            );
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
