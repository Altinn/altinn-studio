using Azure.Identity;
using Azure.Monitor.Query;
using k8s;
using StudioGateway.Api;
using StudioGateway.Api.Configuration;
using StudioGateway.Api.Flux;
using StudioGateway.Api.Hosting;
using StudioGateway.Api.Services.Alerts;
using StudioGateway.Api.Services.Metrics;
using StudioGateway.Api.TypedHttpClients.AlertsClient;
using StudioGateway.Api.TypedHttpClients.KubernetesClient;
using StudioGateway.Api.TypedHttpClients.MetricsClient;
using StudioGateway.Api.TypedHttpClients.StudioClient;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<AlertsClientSettings>(builder.Configuration.GetSection("AlertsClientSettings"));
builder.Services.Configure<StudioClientSettings>(builder.Configuration.GetSection("StudioClientSettings"));
builder.Services.Configure<MetricsClientSettings>(builder.Configuration.GetSection("MetricsClientSettings"));
builder.Services.AddSingleton(new LogsQueryClient(new DefaultAzureCredential()));

builder.AddHostingConfiguration();

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonSerializerContext.Default);
});
builder.Services.AddHttpClient<IStudioClient, StudioClient>();
builder.Services.AddSingleton(sp =>
{
    var config = KubernetesClientConfiguration.BuildDefaultConfig();
    return new Kubernetes(config);
});
builder.Services.AddTransient<IKubernetesClient, KubernetesClient>();
builder.Services.AddKeyedTransient<IAlertsClient, GrafanaClient>("grafana");
builder.Services.AddKeyedTransient<IMetricsClient, AzureMonitorClient>("azuremonitor");
builder.Services.AddTransient<IAlertsService, AlertsService>();
builder.Services.AddTransient<IMetricsService, MetricsService>();
builder.Services.AddControllers();
builder.Services.AddHealthChecks();
builder.Services.AddOpenApi("v1");

var app = builder.Build();

app.UseHsts();
app.UseForwardedHeaders();

app.MapOpenApi();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/openapi/v1.json", "v1");
});

// Health check endpoints
app.MapHealthChecks("/health/live");
app.MapHealthChecks("/health/ready");

app.MapControllers();

app.MapFluxWebhookEndpoint();

await app.RunAsync();
