using Altinn.Studio.Runtime.Common;
using WorkflowEngine.Api.Authentication.ApiKey;
using WorkflowEngine.Api.Endpoints;
using WorkflowEngine.Api.Extensions;
using WorkflowEngine.Data.Extensions;
using WorkflowEngine.Models.Exceptions;
using WorkflowEngine.Telemetry.Extensions;

var builder = WebApplication.CreateBuilder(args);
var dbConnectionString =
    builder.Configuration.GetConnectionString("WorkflowEngine")
    ?? throw new EngineConfigurationException(
        "Database connection string 'WorkflowEngine' is required, but has not been configured."
    );

// Hosting config
builder.UseCommonHostingConfiguration();
builder.UseProblemDetailsForBadRequests();
builder.UseCaseInsensitiveCamelCaseJson();

// Services
builder.Services.AddCors(options =>
{
    options.AddPolicy(
        "Dashboard",
        policy =>
        {
            var origins =
                builder.Configuration.GetSection("CorsSettings:AllowedOrigins").Get<string[]>() ??
                [
                    "http://localhost:8090",
                ];
            policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod();
        }
    );
});
builder.Services.AddWorkflowEngineHost();
builder.Services.AddTelemetry();
builder.Services.AddOpenApi(options => options.AddDocumentTransformer<ApiKeyOpenApiTransformer>());
builder.Services.AddApiKeyAuthentication();
builder.Services.AddDbRepository(dbConnectionString, enableSensitiveDataLogging: builder.Environment.IsDevelopment());
builder.Services.AddEngineHealthChecks();
builder.Services.AddHttpContextAccessor();

var app = builder.Build();

// Reset stale database connections in development (e.g. from ungraceful shutdowns during load testing)
if (builder.Environment.IsDevelopment())
    await app.ResetDatabaseConnections(dbConnectionString);

// Apply database migrations
await app.ApplyDatabaseMigrations(dbConnectionString);

// OpenAPI
app.MapOpenApi();
app.UseSwaggerUI(options =>
{
    options.SwaggerEndpoint("/openapi/v1.json", "Workflow Engine API v1");
});

// Middleware
app.UseExceptionHandler();
if (!builder.Environment.IsDevelopment())
    app.UseHttpsRedirection();

// Endpoints
app.MapHealthEndpoints();
app.MapEngineEndpoints();
if (!app.Environment.IsProduction())
{
    app.UseCors("Dashboard");
    app.MapDashboardEndpoints();
}

await app.RunAsync();
