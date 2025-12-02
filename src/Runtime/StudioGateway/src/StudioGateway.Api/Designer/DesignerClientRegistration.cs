namespace StudioGateway.Api.Designer;

internal static class DesignerClientRegistration
{
    public static IServiceCollection AddDesignerClients(this IServiceCollection services, IConfiguration configuration)
    {
        var environments = configuration.GetSection(nameof(StudioEnvironments)).Get<StudioEnvironments>() ?? [];

        foreach (var (name, config) in environments)
        {
            services.AddHttpClient(
                name,
                client =>
                {
                    client.BaseAddress = new Uri(config.Url);
                }
            );
        }

        return services;
    }
}
