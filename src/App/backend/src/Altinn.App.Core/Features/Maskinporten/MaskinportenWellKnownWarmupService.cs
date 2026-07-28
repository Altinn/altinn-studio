using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Maskinporten;

/// <summary>
/// <para>Warms up the well-known OAuth metadata (issuer) for both <see cref="MaskinportenClient"/> variants at
/// startup, so real traffic rarely pays the cold fetch. The issuer is cached for the process lifetime — see
/// <see cref="MaskinportenClient.GetAudienceFromWellKnown"/>.</para>
/// <para>This service must never fail or delay host startup: everything is caught and logged at Debug only.
/// Apps without Maskinporten configuration throw <see cref="Microsoft.Extensions.Options.OptionsValidationException"/>
/// from the settings read inside the fetch path (before any failure-window stamping) and are thereby skipped
/// silently. Network failures also log at Debug only — the on-demand path already logs an Error when a real
/// caller hits it — but do stamp the retry window (an outage is an outage), which self-heals after
/// <see cref="MaskinportenClient.WellKnownRetryInterval"/>.</para>
/// </summary>
internal sealed class MaskinportenWellKnownWarmupService : BackgroundService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<MaskinportenWellKnownWarmupService> _logger;

    public MaskinportenWellKnownWarmupService(
        IServiceProvider serviceProvider,
        ILogger<MaskinportenWellKnownWarmupService> logger
    )
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            await WarmUp(_serviceProvider.GetService<IMaskinportenClient>(), stoppingToken);
            await WarmUp(
                _serviceProvider.GetKeyedService<IMaskinportenClient>(MaskinportenClient.VariantInternal),
                stoppingToken
            );
        }
        catch (Exception ex)
        {
            // Startup must never be disturbed by warm-up — the on-demand path handles everything on its own.
            _logger.LogDebug(ex, "Maskinporten well-known warm-up failed");
        }
    }

    private async Task WarmUp(IMaskinportenClient? service, CancellationToken stoppingToken)
    {
        if (service is not MaskinportenClient client)
            return;

        try
        {
            await client.GetAudienceFromWellKnown(stoppingToken);
        }
        catch (Exception ex)
        {
            // Unconfigured variants land here too (OptionsValidationException from the settings read,
            // thrown before any fetch or failure-window stamping) — nothing to warm up in that case.
            _logger.LogDebug(ex, "Maskinporten well-known warm-up failed for variant '{Variant}'", client.Variant);
        }
    }
}
