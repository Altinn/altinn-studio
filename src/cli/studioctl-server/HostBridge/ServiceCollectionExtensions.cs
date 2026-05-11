using Microsoft.Extensions.Options;

namespace Altinn.Studio.StudioctlServer.HostBridge;

internal static class ServiceCollectionExtensions
{
    public static IServiceCollection AddHostBridgeServices(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        services
            .AddOptions<HostBridgeOptions>()
            .Configure(options =>
            {
                options.Url = configuration["HostBridge:Url"];
                var connectTimeoutSeconds = configuration["HostBridge:ConnectTimeoutSeconds"];
                if (int.TryParse(connectTimeoutSeconds, out var timeoutSeconds))
                {
                    options.ConnectTimeout = TimeSpan.FromSeconds(Math.Max(1, timeoutSeconds));
                }
            });
        services.AddSingleton(sp => sp.GetRequiredService<IOptions<HostBridgeOptions>>().Value);
        services.AddSingleton<HostBridgeState>();
        services.AddHostedService<HostBridgeConnector>();
        return services;
    }
}
