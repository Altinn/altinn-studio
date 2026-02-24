using Altinn.Studio.Gateway.Api.Authentication;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Clients.Designer;

internal static class DesignerClientRegistration
{
    public static IServiceCollection AddDesignerClients(this IServiceCollection services, IConfiguration configuration)
    {
        services.AddOptions<StudioEnvironments>().Bind(configuration.GetSection(nameof(StudioEnvironments)));
        var environments = configuration.GetSection(nameof(StudioEnvironments)).Get<StudioEnvironments>() ?? [];

        foreach (var name in environments.Keys)
        {
            services
                .AddHttpClient(
                    name,
                    (serviceProvider, client) =>
                    {
                        var settings = serviceProvider.GetRequiredService<IOptionsMonitor<StudioEnvironments>>();
                        if (!settings.CurrentValue.TryGetValue(name, out var config))
                            throw new InvalidOperationException(
                                $"Studio environment '{name}' is missing from configuration."
                            );
                        if (!Uri.TryCreate(config.Url, UriKind.Absolute, out var baseAddress))
                            throw new InvalidOperationException(
                                $"Studio environment '{name}' has invalid Url: '{config.Url}'."
                            );
                        client.BaseAddress = baseAddress;
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
