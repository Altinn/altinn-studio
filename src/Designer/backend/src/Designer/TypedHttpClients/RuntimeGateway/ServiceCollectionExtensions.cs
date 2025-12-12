#nullable disable
using System.Threading.Tasks;
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
            services.AddMaskinportenHttpClient<SettingsJwkClientDefinition>($"runtime-gateway-{name}", maskinportenSettings)
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

        services.AddTransient<IRuntimeGatewayClient, RuntimeGatewayClient>();
    }
}
