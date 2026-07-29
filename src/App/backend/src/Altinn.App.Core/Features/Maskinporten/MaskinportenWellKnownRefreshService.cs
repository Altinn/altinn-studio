using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;

namespace Altinn.App.Core.Features.Maskinporten;

/// <summary>
/// <para>Resolves the well-known OAuth metadata (issuer) for both <see cref="MaskinportenClient"/> variants at
/// startup — so real traffic rarely pays the cold fetch — and re-resolves it every
/// <see cref="WellKnownRefreshInterval"/>. Apps can run for years between deploys; the periodic refresh insures
/// against the upstream issuer changing under an unchanged Authority (the scenario well-known discovery exists
/// for — <c>ConfigurationManager&lt;T&gt;</c>'s automatic refresh interval is the precedent). The request path
/// itself never refreshes: see <see cref="MaskinportenClient.GetAudienceFromWellKnown"/>.</para>
/// <para>This service must never fail or delay host startup, and must never fault: everything — including
/// unexpected errors outside the per-variant refresh, such as a broken DI graph — is caught and logged at
/// Debug only, because the framework default <c>BackgroundServiceExceptionBehavior.StopHost</c> would
/// otherwise stop the whole application. Apps without Maskinporten configuration throw
/// <see cref="Microsoft.Extensions.Options.OptionsValidationException"/> from the settings read inside
/// <see cref="MaskinportenClient.RefreshWellKnownIssuer"/> and are thereby skipped silently (per iteration).
/// A failed refresh keeps the last-known-good issuer and never stamps the client's fail-fast window — so a
/// failed initial warm-up means the first real request performs its own blocking fetch (with its own Error
/// logging) instead of being fast-failed onto the fallback.</para>
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
            // Cancellation lands here on host shutdown — nothing to do. Anything else (e.g. a broken DI
            // graph from the service resolution in RefreshAll) must also never fault this BackgroundService:
            // the framework default BackgroundServiceExceptionBehavior.StopHost would stop the whole
            // application over a background nicety.
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
            // Belt-and-braces on shutdown: WaitForNextTickAsync(stoppingToken) is the loop's primary exit;
            // rethrowing here just ends the round early instead of logging shutdown as a refresh failure.
            throw;
        }
        catch (Exception ex)
        {
            // Unconfigured variants land here every iteration (OptionsValidationException from the settings
            // read, before any fetch or failure-window stamping), as do network failures. Last-known-good is
            // kept; the on-demand path logs an Error when a real caller is affected.
            _logger.LogDebug(ex, "Maskinporten well-known refresh failed for variant '{Variant}'", client.Variant);
        }
    }
}
