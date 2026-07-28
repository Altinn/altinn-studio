using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Maskinporten;

/// <summary>
/// <para>Warms up the well-known OAuth metadata (issuer) for both <see cref="MaskinportenClient"/> variants at
/// startup, so real traffic rarely pays the cold fetch. The issuer is cached for the process lifetime — see
/// <see cref="MaskinportenClient.GetAudienceFromWellKnown"/>.</para>
/// <para>This service must never fail or delay host startup: apps without Maskinporten configuration are
/// skipped silently, and network failures are logged at Debug only — the on-demand path already logs an
/// Error when a real caller hits it. A network failure here does stamp the retry window (an outage is an
/// outage), which self-heals after <see cref="MaskinportenClient.WellKnownRetryInterval"/>.</para>
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
            // Accessing Settings throws OptionsValidationException when Maskinporten is not
            // configured for this variant — in that case there is nothing to warm up.
            _ = client.Settings;
        }
        catch (OptionsValidationException)
        {
            _logger.LogDebug(
                "Maskinporten is not configured for variant '{Variant}', skipping well-known warm-up",
                client.Variant
            );
            return;
        }

        try
        {
            await client.GetAudienceFromWellKnown(stoppingToken);
        }
        catch (Exception ex)
        {
            _logger.LogDebug(ex, "Maskinporten well-known warm-up failed for variant '{Variant}'", client.Variant);
        }
    }
}
