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
        if (maskinportenClientForRuntime?.Count is null)
        {
            throw new System.Exception("Configuration for MaskinportenClientForRuntime is missing");
        }
        if (maskinportenClientForRuntime.Count is not 1)
        {
            throw new System.Exception("Configuration for MaskinportenClientForRuntime must contain exactly one client definition");
        }

        var kvp = maskinportenClientForRuntime.Single();
        services.AddMaskinportenHttpClient<SettingsJwkClientDefinition>("runtime-gateway", kvp.Value)
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

        services.AddTransient<IRuntimeGatewayClient, RuntimeGatewayClient>();
    }
}
