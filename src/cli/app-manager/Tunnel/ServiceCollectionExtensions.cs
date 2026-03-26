namespace Altinn.Studio.AppManager.Tunnel;

internal static class ServiceCollectionExtensions
{
    public static IServiceCollection AddTunnelServices(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddHttpClient();
        services
            .AddOptions<TunnelOptions>()
            .Configure(options =>
            {
                options.Url = configuration["Tunnel:Url"];
                options.UpstreamUrl = configuration["Tunnel:UpstreamUrl"] ?? options.UpstreamUrl;
            });
        services.AddHostedService<TunnelWorker>();
        return services;
    }
}
