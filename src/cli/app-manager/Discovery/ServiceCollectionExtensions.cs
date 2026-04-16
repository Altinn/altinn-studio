using Altinn.Studio.AppManager.Discovery.Container;
using Altinn.Studio.AppManager.Discovery.Process;
using Altinn.Studio.AppManager.Platform.PortListeners;

namespace Altinn.Studio.AppManager.Discovery;

internal static class ServiceCollectionExtensions
{
    public static IServiceCollection AddDiscoveryServices(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        services.AddHttpClient();
        services.AddSingleton<IPortListenerSource, LinuxPortListeners>();
        services.AddSingleton<IPortListenerSource, MacPortListeners>();
        services.AddSingleton<IPortListenerSource, WindowsPortListeners>();
        services.AddSingleton<PortListeners>();
        services.AddSingleton<AppMetadataProbe>();
        services.AddSingleton<IAppDiscovery, ProcessDiscovery>();
        services.AddSingleton<IAppDiscovery, ContainerDiscovery>();
        services.AddSingleton<AppRegistry>();
        services.AddHostedService(static sp => sp.GetRequiredService<AppRegistry>());
        return services;
    }
}
