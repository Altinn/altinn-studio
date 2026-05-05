using Altinn.Studio.EnvTopology;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.AppManager.Tunnel;

internal static class ServiceCollectionExtensions
{
    public static IServiceCollection AddTunnelServices(this IServiceCollection services, IConfiguration configuration)
    {
        services
            .AddOptions<TunnelOptions>()
            .Configure(options =>
            {
                options.Url = configuration["Tunnel:Url"];
                if (int.TryParse(configuration["Tunnel:ConnectTimeoutSeconds"], out var timeoutSeconds))
                {
                    options.ConnectTimeout = TimeSpan.FromSeconds(Math.Max(1, timeoutSeconds));
                }
            });
        services.AddSingleton(sp => sp.GetRequiredService<IOptions<TunnelOptions>>().Value);
        services.AddBoundTopology(configuration, optionalBoundConfig: true);
        services.AddSingleton<TunnelState>();
        services.AddSingleton<BoundTopologyConfigReconciler>();
        services.AddHostedService(static sp => sp.GetRequiredService<BoundTopologyConfigReconciler>());
        services.AddHostedService<TunnelWorker>();
        return services;
    }
}
