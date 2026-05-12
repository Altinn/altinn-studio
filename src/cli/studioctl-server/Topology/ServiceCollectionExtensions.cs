using Altinn.Studio.EnvTopology;

namespace Altinn.Studio.StudioctlServer.Topology;

internal static class ServiceCollectionExtensions
{
    public static IServiceCollection AddTopologyServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddBoundTopology(configuration, optionalBoundConfig: true);
        services.AddSingleton<BoundTopologyConfigReconciler>();
        services.AddHostedService(static sp => sp.GetRequiredService<BoundTopologyConfigReconciler>());
        return services;
    }
}
