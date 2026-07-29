using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Maskinporten;

/// <summary>
/// <para>Resolves the well-known OAuth metadata (issuer) for both <see cref="MaskinportenClient"/> variants
/// at startup and re-resolves it every <see cref="WellKnownRefreshInterval"/>, guarding against the upstream
/// issuer changing during a long process lifetime. The request path itself never refreshes:
/// see <see cref="MaskinportenClient.GetAudienceFromWellKnown"/>.</para>
/// <para>Must never fault or delay the host — everything is caught and logged at Debug only. Apps without
/// Maskinporten configuration are skipped each iteration (<c>OptionsValidationException</c> from the settings
/// read). A failed refresh keeps the last-known-good issuer and never stamps the client's fail-fast window.</para>
/// </summary>
internal sealed class MaskinportenWellKnownRefreshService : BackgroundService
{
    /// <summary>
    /// How often the well-known issuer is re-resolved in the background.
    /// </summary>
    internal static readonly TimeSpan WellKnownRefreshInterval = TimeSpan.FromHours(12);

    private readonly IServiceProvider _serviceProvider;
    private readonly ILogger<MaskinportenWellKnownRefreshService> _logger;
    private readonly TimeProvider _timeProvider;

    public MaskinportenWellKnownRefreshService(
        IServiceProvider serviceProvider,
        ILogger<MaskinportenWellKnownRefreshService> logger,
        TimeProvider? timeProvider = null
    )
    {
        _serviceProvider = serviceProvider;
        _logger = logger;
        _timeProvider = timeProvider ?? TimeProvider.System;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        try
        {
            using var timer = new PeriodicTimer(WellKnownRefreshInterval, _timeProvider);
            do
            {
                await RefreshAll(stoppingToken);
            } while (await timer.WaitForNextTickAsync(stoppingToken));
        }
        catch (Exception ex)
        {
            // Must never fault: BackgroundServiceExceptionBehavior.StopHost (the framework default)
            // would stop the whole application. Cancellation lands here on shutdown — nothing to do.
            if (ex is not OperationCanceledException)
                _logger.LogDebug(ex, "Maskinporten well-known refresh loop ended unexpectedly");
        }
    }

    private async Task RefreshAll(CancellationToken stoppingToken)
    {
        await Refresh(_serviceProvider.GetService<IMaskinportenClient>(), stoppingToken);
        await Refresh(
            _serviceProvider.GetKeyedService<IMaskinportenClient>(MaskinportenClient.VariantInternal),
            stoppingToken
        );
    }

    private async Task Refresh(IMaskinportenClient? service, CancellationToken stoppingToken)
    {
        if (service is not MaskinportenClient client)
            return;

        try
        {
            await client.RefreshWellKnownIssuer(stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Shutdown ends the round instead of being logged as a refresh failure.
            throw;
        }
        catch (Exception ex)
        {
            // Unconfigured variants and network failures. The on-demand path logs an Error
            // when a real caller is affected.
            _logger.LogDebug(ex, "Maskinporten well-known refresh failed for variant '{Variant}'", client.Variant);
        }
    }
}
