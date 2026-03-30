using System.Net;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.AppManager.Tunnel;

internal static class TunnelHttpClient
{
    public const string Name = "AppTunnelProxy";
}

internal static class ServiceCollectionExtensions
{
    public static IServiceCollection AddTunnelServices(this IServiceCollection services, IConfiguration configuration)
    {
        services
            .AddHttpClient(TunnelHttpClient.Name)
            .ConfigurePrimaryHttpMessageHandler(static () =>
                new SocketsHttpHandler
                {
                    UseProxy = false,
                    AllowAutoRedirect = false,
                    AutomaticDecompression = DecompressionMethods.None,
                    UseCookies = false,
                    EnableMultipleHttp2Connections = true,
                    ConnectTimeout = TimeSpan.FromSeconds(5),
                }
            );
        services
            .AddOptions<TunnelOptions>()
            .Configure(options =>
            {
                options.Url = configuration["Tunnel:Url"];
                options.UpstreamUrl = configuration["Tunnel:UpstreamUrl"] ?? options.UpstreamUrl;
            });
        services.AddSingleton(sp => sp.GetRequiredService<IOptions<TunnelOptions>>().Value);
        services.AddSingleton<TunnelState>();
        services.AddHostedService<TunnelWorker>();
        return services;
    }
}
