using k8s;

namespace StudioGateway.Api.GatewayK8s;

internal static class KubernetesServiceRegistration
{
    public static IServiceCollection AddKubernetesServices(this IServiceCollection services)
    {
        services.AddSingleton<IKubernetes>(_ =>
        {
            var config = KubernetesClientConfiguration.InClusterConfig();
            return new k8s.Kubernetes(config);
        });

        services.AddSingleton<IHelmReleaseService, HelmReleaseService>();

        return services;
    }
}
