using System.Net.Http.Headers;
using Azure.Identity;
using Azure.Monitor.Query;
using k8s;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using StudioGateway.Api;
using StudioGateway.Api.Authentication;
using StudioGateway.Api.Clients.Designer;
using StudioGateway.Api.Clients.K8s;
using StudioGateway.Api.Endpoints.Internal;
using StudioGateway.Api.Endpoints.Local;
using StudioGateway.Api.Endpoints.Public;
using StudioGateway.Api.Hosting;
using StudioGateway.Api.Settings;
using StudioGateway.Api.TypedHttpClients.AlertsClient;
using StudioGateway.Api.TypedHttpClients.KubernetesClient;
using StudioGateway.Api.TypedHttpClients.MetricsClient;
using StudioGateway.Api.TypedHttpClients.StudioClient;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<AlertsClientSettings>(builder.Configuration.GetSection("AlertsClientSettings"));
builder.Services.Configure<MetricsClientSettings>(builder.Configuration.GetSection("MetricsClientSettings"));
builder.Services.Configure<GrafanaSettings>(builder.Configuration.GetSection("Grafana"));
builder.Services.Configure<GatewayContext>(builder.Configuration.GetSection("Gateway"));

builder.Services.AddSingleton(new LogsQueryClient(new DefaultAzureCredential()));

builder.Configuration.AddJsonFile(
    "/app/secrets/maskinporten-client-for-designer.json",
    optional: true,
    reloadOnChange: true
);
builder.Configuration.AddJsonFile("/app/secrets/grafana-token.json", optional: true, reloadOnChange: true);

// Register class itself as scoped to avoid using IOptions interfaces throughout the codebase
// Avoided singleton registration to support dynamic reloading of configuration
builder.Services.TryAddScoped(sp => sp.GetRequiredService<IOptionsSnapshot<AlertsClientSettings>>().Value);
builder.Services.TryAddScoped(sp => sp.GetRequiredService<IOptionsSnapshot<MetricsClientSettings>>().Value);
builder.Services.TryAddScoped(sp => sp.GetRequiredService<IOptionsSnapshot<GrafanaSettings>>().Value);
builder.Services.TryAddScoped(sp => sp.GetRequiredService<IOptionsSnapshot<GatewayContext>>().Value);

builder.ConfigureKestrelPorts();
builder.AddHostingConfiguration();
builder.AddMaskinportenAuthentication();

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonSerializerContext.Default);
});
builder.Services.AddHttpClient<IStudioClient, StudioClient>("prod");
builder.Services.AddSingleton(sp =>
{
    return new Kubernetes(KubernetesClientConfiguration.BuildDefaultConfig());
});
builder.Services.AddTransient<IKubernetesClient, KubernetesClient>();
builder.Services.AddKeyedTransient<IAlertsClient>(
    "grafana",
    (serviceProvider, key) =>
    {
        var factory = serviceProvider.GetRequiredService<IHttpClientFactory>();
        return new GrafanaClient(factory.CreateClient("grafana"));
    }
);
builder.Services.AddHttpClient(
    "grafana",
    (serviceProvider, httpClient) =>
    {
        var grafanaSettings = serviceProvider.GetRequiredService<GrafanaSettings>();

        httpClient.BaseAddress = new Uri(grafanaSettings.Url);
        httpClient.DefaultRequestHeaders.Authorization = new AuthenticationHeaderValue("Bearer", grafanaSettings.Token);
    }
);
builder.Services.AddKeyedTransient<IMetricsClient, AzureMonitorClient>("azuremonitor");
builder.Services.AddControllers();
builder.Services.AddHealthChecks();
builder.Services.AddOpenApi(
    "public-v1",
    options =>
    {
        options.ShouldInclude = (description) =>
        {
            var scope = description.ActionDescriptor.EndpointMetadata.OfType<PortScopeMetadata>().FirstOrDefault();
            return scope?.Scope != PortScope.Internal;
        };
    }
);
builder.Services.AddOpenApi(
    "internal-v1",
    options =>
    {
        options.ShouldInclude = (description) =>
        {
            var scope = description.ActionDescriptor.EndpointMetadata.OfType<PortScopeMetadata>().FirstOrDefault();
            return scope?.Scope != PortScope.Public;
        };
    }
);
builder.Services.AddDesignerClients(builder.Configuration);
builder.Services.AddKubernetesServices();

var app = builder.Build();

app.UseHsts();
app.UseForwardedHeaders();

// Only run auth middleware on public port - internal port is secured by NetworkPolicy
app.UseWhen(
    ctx => ctx.Connection.LocalPort == PortConfiguration.PublicPort,
    branch =>
    {
        branch.UseAuthentication();
        branch.UseAuthorization();
    }
);

app.MapOpenApi();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/openapi/public-v1.json", "Public API v1");
    options.SwaggerEndpoint("/openapi/internal-v1.json", "Internal API v1");
});

app.MapHealthChecks("/health/live");
app.MapHealthChecks("/health/ready");

app.AddPublicApis();
app.AddInternalApis();
app.AddLocalApis();

await app.RunAsync();
