using System.Linq;
using Altinn.ApiClients.Maskinporten.Extensions;
using Altinn.ApiClients.Maskinporten.Services;
using Altinn.Studio.Designer.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;

namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;

public static class ServiceCollectionExtensions
{
    internal static void AddRuntimeGatewayHttpClient(
        this IServiceCollection services,
        IConfiguration config,
        IHostEnvironment env
    )
    {
        if (env.IsDevelopment())
        {
            // Plain HttpClient for local / mock runtime gateway
            services.AddHttpClient("runtime-gateway").AddStandardResilienceHandler();
        }
        else
        {
            var maskinportenClientForRuntime = config
                .GetSection(nameof(MaskinportenClientForRuntime))
                .Get<MaskinportenClientForRuntime>();

            var settings = maskinportenClientForRuntime?.SingleOrDefault().Value;
            if (settings is not null)
            {
                services
                    .AddMaskinportenHttpClient<SettingsJwkClientDefinition>("runtime-gateway", settings)
                    .AddStandardResilienceHandler();
            }
        }

        services.AddTransient<IRuntimeGatewayClient, RuntimeGatewayClient>();
    }
}
