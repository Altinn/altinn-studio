using StudioGateway.Api;
using StudioGateway.Api.Authentication;
using StudioGateway.Api.Flux;
using StudioGateway.Api.Hosting;

var builder = WebApplication.CreateSlimBuilder(args);

builder.ConfigureKestrelPorts();
builder.AddHostingConfiguration();
builder.AddMaskinportenAuthentication();

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
    options.SwaggerEndpoint("/openapi/v1.json", "v1");
});

app.MapHealthChecks("/health/live");
app.MapHealthChecks("/health/ready");

// Authenticated endpoint for runtime health status
app.MapGet("/runtime/gateway/api/v1/health", () => Results.Ok(new HealthResponse("healthy")))
    .RequirePublicPort()
    .RequireAuthorization("MaskinportenScope")
    .WithName("RuntimeHealth")
    .WithTags("Health");

app.MapFluxWebhookEndpoint();

if (app.Environment.IsEnvironment("local"))
{
    // Diagnostic endpoint to verify X-Forwarded-For header processing
    app.MapGet(
            "/runtime/gateway/api/v1/debug/clientip",
            (HttpContext ctx) =>
            {
                var headers = ctx.Request.Headers;
                return Results.Ok(
                    new ClientIpResponse(
                        ctx.Connection.RemoteIpAddress?.ToString(),
                        headers["X-Forwarded-For"].FirstOrDefault(),
                        headers["X-Forwarded-Proto"].FirstOrDefault(),
                        headers["X-Forwarded-Host"].FirstOrDefault()
                    )
                );
            }
        )
        .RequirePublicPort()
        .WithName("DebugClientIp")
        .WithTags("Debug")
        .ExcludeFromDescription();
}

await app.RunAsync();
