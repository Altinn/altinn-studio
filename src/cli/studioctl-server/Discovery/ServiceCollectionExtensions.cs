using Altinn.Studio.StudioctlServer.Discovery.Container;
using Altinn.Studio.StudioctlServer.Discovery.Process;
using Altinn.Studio.StudioctlServer.Platform;
using Altinn.Studio.StudioctlServer.Platform.PortListeners;

namespace Altinn.Studio.StudioctlServer.Discovery;

internal static class ServiceCollectionExtensions
{
    public static IServiceCollection AddDiscoveryServices(
        this IServiceCollection services,
        IConfiguration configuration
    )
    {
        services.AddHttpClient(
            AppMetadataProbe.HttpClientName,
            static client =>
            {
                client.Timeout = TimeSpan.FromSeconds(1);
                client.DefaultRequestHeaders.UserAgent.ParseAdd(StudioctlUserAgent.Value);
            }
        );
        services.AddHttpClient(
            LocaltestStorageProbe.HttpClientName,
            static client =>
            {
                client.Timeout = TimeSpan.FromSeconds(2);
                client.DefaultRequestHeaders.UserAgent.ParseAdd(StudioctlUserAgent.Value);
            }
        );
        services.AddSingleton<IPortListenerSource, LinuxPortListeners>();
        services.AddSingleton<IPortListenerSource, MacPortListeners>();
        services.AddSingleton<IPortListenerSource, WindowsPortListeners>();
        services.AddSingleton<PortListeners>();
        services.AddSingleton<AppMetadataProbe>();
        services.AddSingleton<LocaltestStorageProbe>();
        services.AddSingleton<IAppDiscovery, ProcessDiscovery>();
        services.AddSingleton<IAppDiscovery, ContainerDiscovery>();
        services.AddSingleton<AppRegistry>();
        services.AddHostedService(static sp => sp.GetRequiredService<AppRegistry>());
        return services;
    }
}
