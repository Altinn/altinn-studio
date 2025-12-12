#nullable disable
using Altinn.ApiClients.Maskinporten.Config;
using Altinn.ApiClients.Maskinporten.Extensions;
using Altinn.ApiClients.Maskinporten.Services;
using Altinn.Studio.Designer.Configuration;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

namespace Altinn.Studio.Designer.TypedHttpClients.RuntimeGateway;

public static class ServiceCollectionExtensions
{
    internal static void AddRuntimeGatewayHttpClient(this IServiceCollection services, IConfiguration config)
    {
        MaskinportenClientForRuntime maskinportenClientForRuntime = config.GetSection(nameof(MaskinportenClientForRuntime)).Get<MaskinportenClientForRuntime>();

        foreach ((string name, MaskinportenSettings maskinportenSettings) in maskinportenClientForRuntime)
        {
            services.AddMaskinportenHttpClient<SettingsJwkClientDefinition>($"runtime-gateway-{name}", maskinportenSettings);
        }

        services.AddTransient<IRuntimeGatewayClient, RuntimeGatewayClient>();
    }
}
