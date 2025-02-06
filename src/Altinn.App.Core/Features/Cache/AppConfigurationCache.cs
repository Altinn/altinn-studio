using Altinn.App.Core.Configuration;
using Altinn.App.Core.Internal.App;
using Altinn.App.Core.Models;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Altinn.App.Core.Features.Cache;

internal sealed class AppConfigurationCache(
    ILogger<AppConfigurationCache> logger,
    IServiceProvider serviceProvider,
    IOptions<GeneralSettings> generalSettings
) : BackgroundService, IAppConfigurationCache
{
    private readonly ILogger<AppConfigurationCache> _logger = logger;
    private readonly IServiceProvider _serviceProvider = serviceProvider;
    private readonly IOptions<GeneralSettings> _generalSettings = generalSettings;

    private ApplicationMetadata? _appMetadata;

    public ApplicationMetadata ApplicationMetadata =>
        _appMetadata ?? throw new InvalidOperationException("Cache not initialized");

    private readonly TaskCompletionSource _firstTick = new(TaskCreationOptions.RunContinuationsAsynchronously);

    public override async Task StartAsync(CancellationToken cancellationToken)
    {
        await base.StartAsync(cancellationToken);
        if (_generalSettings.Value.DisableAppConfigurationCache)
            return;
        await _firstTick.Task;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        if (_generalSettings.Value.DisableAppConfigurationCache)
            return;
        try
        {
            var env = _serviceProvider.GetRequiredService<IHostEnvironment>();
            if (env.IsDevelopment())
            {
                // local dev, config can change
                {
                    await using var scope = await Scope.Create(_serviceProvider);
                    await UpdateCache(this, scope, stoppingToken);
                }

                using var timer = new PeriodicTimer(TimeSpan.FromSeconds(5));

                while (await timer.WaitForNextTickAsync(stoppingToken))
                {
                    await using var scope = await Scope.Create(_serviceProvider);
                    await UpdateCache(this, scope, stoppingToken);
                }
            }
            else if (env.IsStaging())
            {
                // tt02 (container deployment, immutable infra)
                await using var scope = await Scope.Create(_serviceProvider);
                await UpdateCache(this, scope, stoppingToken);
            }
            else if (env.IsProduction())
            {
                // prod (container deployment, immutable infra)
                await using var scope = await Scope.Create(_serviceProvider);
                await UpdateCache(this, scope, stoppingToken);
            }
        }
        catch (OperationCanceledException)
        {
            _firstTick.TrySetCanceled(stoppingToken);
        }
        catch (Exception ex)
        {
            _firstTick.TrySetException(ex);
            _logger.LogError(ex, "Error starting AppConfigurationCache");
        }

        static async ValueTask UpdateCache(AppConfigurationCache self, Scope scope, CancellationToken cancellationToken)
        {
            self._appMetadata = await scope.AppMetadata.GetApplicationMetadata();

            self._firstTick.TrySetResult();
        }
    }

    private readonly record struct Scope(AsyncServiceScope Value, IAppMetadata AppMetadata) : IAsyncDisposable
    {
        public static async ValueTask<Scope> Create(IServiceProvider serviceProvider)
        {
            var scope = serviceProvider.CreateAsyncScope();
            try
            {
                var appMetadata = serviceProvider.GetRequiredService<IAppMetadata>();
                return new Scope(scope, appMetadata);
            }
            catch
            {
                await scope.DisposeAsync();
                throw;
            }
        }

        public ValueTask DisposeAsync() => Value.DisposeAsync();
    }
}
