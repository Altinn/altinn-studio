using StudioGateway.Api.Authentication;
using StudioGateway.Api.Clients.StudioClient;

namespace StudioGateway.Api.Clients.Designer;

internal static class DesignerClientRegistration
{
    public static IServiceCollection AddDesignerClients(this IServiceCollection services, IConfiguration configuration)
    {
        var environments = configuration.GetSection(nameof(StudioEnvironments)).Get<StudioEnvironments>() ?? [];

        foreach (var (name, config) in environments)
        {
            services
                .AddHttpClient(
                    name,
                    client =>
                    {
                        client.BaseAddress = new Uri(config.Url);
                    }
                )
                .UseMaskinportenAuth()
                .AddStandardResilienceHandler(options =>
                {
                    options.Retry.MaxRetryAttempts = 3;
                    options.Retry.UseJitter = true;
                    options.Retry.ShouldHandle = args =>
                        ValueTask.FromResult(
                            args.Outcome switch
                            {
                                { Exception: not null } => true,
                                { Result.IsSuccessStatusCode: false } => true,
                                _ => false,
                            }
                        );
                });
        }

        services.AddScoped<DesignerClient>();

        return services;
    }
}
