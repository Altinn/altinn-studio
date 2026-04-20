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
                if (int.TryParse(configuration["Tunnel:ConnectTimeoutSeconds"], out var timeoutSeconds))
                {
                    options.ConnectTimeout = TimeSpan.FromSeconds(Math.Max(1, timeoutSeconds));
                }
            });
        services.AddSingleton(sp => sp.GetRequiredService<IOptions<TunnelOptions>>().Value);
        services.AddSingleton<TunnelState>();
        services.AddSingleton<LoadBalancer>();
        services.AddHostedService<TunnelWorker>();
        return services;
    }
}
