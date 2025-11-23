using StudioGateway.Api;
using StudioGateway.Api.Flux;
using StudioGateway.Api.Configuration;
using StudioGateway.Api.Services.Alerts;
using StudioGateway.Api.TypedHttpClients.AlertsClient;
using StudioGateway.Api.TypedHttpClients.StudioClient;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<AlertsClientSettings>(builder.Configuration.GetSection("AlertsClientSettings"));
builder.Services.Configure<StudioClientSettings>(builder.Configuration.GetSection("StudioClientSettings"));

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonSerializerContext.Default);
});

builder.Services.AddHttpClient<IStudioClient, StudioClient>();
builder.Services.AddKeyedTransient<IAlertsClient, GrafanaClient>("grafana");
builder.Services.AddTransient<IAlertsService, AlertsService>();
builder.Services.AddControllers();

builder.Services.AddHealthChecks();
builder.Services.AddOpenApi("v1");

var app = builder.Build();

// OpenApi UI is served as a static file under /openapi.html
app.UseStaticFiles();

app.MapOpenApi();

// Health check endpoints
app.MapHealthChecks("/health/live");
app.MapHealthChecks("/health/ready");

app.MapControllers();

app.MapFluxWebhookEndpoint();

app.Run();

public partial class Program { }
