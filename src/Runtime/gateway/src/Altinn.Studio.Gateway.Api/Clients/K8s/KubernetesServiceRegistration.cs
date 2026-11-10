using k8s;

namespace Altinn.Studio.Gateway.Api.Clients.K8s;

internal static class KubernetesServiceRegistration
{
    public static IServiceCollection AddKubernetesServices(this IServiceCollection services)
    {
        services.AddSingleton<IKubernetes>(_ => KubernetesClientFactory.CreateInCluster());

        services.AddSingleton<HelmReleaseClient>();
        services.AddSingleton<DeploymentsClient>();
        services.AddSingleton<PodsClient>();
        services.AddSingleton<OciRepositoryClient>();
        services.AddSingleton<KustomizationClient>();
        services.AddSingleton<AppsConfigClient>();

        return services;
    }
}
