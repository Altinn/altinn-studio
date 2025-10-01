using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Altinn.App.Core.Features.Cache;

internal static class AppConfigurationCacheDI
{
    public static IServiceCollection AddAppConfigurationCache(this IServiceCollection services)
    {
        services.AddSingleton<AppConfigurationCache>();
        services.AddSingleton<IAppConfigurationCache>(sp => sp.GetRequiredService<AppConfigurationCache>());
        services.AddSingleton<IHostedService>(sp => sp.GetRequiredService<AppConfigurationCache>());
        return services;
    }
}
