using Altinn.Studio.Gateway.Api.Authentication;

namespace Altinn.Studio.Gateway.Api.Clients.Designer;

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
                                { Result.StatusCode: >= System.Net.HttpStatusCode.InternalServerError } => true,
                                _ => false,
                            }
                        );
                });
        }

        services.AddSingleton<DesignerClient>();

        return services;
    }
}
