using StudioGateway.Api;
using StudioGateway.Api.Flux;
using StudioGateway.Api.Configuration;
using StudioGateway.Api.Providers.Alerts;
using StudioGateway.Api.Services.Alerts;
using StudioGateway.Api.TypedHttpClients.Grafana;

var builder = WebApplication.CreateBuilder(args);

builder.Services.Configure<GrafanaSettings>(builder.Configuration.GetSection("GrafanaSettings"));

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonSerializerContext.Default);
});

builder.Services.AddHttpClient<IGrafanaClient, GrafanaClient>();
builder.Services.AddKeyedTransient<IAlertsProvider, GrafanaProvider>("Grafana");
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
