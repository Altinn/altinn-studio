using Azure.Core;
using Azure.Identity;
using Azure.Monitor.Query.Logs;
using Azure.ResourceManager;
using Microsoft.Extensions.DependencyInjection.Extensions;
using Microsoft.Extensions.Options;
using StudioGateway.Api;
using StudioGateway.Api.Authentication;
using StudioGateway.Api.Clients.AlertsClient;
using StudioGateway.Api.Clients.Designer;
using StudioGateway.Api.Clients.K8s;
using StudioGateway.Api.Clients.MetricsClient;
using StudioGateway.Api.Clients.SlackClient;
using StudioGateway.Api.Endpoints.Internal;
using StudioGateway.Api.Endpoints.Local;
using StudioGateway.Api.Endpoints.Public;
using StudioGateway.Api.Hosting;
using StudioGateway.Api.Settings;

var builder = WebApplication.CreateSlimBuilder(args);

builder.Services.AddSingleton<TokenCredential, DefaultAzureCredential>();
builder.Services.AddSingleton(sp =>
{
    var credential = sp.GetRequiredService<TokenCredential>();
    return new LogsQueryClient(credential);
});
builder.Services.AddSingleton(sp =>
{
    var credential = sp.GetRequiredService<TokenCredential>();
    return new ArmClient(credential);
});

builder.Services.AddSingleton(TimeProvider.System);
builder.Configuration.AddJsonFile(
    "/app/secrets/maskinporten-client-for-designer.json",
    optional: true,
    reloadOnChange: true
);
builder.Configuration.AddJsonFile("/app/secrets/grafana-token.json", optional: true, reloadOnChange: true);
builder
    .Services.AddOptions<GrafanaSettings>()
    .Bind(builder.Configuration.GetSection("Grafana"))
    .Validate(settings => !string.IsNullOrWhiteSpace(settings.Token), "Grafana.Token is required.")
    .Validate(settings => settings.Url != null, "Grafana.Url is required.")
    .ValidateOnStart();
builder
    .Services.AddOptions<AlertsClientSettings>()
    .Bind(builder.Configuration.GetSection("AlertsClientSettings"))
    .ValidateOnStart();

builder.Configuration.AddJsonFile("/app/secrets/slack-webhook.json", optional: true, reloadOnChange: true);
builder.Services.Configure<SlackSettings>(builder.Configuration.GetSection("Slack"));

builder
    .Services.AddOptions<MetricsClientSettings>()
    .Bind(builder.Configuration.GetSection("MetricsClientSettings"))
    .ValidateOnStart();
builder.Services.Configure<GatewayContext>(builder.Configuration.GetSection("Gateway"));

// Register class itself as scoped to avoid using IOptions interfaces throughout the codebase
// Avoided singleton registration to support dynamic reloading of configuration
builder.Services.TryAddScoped(sp => sp.GetRequiredService<IOptionsSnapshot<SlackSettings>>().Value);
builder.Services.TryAddScoped(sp => sp.GetRequiredService<IOptionsSnapshot<GrafanaSettings>>().Value);
builder.Services.TryAddScoped(sp => sp.GetRequiredService<IOptionsSnapshot<GatewayContext>>().Value);
builder.Services.TryAddScoped(sp => sp.GetRequiredService<IOptionsSnapshot<AlertsClientSettings>>().Value);
builder.Services.TryAddScoped(sp => sp.GetRequiredService<IOptionsSnapshot<MetricsClientSettings>>().Value);

builder.ConfigureKestrelPorts();
builder.AddHostingConfiguration();
builder.AddMaskinportenAuthentication();

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonSerializerContext.Default);
});
builder.Services.AddKeyedTransient<IAlertsClient>(
    AlertsClientSettings.AlertsClientProvider.Grafana.ToString(),
    (serviceProvider, key) =>
    {
        var factory = serviceProvider.GetRequiredService<IHttpClientFactory>();
        return new GrafanaClient(factory.CreateClient(AlertsClientSettings.AlertsClientProvider.Grafana.ToString()));
    }
);
builder.Services.AddHttpContextAccessor();
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
    MetricsClientSettings.MetricsClientProvider.AzureMonitor.ToString()
);
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
builder.Services.AddSlackClient();

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
