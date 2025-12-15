using System.Linq;
using System.Threading.Tasks;
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
        var maskinportenClientForRuntime = config.GetSection(nameof(MaskinportenClientForRuntime)).Get<MaskinportenClientForRuntime>();

        var settings = maskinportenClientForRuntime?.SingleOrDefault().Value;
        if (settings is not null)
        {
            services.AddMaskinportenHttpClient<SettingsJwkClientDefinition>("runtime-gateway", settings)
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
