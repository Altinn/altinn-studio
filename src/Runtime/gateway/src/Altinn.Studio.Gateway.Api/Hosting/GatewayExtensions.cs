using Altinn.Studio.Gateway.Api.Authentication;
using Altinn.Studio.Gateway.Api.Clients.AlertsClient;
using Altinn.Studio.Gateway.Api.Clients.Designer;
using Altinn.Studio.Gateway.Api.Clients.K8s;
using Altinn.Studio.Gateway.Api.Clients.MetricsClient;
using Altinn.Studio.Gateway.Api.Endpoints.Internal;
using Altinn.Studio.Gateway.Api.Endpoints.Local;
using Altinn.Studio.Gateway.Api.Endpoints.Public;
using Altinn.Studio.Gateway.Api.Settings;
using Azure.Core;
using Azure.Identity;
using Azure.Monitor.Query.Logs;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;

namespace Altinn.Studio.Gateway.Api.Hosting;

internal static class GatewayExtensions
{
    public static WebApplicationBuilder AddGateway(this WebApplicationBuilder builder)
    {
        ArgumentNullException.ThrowIfNull(builder);

        builder.Services.AddSingleton<TokenCredential, DefaultAzureCredential>();
        builder.Services.AddSingleton(sp =>
        {
            var credential = sp.GetRequiredService<TokenCredential>();
            return new LogsQueryClient(credential);
        });

        builder.Services.AddSingleton(TimeProvider.System);
        if (!builder.Environment.IsDevelopment())
        {
            builder.Configuration.AddJsonFile(
                "/app/secrets/maskinporten-client-for-designer.json",
                optional: true,
                reloadOnChange: true
            );
            builder.Configuration.AddJsonFile("/app/secrets/grafana-token.json", optional: true, reloadOnChange: true);
        }
        var environment = builder.Configuration.GetSection("Gateway").GetValue<string>("Environment") ?? "";
        var hasGrafanaInstance = AltinnEnvironments.IsProd(environment) || AltinnEnvironments.IsTT02(environment);

        builder
            .Services.AddOptions<GrafanaSettings>()
            .Bind(builder.Configuration.GetSection("Grafana"))
            .Validate(
                settings => !hasGrafanaInstance || !string.IsNullOrWhiteSpace(settings.Token),
                "Grafana.Token is required."
            )
            .Validate(settings => !hasGrafanaInstance || settings.Url != null, "Grafana.Url is required.")
            .ValidateOnStart();
        builder
            .Services.AddOptions<AlertsClientSettings>()
            .Bind(builder.Configuration.GetSection("AlertsClientSettings"))
            .ValidateOnStart();

        builder
            .Services.AddOptions<MetricsClientSettings>()
            .Bind(builder.Configuration.GetSection("MetricsClientSettings"))
            .ValidateOnStart();
        builder.Services.Configure<GatewayContext>(builder.Configuration.GetSection("Gateway"));

        // Register class itself as scoped to avoid using IOptions interfaces throughout the codebase
        // Avoided singleton registration to support dynamic reloading of configuration
        builder.Services.TryAddScoped(sp => sp.GetRequiredService<IOptionsSnapshot<GrafanaSettings>>().Value);
        builder.Services.TryAddScoped(sp => sp.GetRequiredService<IOptionsSnapshot<GatewayContext>>().Value);
        builder.Services.TryAddScoped(sp => sp.GetRequiredService<IOptionsSnapshot<AlertsClientSettings>>().Value);
        builder.Services.TryAddScoped(sp => sp.GetRequiredService<IOptionsSnapshot<MetricsClientSettings>>().Value);

        builder.Services.AddKeyedTransient<IAlertsClient>(
            AlertsClientSettings.AlertsClientProvider.Grafana,
            (serviceProvider, key) =>
            {
                var factory = serviceProvider.GetRequiredService<IHttpClientFactory>();
                return new GrafanaClient(
                    factory.CreateClient(AlertsClientSettings.AlertsClientProvider.Grafana.ToString())
                );
            }
        );
        builder.Services.AddTransient<GrafanaAuthenticationHandler>();
        builder
            .Services.AddHttpClient(
                AlertsClientSettings.AlertsClientProvider.Grafana.ToString(),
                (serviceProvider, httpClient) =>
                {
                    var settings = serviceProvider.GetRequiredService<IOptionsMonitor<GrafanaSettings>>().CurrentValue;
                    httpClient.BaseAddress = settings.Url;
                }
            )
            .AddHttpMessageHandler<GrafanaAuthenticationHandler>();
        builder.Services.AddKeyedTransient<IMetricsClient, AzureMonitorClient>(
            MetricsClientSettings.MetricsClientProvider.AzureMonitor
        );
        builder.Services.AddDesignerClients(builder.Configuration);
        builder.Services.AddKubernetesServices();

        return builder;
    }

    public static WebApplication UseGateway(this WebApplication app)
    {
        ArgumentNullException.ThrowIfNull(app);

        app.AddPublicApis();
        app.AddInternalApis();
        app.AddLocalApis();

        return app;
    }
}
