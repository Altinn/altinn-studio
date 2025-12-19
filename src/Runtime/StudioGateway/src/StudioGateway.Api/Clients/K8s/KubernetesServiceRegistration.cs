using k8s;

namespace StudioGateway.Api.Clients.K8s;

internal static class KubernetesServiceRegistration
{
    public static IServiceCollection AddKubernetesServices(this IServiceCollection services)
    {
        services.AddSingleton<IKubernetes>(_ =>
        {
            var config = KubernetesClientConfiguration.InClusterConfig();
            return new Kubernetes(config);
        });

        services.AddSingleton<HelmReleaseClient>();
        services.AddScoped<PodsClient>();

        return services;
    }
}
