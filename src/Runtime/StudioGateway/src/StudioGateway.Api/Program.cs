using StudioGateway.Api;
using StudioGateway.Api.Flux;
using StudioGateway.Api.Hosting;

var builder = WebApplication.CreateSlimBuilder(args);

builder.AddHostingConfiguration();

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
    options.SerializerOptions.TypeInfoResolverChain.Insert(0, AppJsonSerializerContext.Default);
});
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

app.MapFluxWebhookEndpoint();

await app.RunAsync();
