using StudioGateway.Api;
using StudioGateway.Api.Flux;

var builder = WebApplication.CreateSlimBuilder(args);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonSerializerContext.Default);
});

builder.Services.AddHealthChecks();
builder.Services.AddOpenApi("v1");

var app = builder.Build();

// OpenApi UI is served as a static file under /openapi.html
app.UseStaticFiles();

app.MapOpenApi();

// Health check endpoints
app.MapHealthChecks("/health/live");
app.MapHealthChecks("/health/ready");

app.MapFluxWebhookEndpoint();

app.Run();

public partial class Program { }
